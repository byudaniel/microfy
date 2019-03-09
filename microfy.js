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
  throw err
}

const proxyHandler = {
  get: (obj, prop) => {
    return prop in obj
      ? obj[prop]
      : {
          act: async (actionName, payload, config) => {
            // TODO: ABSTRACT
            const response = await axios({
              method: 'post',
              url: buildActionUrl(prop, actionName),
              data: payload
            }).catch(handleResponseError)

            return parseResponse(response)
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
  { actions = {}, queries = {}, subscriptions = [] },
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

    subscriptions.forEach(({ topic, id, handler }) => {
      natsOn({ topic, id, handler })
    })
  }

  const service = new Proxy(
    {
      start: async () => {
        await new Promise((resolve) => {
          stan = NatsStreaming({ serviceName })
          stan.on('connect', () => {
            resolve()
          })
          // TODO: HANDLE CONNECT ERROR
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

    const wrappedHandler = (req) => {
      return handler(req.body || req.query)
    }

    fastify.route({
      method,
      url: `/${actionName}`,
      handler: wrappedHandler
    })
  }

  function natsOn({ topic, id, handler }) {
    const subscriptionName = `${topic}${id}`
    let topicSubscription = topicSubscriptions[subscriptionName]
    if (!topicSubscription) {
      const opts = stan.subscriptionOptions()
      opts.setStartWithLastReceived()
      opts.setDurableName(subscriptionName)
      topicSubscription = stan.subscribe(topic, subscriptionName, opts)
      topicSubscriptions[topic] = topicSubscription
    }

    topicSubscription.on('message', (msg) => handler(JSON.parse(msg.getData())))
  }

  function natsPublish(topic, message) {
    return stan.publish(topic, JSON.stringify(message))
  }
}

module.exports = build
