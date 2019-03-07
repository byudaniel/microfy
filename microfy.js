const Fastify = require('fastify')
const axios = require('axios')
const NatsStreaming = require('./src/nats-streaming')

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
              params
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
  const topicSubscriptions = {}
  let stan = null

  function registerRoutes() {
    Object.entries(actions).forEach(([actionName, config]) => {
      createRoute({ actionName, config, method: 'POST' })
    })

    Object.entries(queries).forEach(([actionName, config]) => {
      createRoute({ actionName, config, method: 'GET' })
    })

    Object.entries(subscriptions).forEach(([topic, config]) => {
      const handler = config.handler || config
      natsOn(topic, handler)
    })
  }

  const service = new Proxy(
    {
      start: async () => {
        await new Promise(resolve => {
          stan = NatsStreaming({ serviceName })
          stan.on('connect', err => {
            console.log(err)
            resolve()
          })
        })
        registerRoutes()
        await fastify.listen(port)
        return service
      },
      on: natsOn,
      publish: natsPublish
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

  function natsOn(topic, handler) {
    let topicSubscription = topicSubscriptions[topic]
    if (!topicSubscription) {
      const opts = stan.subscriptionOptions()
      opts.setStartWithLastReceived()
      opts.setDurableName(serviceName)
      topicSubscription = stan.subscribe(topic, serviceName, opts)
      topicSubscriptions[topic] = topicSubscription
    }

    topicSubscription.on('message', msg => handler(msg.getData()))
  }

  function natsPublish(topic, message) {
    return stan.publish(topic, message)
  }
}

module.exports = build
