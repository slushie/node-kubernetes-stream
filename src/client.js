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

  request (group, resource, options) {
    const segments = [
      group,
      this.config.namespace ? `namespaces/${this.config.namespace}` : '',
      resource
    ]

    return this.client.request(Object.assign({
      url: path.join.apply(path, segments.filter(Boolean))
    }, options))
  }

  get (group, resource, params) {
    return this.request(group, resource, { method: 'get', params })
  }

  stream (group, resource, params) {
    return this.request(group, resource, {
      responseType: 'stream',
      method: 'get',
      params
    })
  }

  listWatcher (group, resource) {
    return new ListWatch(
      /* list  */ (params, callback) => Client.getCallback(
        this.get(group, resource, params),
        callback
      ),
      /* watch */ (params, callback) => Client.streamCallback(
        this.stream(group, resource, Object.assign({ watch: true }, params)),
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
   * @param promise
   * @param {function} callback
   * @returns {Function}
   */
  static streamCallback (promise, callback) {
    let stream
    promise.then((res) => {
      // streaming already stopped
      if (stream === false) {
        res.data.destroy()
        return
      }

      stream = res.data
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
