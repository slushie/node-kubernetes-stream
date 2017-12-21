/* eslint-env mocha */
'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const resolve = require('path').resolve

describe('KubernetesConfig', () => {
  describe('.find()', () => {
    let KubernetesConfig, find
    const module = '../src/config'

    beforeEach('require module under test', () => {
      KubernetesConfig = require(module)
      find = KubernetesConfig.find.bind(KubernetesConfig)
    })

    afterEach('clear module cache', () => {
      const resolved = require.resolve(module)
      delete require.cache[resolved]
    })

    context('when process.env.KUBECONFIG is defined', () => {
      const CLUSTER_URL = 'https://api.kubernetes.local'

      beforeEach('set KUBECONFIG', () => {
        process.env.KUBECONFIG = resolve(__dirname, 'fixtures/kubeconfig')
      })

      beforeEach('clear kubernetes environment', () => {
        delete process.env.KUBERNETES_SERVICE_HOST
        delete process.env.KUBERNETES_SERVICE_PORT
      })

      it('should load the file', () => {
        const config = find()
        expect(config.url).to.equal(CLUSTER_URL)
      })

      it('caches the config object', () => {
        const config = find()
        delete process.env.KUBECONFIG

        expect(find()).to.equal(config)
      })
    })

    context('when KUBERNETES_SERVICE_HOST is defined', () => {
      beforeEach('set fixture paths', () => { // fixtures are reset when request.cache is cleared
        KubernetesConfig.caPath = resolve(__dirname, 'fixtures/ca.crt')
        KubernetesConfig.tokenPath = resolve(__dirname, 'fixtures/token.txt')
        KubernetesConfig.namespacePath = resolve(__dirname, 'fixtures/namespace.txt')
      })

      beforeEach('clear KUBECONFIG', () => {
        delete process.env.KUBECONFIG
      })

      beforeEach('set KUBERNETES_SERVICE_HOST', () => {
        process.env.KUBERNETES_SERVICE_HOST = 'kubernetes.io'
        process.env.KUBERNETES_SERVICE_PORT = 80
      })

      it('should load in-cluster config', () => {
        expect(find()).to.have.property('url').equal('https://kubernetes.io:80')
        expect(find()).to.have.property('ca').equal('test ca cert\n')
        expect(find()).to.have.property('namespace').equal('test-namespace\n')
        expect(find()).to.have.property('token').equal('test token\n')
      })
    })

    context('when no environment is configured', () => {
      beforeEach('set fixture path', () => {
        KubernetesConfig.defaultConfigFile = resolve(__dirname, 'fixtures/kubeconfig')
      })

      beforeEach('clear environment', () => {
        delete process.env.KUBECONFIG
        delete process.env.KUBERNETES_SERVICE_HOST
        delete process.env.KUBERNETES_SERVICE_PORT
      })

      it('falls back to user local config', () => {
        expect(find()).to.have.property('url').equal('https://api.kubernetes.local')
      })
    })
  })
})
