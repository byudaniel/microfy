const Microfy = require("./microfy")

async function createServices() {
  const services = await Microfy(
    "subscription",
    {
      actions: {
        "create.subscription": async ({ vehicleId }) => {
          const id = "sample"
          console.log("Pending subscription created")
          await services.vehicle.act("reserve.vehicle", { vehicleId })
          await services.billing.act("create.bill", {})
          console.log("Subscription activated")
          return {}
        }
      }
    },
    {
      port: 3000
    }
  ).start()

  await Microfy(
    "vehicle",
    {
      actions: {
        "reserve.vehicle": async ({ vehicleId }) => {
          console.log("Vehicle reserved")
          return {}
        }
      }
    },
    {
      port: 3001
    }
  ).start()

  await Microfy(
    "billing",
    {
      actions: {
        "create.bill": async ({ lineItems }) => {
          // Create bill
          console.log("Bill created")
          return {}
        }
      }
    },
    {
      port: 3002
    }
  ).start()

  return services
}

async function startCreateSubscriptionSaga() {
  const services = await createServices()
  await services.subscription.act("create.subscription", {
    vehicleId: "TEST-VEHICLE"
  })
}

startCreateSubscriptionSaga()
