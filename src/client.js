'use strict'

const https = require('https')
const axios = require('axios')
const path = require('path')
const _ = require('lodash')
const debug = require('debug')('kubernetes-stream:client')

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
      debug('using bearer token')
    } else if (config.basic) {
      auth = _.pick(config.basic, ['username', 'password'])
      debug('using basic auth')
    } else {
      debug('using anonymous API access')
    }

    let httpsAgent
    const certConfig = _.pick(config, ['ca', 'cert', 'key', 'insecureSkipTlsVerify'])
    if (!_.isEmpty(certConfig)) {
      certConfig.rejectUnauthorized = !certConfig.insecureSkipTlsVerify
      delete certConfig.insecureSkipTlsVerify

      debug('using https agent with', certConfig)
      httpsAgent = new https.Agent(certConfig)
    }

    return axios.create({
      baseURL: config.url,
      httpsAgent,
      headers,
      auth
    })
  }

  request (apiVersion, kind, options) {
    const basePath = apiVersion === 'v1' ? 'api' : 'apis'
    const nsPath = this.namespace ? `namespaces/${this.namespace}` : ''
    const segments = [basePath, apiVersion, nsPath, kind]

    const url = path.join.apply(path, segments.filter(Boolean))
    debug('requesting %j with options %j', url, options)

    return this.client.request(Object.assign({ url }, options))
  }

  get (apiVersion, kind, params) {
    return this.request(apiVersion, kind, { method: 'get', params })
  }

  stream (apiVersion, kind, params) {
    return this.request(apiVersion, kind, {
      responseType: 'stream',
      method: 'get',
      params
    })
  }

  listWatcher (apiVersion, kind) {
    const watch = (p) => Object.assign({ watch: true }, p)
    return new ListWatch(
      /* list  */ (params, callback) => Client.getCallback(
        this.get(apiVersion, kind, params).then(r => r.data),
        callback
      ),
      /* watch */ (params, callback) => Client.streamCallback(
        this.stream(apiVersion, kind, watch(params)).then(r => r.data),
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
        debug('stopFn called before streaming began')
        if (readable.destroy) readable.destroy()
        return
      }

      stream = readable
        .on('data', (chunk) => {
          const data = chunk.toString()
          let message
          try {
            message = JSON.parse(data)
          } catch (err) {
            debug('failed to parse data %j', data)
            err.data = data
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
