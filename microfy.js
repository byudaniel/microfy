const Fastify = require('fastify')
const axios = require('axios')

const localServices = {}

function buildActionUrl(serviceName, actionName) {
  const localPort = localServices[serviceName]
  const host = localPort ? `localhost:${localPort}` : serviceName
  return `http://${host}/${actionName}`
}

function parseResponse(response) {
  return response.data
}

function handleResponseError(err) {
  console.log('***error', err)
  throw err
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
              .then(parseResponse)
              .catch(handleResponseError)
          },
          get: (actionName, params, config) => {
            // TODO: ABSTRACT
            return axios({
              method: 'get',
              url: buildActionUrl(prop, actionName),
              params: payload
            })
              .then(parseResponse)
              .catch(handleResponseError)
          }
        }
  }
}

function build(
  serviceName,
  { actions = {}, queries = {}, subscriptions = {} },
  { port = 3000 } = {}
) {
  localServices[serviceName] = port

  const fastify = Fastify({ logger: true })

  function registerRoutes() {
    Object.entries(actions).forEach(([actionName, config]) => {
      createRoute({ actionName, config, method: 'POST' })
    })

    Object.entries(queries).forEach(([actionName, config]) => {
      createRoute({ actionName, config, method: 'GET' })
    })

    Object.entries(subscriptions).forEach(([eventName, config]) => {
      throw new Error('Not implemented: TODO: NATS Streaming integration')
    })
  }

  const service = new Proxy(
    {
      start: async () => {
        registerRoutes()
        await fastify.listen(port)
        return service
      }
    },
    proxyHandler
  )

  return service

  function createRoute({ actionName, config, method }) {
    const handler = config.handler || config

    fastify.route({
      method,
      url: `/${actionName}`,
      handler // TODO: Abstract
    })
  }
}

module.exports = build
