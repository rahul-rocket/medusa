import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { BigNumberInput, IOrderModuleService } from "@medusajs/types"

export const restoreDraftOrderShippingMethodsStepId =
  "restore-draft-order-shipping-methods"

interface RestoreDraftOrderShippingMethodsStepInput {
  shippingMethods: {
    id: string
    before: {
      shipping_option_id: string
      amount: BigNumberInput
    }
    after: {
      shipping_option_id: string
      amount: BigNumberInput
    }
  }[]
}

export const restoreDraftOrderShippingMethodsStep = createStep(
  restoreDraftOrderShippingMethodsStepId,
  async function (
    input: RestoreDraftOrderShippingMethodsStepInput,
    { container }
  ) {
    const service = container.resolve<IOrderModuleService>(Modules.ORDER)

    await service.updateOrderShippingMethods(
      input.shippingMethods.map(({ id, before }) => ({
        id,
        shipping_option_id: before.shipping_option_id,
        amount: before.amount,
      }))
    )

    return new StepResponse(void 0, input.shippingMethods)
  },
  async (input, { container }) => {
    const service = container.resolve<IOrderModuleService>(Modules.ORDER)

    if (!input) {
      return
    }

    await service.updateOrderShippingMethods(
      input.map(({ id, after }) => ({
        id,
        shipping_option_id: after.shipping_option_id,
        amount: after.amount,
      }))
    )
  }
)
