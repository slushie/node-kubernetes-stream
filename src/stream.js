'use strict'

const Readable = require('stream').Readable
const debug = require('debug')('kubernetes-stream:stream')
const { getResourceVersion } = require('./kubernetes')

const DEFAULT_TIMEOUT = 5000

class KubernetesStream extends Readable {
  constructor ({ source, timeout = DEFAULT_TIMEOUT, ...rest }) {
    super({ objectMode: true, ...rest })

    this.timeout = timeout
    this.resourceVersion = '0'

    this.source = source
      .on('list', this._onSourceList)
      .on('event', this._onSourceEvent)
      .on('end', this._onSourceEnd)
  }

  _read () {
    debug('consumer wants to read')
    if (!this.source.watching) {
      this._listSource()
    }
  }

  _listSource () {
    const options = {
      resourceVersion: this.resourceVersion || '0'
    }

    debug('listing objects from rv %s', options.resourceVersion)
    this.source.list(options)
  }

  _watchSource () {
    const timeoutSeconds = this.timeout * (Math.random() + 1) / 1000

    debug('watching objects from rv %s with %ds timeout',
      this.resourceVersion, timeoutSeconds)

    this.source.watch({
      resourceVersion: this.resourceVersion,
      timeoutSeconds
    })
  }

  _onSourceList (list) {
    this.resourceVersion = getResourceVersion(list)
    debug('latest rv %s', this.resourceVersion)

    if (!this.source.watching) {
      this._watchSource()
    }
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
    this._watchSource()
  }
}

module.exports = KubernetesStream
