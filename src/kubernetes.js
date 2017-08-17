'use strict'

const _ = require('lodash')
const Kube = require('kubernetes-client')
const EventSource = require('./source')
const debug = require('debug')('kubernetes-stream:api')

/** @var config - cached kubeconfig */
let config

function getResourceVersion (object) {
  return _.get(object, 'metadata.resourceVersion')
}

/**
 * A simple helper function to get a request object on
 * the Kube client.
 *
 * @param kind
 * @param apiVersion
 * @param namespace
 * @returns {ApiGroup}
 */
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

/**
 * Creates an EventSource for the Kubernetes client.
 *
 * @param client
 * @returns {EventSource}
 */
function createEventSource (client = createClient()) {
  return new EventSource(
    /* list  */ (options) => client.get({qs: options}),
    /* watch */ (options, callback) => streamCallback(
      client.get({
        qs: Object.assign({
          watch: true
        }, options)
      }),

      callback
    )
  )
}

/**
 * Find a Kubeconfig from the environment. Looks for
 * KUBECONFIG or KUBERNETES_SERVICE_HOST, or else
 * falls back to reading from ~/.kube/config.
 *
 * @returns {config} suitable for passing to kubernetes-client
 */
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

/**
 * Take a Readable stream and pipe the chunks into a callback, or
 * null at the end of the stream.
 *
 * Returns a "stop" function that will abort the stream.
 *
 * @param stream
 * @param {callback} cb
 * @returns {Function}
 */
function streamCallback (stream, cb) {
  stream.on('data', (chunk) => {
    cb(null, chunk)
  }).on('error', (err) => {
    cb(err, null)
  }).on('end', () => {
    cb(null, null)
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
