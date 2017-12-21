/* eslint-env mocha */
'use strict'

const sinon = require('sinon')
const chai = require('chai')
const expect = chai.expect

describe('ListWatch', () => {
  const ListWatch = require('../src/list-watch.js')
  it('exports the ListWatch class', () => {
    expect(ListWatch).to.be.a('function')
      .with.property('name').equal('ListWatch')
  })

  describe('ListWatch', () => {
    describe('listFn', () => {
      let subject, listFn, listFnArgs
      beforeEach('default listFn', () => {
        listFnArgs = undefined
        listFn = (...args) => {
          listFnArgs = args
        }
      })

      beforeEach('create subject', () => {
        subject = new ListWatch(listFn, null)
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
      let subject, watchFn, watchFnArgs, stopFn
      beforeEach('create watchFn', () => {
        stopFn = sinon.stub()
        watchFnArgs = undefined
        watchFn = sinon.stub().callsFake((...args) => {
          watchFnArgs = args
          return stopFn
        })
      })

      const RESOURCE_VERSION = 'test-rv'
      const apiList = {
        kind: 'PodList',
        metadata: { resourceVersion: RESOURCE_VERSION },
        items: []
      }
      const apiEvent = {
        type: 'Update',
        object: {
          kind: 'Pod',
          metadata: {
            resourceVersion: RESOURCE_VERSION,
            name: 'test-pod-123'
          }
        }
      }

      beforeEach('create subject', () => {
        subject = new ListWatch(() => apiList, watchFn)
      })

      context('is called', () => {
        it('by .watch()', () => {
          expect(watchFn.callCount).to.equal(0)
          subject.watch()
          expect(watchFn.callCount).to.equal(1)
        })

        it('only once', () => {
          subject.watch()
          subject.watch()
          expect(watchFn.callCount).to.equal(1)
        })

        context('with arguments', () => {
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

      context('returns', () => {
        context('stopFn', () => {
          it('is called by .close()', () => {
            subject.watch()
            expect(stopFn.notCalled).to.equal(true)
            subject.close()
            expect(stopFn.calledOnce).to.equal(true)
          })

          it('is only called once', () => {
            subject.watch()
            subject.close()
            subject.close()
            expect(stopFn.callCount).to.equal(1)
          })

          it('receives no arguments', () => {
            subject.watch()
            subject.close()
            expect(stopFn.firstCall.calledWithExactly()).to.equal(true)
          })
        })
      })
    })
  })
})
