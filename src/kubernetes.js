'use strict'

const _ = require('lodash')
const Kube = require('kubernetes-client')
const EventSource = require('./source')
const debug = require('debug')('kubernetes-stream:api')

function getResourceVersion (object) {
  return _.get(object, 'metadata.resourceVersion')
}

function createClient ({
  kind = 'pods',
  apiVersion = 'v1',
  namespace = undefined
} = {}) {
  let client = new Kube.Api(findKubernetesConfig()).group(apiVersion)
  client = client[kind.toLowerCase()]

  if (namespace !== undefined) {
    client = client.namespace(namespace)
  }

  return client
}

function createEventSource (client = createClient()) {
  return new EventSource(
    (options) => client.get({qs: options}), // list
    (options, callback) => streamCallback( // watch
      client.get({
        qs: Object.assign({
          watch: true
        }, options)
      }),

      callback
    )
  )
}

let config
function findKubernetesConfig () {
  if (config) {
    return config
  }

  if (process.env.KUBECONFIG) {
    debug('using KUBECONFIG %j', process.env.KUBECONFIG)
    const kubeconfig = Kube.config.loadKubeconfig(process.env.KUBECONFIG)
    config = Kube.config.fromKubeconfig(kubeconfig)
    return config
  }

  if (process.env.KUBERNETES_SERVICE_HOST) {
    debug('using in-cluster api at %s:%d',
      process.env.KUBERNETES_SERVICE_HOST,
      process.env.KUBERNETES_SERVICE_PORT)
    config = Kube.config.getInCluster()
    return config
  }

  debug('falling back to user config')
  config = Kube.config.fromKubeconfig()
  return config
}

function streamCallback (stream, cb) {
  stream.on('data', (chunk) => {
    cb(null, chunk)
  }).on('error', (err) => {
    cb(err)
  }).on('end', () => {
    cb()
  })

  return function () {
    stream.removeAllListeners()
    stream.abort()
  }
}

module.exports = {
  getResourceVersion,
  createClient,
  createEventSource,
  findKubernetesConfig,
  streamCallback
}
