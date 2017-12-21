/* eslint-env mocha */
'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const resolve = require('path').resolve

describe('Client', () => {
  // describe('.find()', () => {
  //   let find
  //   const module = '../src/client'
  //
  //   beforeEach('require module under test', () => {
  //     find = require(module).find
  //   })
  //
  //   afterEach('clear module cache', () => {
  //     const resolved = require.resolve(module)
  //     delete require.cache[resolved]
  //   })
  //
  //   context('when process.env.KUBECONFIG is defined', () => {
  //     const CLUSTER_URL = 'https://api.kubernetes.local'
  //
  //     beforeEach('set KUBECONFIG', () => {
  //       process.env.KUBECONFIG = resolve(__dirname, 'fixtures/kubeconfig')
  //     })
  //
  //     beforeEach('clear kubernetes environment', () => {
  //       delete process.env.KUBERNETES_SERVICE_HOST
  //       delete process.env.KUBERNETES_SERVICE_PORT
  //     })
  //
  //     it('should load the file', () => {
  //       const config = find()
  //       expect(config.url).to.equal(CLUSTER_URL)
  //     })
  //
  //     it('caches the config object', () => {
  //       const config = find()
  //       delete process.env.KUBECONFIG
  //
  //       expect(find()).to.equal(config)
  //     })
  //   })
  //
  //   context('when KUBERNETES_SERVICE_HOST is defined', () => {
  //     let mockGetInCluster
  //     const mockedConfig = {url: 'mock-url'}
  //
  //     beforeEach('mock getInCluster()', () => {
  //       const KubeConfig = require('kubernetes-client').config
  //       mockGetInCluster = sinon.stub(KubeConfig, 'getInCluster')
  //         .returns(mockedConfig)
  //     })
  //
  //     afterEach('restore getInCluster()', () => {
  //       mockGetInCluster.restore()
  //     })
  //
  //     beforeEach('clear KUBECONFIG', () => {
  //       delete process.env.KUBECONFIG
  //     })
  //
  //     beforeEach('set KUBERNETES_SERVICE_HOST', () => {
  //       process.env.KUBERNETES_SERVICE_HOST = 'kubernetes.io'
  //       process.env.KUBERNETES_SERVICE_PORT = 80
  //     })
  //
  //     it('should load in-cluster config', () => {
  //       expect(find()).to.equal(mockedConfig)
  //       expect(mockGetInCluster.callCount).to.equal(1)
  //     })
  //   })
  //
  //   context('when no environment is configured', () => {
  //     let mockFromKubeconfig
  //     const mockedConfig = {url: 'mock-url'}
  //
  //     beforeEach('mock getInCluster()', () => {
  //       const KubeConfig = require('kubernetes-client').config
  //       mockFromKubeconfig = sinon.stub(KubeConfig, 'fromKubeconfig')
  //         .returns(mockedConfig)
  //     })
  //
  //     afterEach('restore getInCluster()', () => {
  //       mockFromKubeconfig.restore()
  //     })
  //
  //     beforeEach('clear environment', () => {
  //       delete process.env.KUBECONFIG
  //       delete process.env.KUBERNETES_SERVICE_HOST
  //       delete process.env.KUBERNETES_SERVICE_PORT
  //     })
  //
  //     it('falls back to user local config', () => {
  //       expect(find()).to.equal(mockedConfig)
  //       expect(mockFromKubeconfig.calledOnce).to.equal(true)
  //       expect(mockFromKubeconfig.calledWithExactly()).to.equal(true)
  //     })
  //   })
  // })

  // describe('.createEventSource(client)', () => {
  //   const Kube = require('kubernetes-client')
  //   const { createEventSource } = require('../src/kubernetes')
  //   const EventSource = require('../src/list-watch')
  //   const Readable = require('stream').Readable
  //
  //   let mockClient
  //   beforeEach('mock Kube client', () => {
  //     mockClient = sinon.createStubInstance(Kube.Core)
  //     sinon.stub(mockClient, 'namespace').returns(mockClient)
  //     sinon.stub(mockClient, 'pods').returns(mockClient)
  //
  //     mockClient.get.returns(new Readable())
  //   })
  //
  //   it('returns an EventSource', () => {
  //     expect(createEventSource(mockClient))
  //       .to.be.an.instanceOf(EventSource)
  //   })
  //
  //   context('listFn', () => {
  //     let subject
  //     beforeEach('create EventSource', () => {
  //       subject = createEventSource(mockClient)
  //     })
  //
  //     it('calls client.get({ qs: options })', () => {
  //       const listOptions = { test: 'options' }
  //       subject.listFn.call(null, listOptions)
  //
  //       expect(mockClient.get.calledOnce).to.equal(true)
  //
  //       expect(mockClient.get.firstCall.args[0])
  //         .to.be.an('object').with.all.keys('qs')
  //
  //       expect(mockClient.get.firstCall.args[0])
  //         .to.have.property('qs').equal(listOptions)
  //     })
  //   })
  //
  //   context('watchFn', () => {
  //     let subject
  //     beforeEach('create EventSource', () => {
  //       subject = createEventSource(mockClient)
  //     })
  //
  //     it('calls client.get({ qs: { watch: true, ...options } })', () => {
  //       const watchOptions = { test: 'options' }
  //       subject.watchFn.call(null, watchOptions)
  //
  //       expect(mockClient.get.calledOnce).to.equal(true)
  //
  //       expect(mockClient.get.firstCall.args[0])
  //         .to.be.an('object').with.all.keys('qs')
  //
  //       expect(mockClient.get.firstCall.args[0])
  //         .to.have.property('qs')
  //         .with.any.keys(watchOptions)
  //         .and.property('watch').equal(true)
  //     })
  //   })
  // })
})
