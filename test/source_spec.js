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
            expect(listFnArgs[0]).to.eql(localOpts)
          })
        })

        context('callback', () => {
          it('is a function(err, apiList)', () => {
            subject.list()
            const callback = listFnArgs[1]
            expect(callback).to.be.a('function')
              .with.lengthOf(2)
          })

          context('called with (null, apiList)', () => {
            it('emits a "list" event', (done) => {
              subject.list()
              const callback = listFnArgs[1]
              const apiList = {kind: 'Pod', items: []}

              subject.on('list', (list) => {
                expect(list).to.eql(apiList)
                done()
              })

              callback(null, apiList)
            })
          })

          context('called with (err, null)', () => {
            it('emits an "error" event', (done) => {
              subject.list()
              const callback = listFnArgs[1]
              const cbErr = new Error('test')

              subject.on('error', (err) => {
                expect(err).to.eql(cbErr)
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
