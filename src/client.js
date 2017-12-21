'use strict'

const https = require('https')
const axios = require('axios')
const path = require('path')
const url = require('url')
const _ = require('lodash')

const KubernetesConfig = require('./config')
const ListWatch = require('./list-watch')

class Client {
  constructor (options = {}) {
    this.config = options.config || KubernetesConfig.find()
    this.namespace = this.config.namespace
    this.client = this.createHttpClient()
  }

  createHttpClient () {
    const { config } = this

    let headers, auth
    if (config.token) {
      headers = {authorization: `Bearer ${config.token}`}
    } else if (config.basic) {
      auth = _.pick(config.basic, ['username', 'password'])
    }

    let httpsAgent
    const certConfig = _.pick(config, ['ca', 'cert', 'key', 'insecureSkipTlsVerify'])
    if (!_.isEmpty(certConfig)) {
      certConfig.rejectUnauthorized = !certConfig.insecureSkipTlsVerify
      httpsAgent = new https.Agent(certConfig)
    }

    return axios.create({
      baseURL: url.resolve(config.url, 'api'),
      httpsAgent,
      headers,
      auth
    })
  }

  request (group, kind, options) {
    const segments = [
      group,
      this.namespace ? `namespaces/${this.namespace}` : '',
      kind
    ]

    return this.client.request(Object.assign({
      url: path.join.apply(path, segments.filter(Boolean))
    }, options))
  }

  get (group, kind, params) {
    return this.request(group, kind, { method: 'get', params })
  }

  stream (group, kind, params) {
    return this.request(group, kind, {
      responseType: 'stream',
      method: 'get',
      params
    })
  }

  listWatcher (group, kind) {
    return new ListWatch(
      /* list  */ (params, callback) => Client.getCallback(
        this.get(group, kind, params),
        callback
      ),
      /* watch */ (params, callback) => Client.streamCallback(
        this.stream(group, kind, Object.assign({ watch: true }, params)).then(r => r.data),
        callback
      )
    )
  }

  static getCallback (promise, callback) {
    promise.then(
      res => callback(null, res),
      err => callback(err, null)
    )
  }

  /**
   * Take a Readable stream and pipe the chunks into a callback, or
   * null at the end of the stream.
   *
   * Returns a "stop" function that will abort the stream.
   *
   * @param {Promise.<Readable|EventEmitter>} promise
   * @param {function} callback
   * @returns {Function}
   */
  static streamCallback (promise, callback) {
    let stream
    promise.then((readable) => {
      // streaming already stopped
      if (stream === false) {
        if (readable.destroy) readable.destroy()
        return
      }

      stream = readable
        .on('data', (chunk) => {
          let message
          try {
            message = JSON.parse(chunk)
          } catch (err) {
            return callback(err)
          }

          callback(null, message)
        }).on('error', (err) => {
          callback(err, null)
        }).on('end', () => {
          callback(null, null)
        })
    })

    return function () {
      if (stream) {
        stream.removeAllListeners()
        stream.destroy()
      } else {
        stream = false
      }
    }
  }
}

module.exports = Client
