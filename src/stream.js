'use strict'

const _ = require('lodash')
const Readable = require('stream').Readable
const debug = require('debug')('kubernetes-stream:stream')

const Client = require('./client')

const DEFAULT_TIMEOUT = 5000

function getResourceVersion (object) {
  return _.get(object, 'metadata.resourceVersion')
}

function parseResource (resource) {
  const separator = resource.lastIndexOf('/')
  if (separator < 1) throw new Error(`Invalid Api Resource "${resource}"`)
  return [
    /* group */ resource.slice(0, separator - 1),
    /* kind */ resource.slice(separator + 1)
  ]
}

class KubernetesStream extends Readable {
  /**
   *
   * @param {object} options
   * @param {string} [options.resource] path to the resource, default is v1/pods
   * @param {string} [options.namespace]
   * @param {object} [options.streamOptions]
   * @param {string} [options.labelSelector]
   * @param {number} [options.timeout]
   * @param {Client} [options.client]
   */
  constructor (options = {}) {
    const streamOptions = Object.assign({
      objectMode: true
    }, options.streamOptions || {})

    super(streamOptions)

    this.resourceVersion = '0'
    this.labelSelector = (options.labelSelector || undefined)
    this.timeout = (options.timeout || DEFAULT_TIMEOUT)
    this.client = (options.client || new Client())

    if (options.namespace) {
      this.client.namespace = options.namespace
    }

    const groupKind = parseResource(
      options.resource || 'v1/pods'
    )

    this.source = this.client.listWatcher(
      groupKind.shift(),
      groupKind.shift()
    )
      .on('list', this._onSourceList.bind(this))
      .on('event', this._onSourceEvent.bind(this))
      .on('end', this._onSourceEnd.bind(this))
  }

  /**
   * @protected
   * @override
   */
  _read () {
    debug('consumer wants to read')
    if (!this.source.watching) this.watch()
  }

  list () {
    const options = {
      resourceVersion: this.resourceVersion || '0',
      labelSelector: this.labelSelector
    }

    debug('listing objects from rv %s', options.resourceVersion)

    return new Promise((resolve, reject) => {
      this.source.once('error', reject).once('list', () => {
        this.source.removeListener('error', reject)
        resolve(this.resourceVersion)
      })

      this.source.list(options)
    })
  }

  watch () {
    if (!this.resourceVersion) {
      return this.list().then(() => this.watch())
    }

    const timeoutSeconds = Math.round(
      this.timeout * (Math.random() + 1) / 1000
    )

    const options = {
      resourceVersion: this.resourceVersion,
      labelSelector: this.labelSelector,
      timeoutSeconds
    }

    debug('watching objects from rv %s with %ds timeout',
      options.resourceVersion, options.timeoutSeconds)

    return new Promise((resolve, reject) => {
      const source = this.source

      function removeStreamListeners () {
        source.removeListener('event', onEvent)
        source.removeListener('error', onError)
        source.removeListener('end', onEnd)
      }

      function onError (err) {
        removeStreamListeners()
        reject(err)
      }

      function onEvent (ev) {
        removeStreamListeners()
        resolve(this.resourceVersion)
      }

      function onEnd () {
        removeStreamListeners()
        resolve(this.resourceVersion)
      }

      source.once('error', onError)
        .once('event', onEvent)
        .once('end', onEnd)

      this.source.watch(options)
    })
  }

  close () {
    this.source.close()
  }

  _onSourceList (list) {
    this.resourceVersion = getResourceVersion(list)

    this.emit('list', list)
  }

  _onSourceEvent (event) {
    this.resourceVersion = getResourceVersion(event.object)

    if (!this.push(event)) {
      debug('consumer buffer is full')
      this.source.close()
    }
  }

  _onSourceEnd () {
    this.source.close()
    this.watch()
  }
}

module.exports = KubernetesStream
