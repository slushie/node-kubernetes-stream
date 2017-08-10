'use strict'

const _ = require('lodash')
const Kube = require('kubernetes-client')
const EventSource = require('./source')
const debug = require('debug')('kubernetes-stream:api')

export function getResourceVersion (object) {
  return _.get(object, 'metadata.resourceVersion')
}

export function createEventSource ({
  kind = 'Pod',
  apiVersion = 'v1',
  namespace = undefined
} = {}) {
  let client = new Kube.Api(
    findKubernetesConfig()
  ).group(apiVersion)

  if (namespace !== undefined) {
    client = client.namespace(namespace)
  }

  return new EventSource(
    (options) => client[kind].get({ qs: options }), // list
    (options, cb) => streamCallback( // watch
      client[kind].get({ qs: { watch: true, ...options } }),
      cb
    )
  )
}

let config
export function findKubernetesConfig () {
  if (config) {
    return config
  }

  if (process.env.KUBECONFIG) {
    debug('using KUBECONFIG %j', process.env.KUBECONFIG)
    const kubeconfig = Kube.config.loadKubeconfig(
      process.env.KUBERNETES_SERVICE_HOST)
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

export function streamCallback (stream, cb) {
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
