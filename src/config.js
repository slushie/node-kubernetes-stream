'use strict'

const debug = require('debug')('kubernetes-stream:config')
const Url = require('url')
const fs = require('fs')
const Yaml = require('js-yaml')
const _ = require('lodash')

/**
 *
 * @property {string} [url]
 * @property {string} [token]
 * @property {string} [basic]
 * @property {string|Buffer} [ca]
 * @property {string|Buffer} [cert]
 * @property {string|Buffer} [key]
 * @property {string} [namespace]
 * @property {boolean} [insecureSkipTlsVerify]
 */
class KubernetesConfig {
  static find () {
    if (this.config) return this.config

    if (process.env.KUBECONFIG) {
      debug('using $KUBECONFIG %j', process.env.KUBECONFIG)
      this.config = new KubernetesConfig({ file: process.env.KUBECONFIG })
    } else if (process.env.KUBERNETES_SERVICE_HOST) {
      debug('using in-cluster config')
      this.config = new KubernetesConfig({ cluster: true })
    } else {
      debug('reading default kubeconfig %j', this.defaultConfigFile)
      this.config = new KubernetesConfig({ file: this.defaultConfigFile })
    }

    return this.config
  }

  /**
   *
   * @param {object} options
   * @param {string} [options.url]
   * @param {string} [options.file]
   * @param {string} [options.context]
   * @param {string} [options.token]
   * @param {string} [options.basic]
   * @param {string} [options.ca]
   * @param {string} [options.cert]
   * @param {string} [options.key]
   * @param {string} [options.namespace]
   * @param {boolean} [options.cluster] look for in-cluster config
   * @param {boolean} [options.insecureSkipTlsVerify]
   */
  constructor (options) {
    if (options.cluster) this.parseCluster()
    if (options.file) this.parseFile(options.file, options.context)
    if (options.insecureSkipTlsVerify) this.insecureSkipTlsVerify = true
    if (options.namespace) this.namespace = options.namespace
    if (options.token) this.token = options.token
    if (options.basic) this.basic = options.basic
    if (options.url) this.url = options.url
    if (options.cert) this.cert = options.cert
    if (options.key) this.key = options.key
    if (options.ca) this.ca = options.ca
  }

  parseFile (file, context) {
    const config = Yaml.safeLoad(fs.readFileSync(file)) || {}
    if (!context) context = config['current-context']
    if (!context) throw new Error('No Kubernetes context available in: ' + file)

    const contextObj = _.find(config.contexts, { name: context })
    if (!contextObj) throw new Error('No Kubernetes context named: ' + context)

    const clusterObj = _.find(config.clusters, { name: contextObj.context.cluster })
    if (!clusterObj) throw new Error('No configured cluster named: ' + contextObj.context.cluster)

    this.url = _.get(clusterObj, 'cluster.server')
    this.insecureSkipTlsVerify = !!_.get(clusterObj, 'cluster.insecure-skip-tls-verify')
    debug('using api server %j', this.url)

    const caFile = _.get(clusterObj, 'cluster.certificate-authority')
    const caData = _.get(clusterObj, 'cluster.certificate-authority-data')
    if (caFile) {
      debug('reading CA from %j', caFile)
      this.ca = fs.readFileSync(caFile)
    } else if (caData) {
      debug('using inline CA')
      this.ca = Buffer.from(caData, 'base64')
    }

    const userObj = _.find(config.users, { name: contextObj.context.user })

    if (userObj) {
      const certFile = _.get(userObj, 'user.client-certificate')
      const certData = _.get(userObj, 'user.client-certificate-data')
      if (certFile) {
        debug('reading cert from %j', certFile)
        this.cert = fs.readFileSync(certFile)
      } else if (certData) {
        debug('using inline cert')
        this.cert = Buffer.from(certData, 'base64')
      }

      const keyFile = _.get(userObj, 'user.client-key')
      const keyData = _.get(userObj, 'user.client-key-data')
      if (keyFile) {
        debug('using key from %j', keyFile)
        this.key = fs.readFileSync(keyFile)
      } else if (keyData) {
        debug('using inline key')
        this.key = Buffer.from(keyData, 'base64')
      }

      const basic = _.pick(userObj, ['username', 'password'])
      const token = _.at(userObj, [
        'user.token',
        'user.auth-provider.config.access-token',
        'user.auth-provider.config.id-token'
      ]).find(Boolean)

      if (token) {
        debug('using bearer token %j', token)
        this.token = token
      } else if (!_.isEmpty(basic)) {
        debug('using basic auth %j', basic)
        this.basic = basic
      }
    }
  }

  parseCluster () {
    const host = [
      process.env.KUBERNETES_SERVICE_HOST,
      process.env.KUBERNETES_SERVICE_PORT
    ].filter(Boolean).join(':')
    if (!host) throw new Error('Missing in-cluster environment')

    debug('using in-cluster api at %s', host)
    this.url = Url.format({ protocol: 'https', host })

    debug('reading in-cluster config from standard paths')
    this.ca = fs.readFileSync(KubernetesConfig.caPath, 'utf8')
    this.token = fs.readFileSync(KubernetesConfig.tokenPath, 'utf8')
    this.namespace = fs.readFileSync(KubernetesConfig.namespacePath, 'utf8')
  }
}

KubernetesConfig.caPath = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'
KubernetesConfig.tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token'
KubernetesConfig.namespacePath = '/var/run/secrets/kubernetes.io/serviceaccount/namespace'

KubernetesConfig.defaultConfigFile =
  require('path').join(
    process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'],
    '.kube',
    'config'
  )

module.exports = KubernetesConfig
