import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { IOrderModuleService } from "@medusajs/types"
export const removeDraftOrderLineItemAdjustmentsStepId =
  "remove-draft-order-line-item-adjustments"

interface RemoveDraftOrderLineItemAdjustmentsStepInput {
  lineItemAdjustmentIdsToRemove: string[]
}

export const removeDraftOrderLineItemAdjustmentsStep = createStep(
  removeDraftOrderLineItemAdjustmentsStepId,
  async function (
    data: RemoveDraftOrderLineItemAdjustmentsStepInput,
    { container }
  ) {
    const { lineItemAdjustmentIdsToRemove = [] } = data

    if (!lineItemAdjustmentIdsToRemove?.length) {
      return new StepResponse(void 0, [])
    }

    const draftOrderModuleService = container.resolve<IOrderModuleService>(
      Modules.ORDER
    )

    await draftOrderModuleService.deleteOrderLineItemAdjustments(
      lineItemAdjustmentIdsToRemove
    )

    return new StepResponse(void 0, lineItemAdjustmentIdsToRemove)
  },
  async function (lineItemAdjustmentIdsToRemove, { container }) {
    const draftOrderModuleService = container.resolve<IOrderModuleService>(
      Modules.ORDER
    )

    if (!lineItemAdjustmentIdsToRemove?.length) {
      return
    }

    await draftOrderModuleService.restoreOrderLineItemAdjustments(
      lineItemAdjustmentIdsToRemove
    )
  }
)
