'use strict'

const Readable = require('stream').Readable
const debug = require('debug')('kubernetes-stream:stream')
const {createEventSource, getResourceVersion} = require('./kubernetes')

const DEFAULT_TIMEOUT = 5000

class KubernetesStream extends Readable {
  constructor (options = {}) {
    if (options.source === undefined) options.source = createEventSource()
    if (options.timeout === undefined) options.timeout = DEFAULT_TIMEOUT

    const streamOptions = Object.assign({objectMode: true}, options)
    delete streamOptions.source
    delete streamOptions.timeout
    super(streamOptions)

    this.resourceVersion = '0'
    this.timeout = options.timeout
    this.source = options.source
      .on('list', this._onSourceList)
      .on('event', this._onSourceEvent)
      .on('end', this._onSourceEnd)
  }

  /**
   * @protected
   * @override
   */
  _read () {
    debug('consumer wants to read')
    this.watch()
  }

  list (labelSelector) {
    const options = {
      resourceVersion: this.resourceVersion || '0',
      labelSelector
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

  watch (labelSelector) {
    if (!this.resourceVersion) {
      return this.list(labelSelector).then(this.watch)
    }

    const timeoutSeconds = this.timeout * (Math.random() + 1) / 1000
    const options = {
      resourceVersion: this.resourceVersion,
      timeoutSeconds,
      labelSelector
    }

    debug('watching objects from rv %s with %ds timeout',
      this.resourceVersion, timeoutSeconds)

    return new Promise((resolve, reject) => {
      this.source.once('error', reject).once('event', () => {
        this.source.removeListener('error', reject)
        resolve(this.resourceVersion)
      })

      this.source.watch(options)
    })
  }

  _onSourceList (list) {
    this.resourceVersion = getResourceVersion(list)
    debug('latest rv %s', this.resourceVersion)
    this.emit('list', list)
  }

  _onSourceEvent (event) {
    this.resourceVersion = getResourceVersion(event.object)
    debug('latest rv %s', this.resourceVersion)

    if (!this.push(event)) {
      debug('consumer buffer is full')
      this.source.close()
    }
  }

  _onSourceEnd () {
    debug('source watch ended')
    this.watch()
  }
}

module.exports = KubernetesStream
