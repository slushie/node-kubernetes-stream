'use strict'

const Readable = require('stream').Readable
const debug = require('debug')('kubernetes-stream:stream')
const {createEventSource, getResourceVersion} = require('./kubernetes')

const DEFAULT_TIMEOUT = 5000

class KubernetesStream extends Readable {
  constructor (options = {}) {
    const streamOptions = Object.assign({
      objectMode: true
    }, options.streamOptions || {})

    super(streamOptions)

    this.resourceVersion = '0'
    this.labelSelector = (options.labelSelector || undefined)
    this.timeout = (options.timeout || DEFAULT_TIMEOUT)
    this.source = (options.source || createEventSource())
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

    const timeoutSeconds = parseInt(
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
