const NatsStreaming = require('node-nats-streaming')
const shortid = require('shortid')

function build({ stanClusterName = 'test-cluster', serviceName, natsUrl }) {
  const stan = NatsStreaming.connect(
    stanClusterName,
    `${serviceName}-${shortid.generate()}`,
    natsUrl
  )
  return stan
}

module.exports = build
