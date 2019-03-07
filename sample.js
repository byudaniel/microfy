const Microfy = require('./microfy')

const services = Microfy(
  'subscription',
  {
    actions: {
      'create.subscription': async ({ vehicleId }) => {
        const subscription = { vehicleId }
        console.log('Pending subscription created')
        await services.vehicle.act('reserve.vehicle', { vehicleId })
        await services.billing.act('create.bill', {})
        await services.publish('subscription.created', 'yay')
        console.log('Subscription activated')
        return {}
      }
    },
    queries: {
      'get.subscription': async ({ id }) => {
        return {
          id
        }
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
    subscriptions: {
      'subscription.created': data => {
        console.log('***subscription created', data)
      }
    }
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
  await services.subscription.act('create.subscription', {
    vehicleId: 'TEST-VEHICLE'
  })
  console.log(
    await services.subscription.get('get.subscription', {
      id: 'testSubscription'
    })
  )
}

startCreateSubscriptionSaga()
