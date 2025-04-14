import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  CreateShippingMethodAdjustmentDTO,
  IOrderModuleService,
} from "@medusajs/types"

export const createDraftOrderShippingMethodAdjustmentsStepId =
  "create-draft-order-shipping-method-adjustments"

interface CreateDraftOrderShippingMethodAdjustmentsStepInput {
  shippingMethodAdjustmentsToCreate: CreateShippingMethodAdjustmentDTO[]
}

export const createDraftOrderShippingMethodAdjustmentsStep = createStep(
  createDraftOrderShippingMethodAdjustmentsStepId,
  async function (
    data: CreateDraftOrderShippingMethodAdjustmentsStepInput,
    { container }
  ) {
    const { shippingMethodAdjustmentsToCreate = [] } = data

    if (!shippingMethodAdjustmentsToCreate?.length) {
      return new StepResponse(void 0, [])
    }

    const service = container.resolve<IOrderModuleService>(Modules.ORDER)

    const shippingMethodAdjustments =
      await service.createOrderShippingMethodAdjustments(
        shippingMethodAdjustmentsToCreate
      )

    const createdShippingMethodAdjustments = shippingMethodAdjustments.map(
      (adjustment) => adjustment.id
    )

    return new StepResponse(
      createdShippingMethodAdjustments,
      createdShippingMethodAdjustments
    )
  },
  async function (createdShippingMethodAdjustments, { container }) {
    const service = container.resolve<IOrderModuleService>(Modules.ORDER)

    if (!createdShippingMethodAdjustments?.length) {
      return
    }

    await service.deleteOrderShippingMethodAdjustments(
      createdShippingMethodAdjustments
    )
  }
)
