const Fastify = require('fastify')
const axios = require('axios')

function buildActionUrl(serviceName, actionName) {
  return `http://{serviceName}/{actionName}`
}

const proxyHandler = {
  get: (obj, prop) => {
    return prop in obj
      ? obj[prop]
      : {
        act: (actionName, payload, config) => {
          // TODO: ABSTRACT
          return axios({
            method: 'post',
            url: buildActionUrl(prop, actionName),
            data: payload
          })
        },
        get: (actionName, params, config) => {
          // TODO: ABSTRACT
          return axios({
            method: 'get',
            url: buildActionUrl(prop, actionName),
            data: payload
          })
        }
      }
  }
}

function build(serviceName, { actions: {}, queries: {}, subscriptions: {} }) {
  const fastify = Fastify({ logger: true })

  Object.entries(actions).forEach([actionName, config] => {
    createRoute({ actionName, config, method: 'POST' })
  })

  Object.entries(queries).forEach([actionName, config] => {
    createRoute({ actionName, config, method: 'GET' })
  })

  Object.entries(subscriptions).forEach([eventName, config] => {
    throw new Error('Not implemented: TODO: NATS Streaming integration')
  })

  return new Proxy({
    start: fastify.listen
  }, proxyHandler)

  function createRoute({ actionName, config, method }) {
    const handler = config.handler || handler

    fastify.route({
      method,
      url: `/${actionName}`,
      handler // TODO: Abstract
    })
  }
}

module.exports = build
