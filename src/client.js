'use strict'

const https = require('https')
const axios = require('axios')
const path = require('path')
const url = require('url')
const _ = require('lodash')

const KubernetesConfig = require('./config')

class Kubernetes {
  constructor (options = {}) {
    this.config = options.config || KubernetesConfig.find()
    this.client = this.createClient()
  }

  createClient () {
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
}

module.exports = Kubernetes
