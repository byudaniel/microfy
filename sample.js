const Microfy = require("./microfy")

const services = Microfy(
  "subscription",
  {
    actions: {
      "create.subscription": async ({ vehicleId }) => {
        const id = "sample"
        console.log("Pending subscription created")
        await services.vehicle.act("reserve.vehicle", { vehicleId })
        await services.billing.act("bill.subscription", {})
        console.log("Subscription activated")
      }
    }
  },
  {
    port: 3000
  }
).start()

Microfy(
  "vehicle",
  {
    actions: {
      "reserve.vehicle": async ({ vehicleId }) => {
        console.log("Vehicle updated")
      }
    }
  },
  {
    port: 3001
  }
).start()

Microfy(
  "billing",
  {
    actions: {
      "create.bill": async ({ lineItems }) => {
        // Create bill
        console.log("Bill created")
      }
    }
  },
  {
    port: 3002
  }
).start()

async function startCreateSubscriptionSaga() {
  await services.subscription.act("create.subscription", {
    vehicleId: "TEST-VEHICLE"
  })
}

startCreateSubscriptionSaga()
