const EventEmitter = require('events').EventEmitter
const debug = require('debug')('kubernetes-stream:list-watch')

class ListWatch extends EventEmitter {
  constructor (list, watch) {
    super()
    this.listFn = list
    this.watchFn = watch
    this.watching = false
  }

  list (options = {}) {
    debug('listing with %j', options)
    this.listFn.call(null, options, (err, list) => {
      if (err) {
        debug('list error %s', String(err))
        return this.emit('error', err)
      }

      debug('%s returned %d items', list.kind, list.items.length)
      this.emit('list', list)
    })
  }

  watch (options = {}) {
    if (this.watching) return

    this.stopFn = this.watchFn.call(null, options, (err, event) => {
      if (err) {
        debug('watch error %s', String(err))
        this.emit('error', err)
      } else if (event) {
        debug('watch event %j', event)
        this.emit('event', event)
      } else {
        debug('watch end')
        this.watching = false
        this.emit('end')
      }
    })

    this.watching = true
  }

  close () {
    if (this.watching) {
      debug('stop watching')
      this.stopFn.call(null)
      this.watching = false

      debug('closing')
      this.emit('close')
    }
  }
}

module.exports = ListWatch
