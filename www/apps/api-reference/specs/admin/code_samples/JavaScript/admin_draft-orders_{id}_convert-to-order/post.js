import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})

To convert a draft order to an order:

```ts
sdk.admin.draftOrder.convertToOrder("order_123")
.then(({ order }) => {
  console.log(order)
})