const NatsStreaming = require('node-nats-streaming')

function build({ serviceName }) {
  const stan = NatsStreaming.connect('test-cluster', serviceName)
  return stan
}

module.exports = build
