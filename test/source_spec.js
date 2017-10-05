/* eslint-env mocha */
'use strict'

const chai = require('chai')
const expect = chai.expect

describe('source.js', () => {
  const EventSource = require('../src/source.js')
  it('should export the EventSource class', () => {
    expect(EventSource).to.be.a('function')
      .with.property('name').equal('EventSource')
  })

  describe('EventSource', () => {
    describe('listFn', () => {
      let subject, listFn, listFnArgs
      beforeEach('default listFn', () => {
        listFnArgs = undefined
        listFn = (...args) => {
          listFnArgs = args
        }
      })

      beforeEach('create subject', () => {
        subject = new EventSource(listFn, null)
      })

      context('is called with', () => {
        context('options', () => {
          it('comes from .list()', () => {
            const localOpts = {option: 'value'}
            subject.list(localOpts)
            expect(listFnArgs[0]).to.equal(localOpts)
          })
        })

        context('callback', () => {
          it('is a function(err, apiList)', () => {
            subject.list()
            const callback = listFnArgs[1]
            expect(callback).to.be.a('function')
              .with.lengthOf(2)
          })

          context('(null, apiList)', () => {
            it('emits a "list" event', (done) => {
              subject.list()
              const callback = listFnArgs[1]
              const apiList = {kind: 'Pod', items: []}

              subject.on('list', (list) => {
                expect(list).to.equal(apiList)
                done()
              })

              callback(null, apiList)
            })
          })

          context('(err, null)', () => {
            it('emits an "error" event', (done) => {
              subject.list()
              const callback = listFnArgs[1]
              const cbErr = new Error('test')

              subject.on('error', (err) => {
                expect(err).to.equal(cbErr)
                done()
              })

              callback(cbErr)
            })
          })
        })
      })
    })

    describe('watchFn', () => {
      let subject, watchFn, watchFnArgs
      beforeEach('default watchFn', () => {
        watchFnArgs = undefined
        watchFn = (...args) => {
          watchFnArgs = args
        }
      })

      const RESOURCE_VERSION = 'test-rv'
      const apiList = {
        kind: 'PodList',
        metadata: { resourceVersion: RESOURCE_VERSION },
        items: []
      }

      beforeEach('create subject', () => {
        subject = new EventSource(() => apiList, watchFn)
      })

      context('is called with', () => {
        context('options', () => {
          it('comes from .watch()', () => {
            const localOpts = {option: 'value'}
            subject.watch(localOpts)
            expect(watchFnArgs[0]).to.equal(localOpts)
          })
        })

        context('callback', () => {
          it('is a function(err, apiEvent)', () => {
            subject.watch()
            const callback = watchFnArgs[1]
            expect(callback).to.be.a('function')
              .with.lengthOf(2)
          })

          context('(null, apiEvent)', () => {
            it('emits a "event" event', (done) => {
              subject.watch()
              const callback = watchFnArgs[1]
              const apiEvent = {type: 'Update', object: {kind: 'Pod'}}

              subject.on('event', (event) => {
                expect(event).to.equal(apiEvent)
                done()
              })

              callback(null, apiEvent)
            })
          })

          context('(err, null)', () => {
            it('emits an "error" event', (done) => {
              subject.watch()
              const callback = watchFnArgs[1]
              const cbErr = new Error('test')

              subject.on('error', (err) => {
                expect(err).to.equal(cbErr)
                done()
              })

              callback(cbErr)
            })
          })
        })
      })
    })
  })
})
