const Microfy = require('./microfy')
const uuid = require('uuid/v4')

const subscriptions = {}
const vehicles = { vid1: 'test1' }

const services = Microfy(
  'subscription',
  {
    actions: {
      'create.subscription': async ({ firstName, lastName, vehicleId }) => {
        const subscription = { id: uuid(), firstName, lastName, vehicleId, status: 'pending' }
        subscriptions[subscription.id] = subscription
        console.log('Pending subscription created')
        await services.vehicle.act('reserve.vehicle', { vehicleId })
        await services.billing.act('create.bill', {})
        subscription.status = 'active'
        await services.publish('subscription.created', 'yay')
        console.log('Subscription activated')
        return subscription
      }
    },
    queries: {
      'get.subscription': async ({ id }) => {
        return subscriptions[id]
      }
    }
  },
  {
    port: 3000
  }
)

const vehicleService = Microfy(
  'vehicle',
  {
    actions: {
      'reserve.vehicle': async ({ vehicleId }) => {
        vehicles[vehicleId].status = 'active'
        console.log('Vehicle reserved')
        return {}
      }
    }
  },
  {
    port: 3001
  }
)

const billingService = Microfy(
  'billing',
  {
    actions: {
      'create.bill': async ({ lineItems }) => {
        // Create bill
        console.log('Bill created')
        return {}
      }
    }
  },
  {
    port: 3002
  }
)

const notificationService = Microfy(
  'notification',
  {
    subscriptions: [
      {
        topic: 'subscription.created',
        id: 'send-email',
        handler: (data) => {
          console.log('***send email', data)
        }
      },
      {
        topic: 'subscription.created',
        id: 'send-sms',
        handler: (data) => {
          console.log('***send sms', data)
        }
      }
    ]
  },
  {
    port: 3003
  }
)

async function createServices() {
  await services.start()
  await vehicleService.start()
  await billingService.start()
  await notificationService.start()
}

async function startCreateSubscriptionSaga() {
  await createServices()
  const subscription = await services.subscription.act('create.subscription', {
    firstName: 'Test',
    lastName: 'Last',
    vehicleId: 'vid1'
  })
  console.log(
    await services.subscription.get('get.subscription', {
      id: subscription.id
    })
  )
}

startCreateSubscriptionSaga()
