import { PromotionActions } from "@medusajs/framework/utils"
import {
  createWorkflow,
  parallelize,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { OrderDTO } from "@medusajs/types"
import {
  getActionsToComputeFromPromotionsStep,
  getPromotionCodesToApply,
  prepareAdjustmentsFromPromotionActionsStep,
} from "../../cart"
import { createDraftOrderLineItemAdjustmentsStep } from "../steps/create-draft-order-line-item-adjustments"
import { createDraftOrderShippingMethodAdjustmentsStep } from "../steps/create-draft-order-shipping-method-adjustments"
import { removeDraftOrderLineItemAdjustmentsStep } from "../steps/remove-draft-order-line-item-adjustments"
import { removeDraftOrderShippingMethodAdjustmentsStep } from "../steps/remove-draft-order-shipping-method-adjustments"
import { updateDraftOrderPromotionsStep } from "../steps/update-draft-order-promotions"

export const refreshDraftOrderAdjustmentsWorkflowId =
  "refresh-draft-order-adjustments"

interface RefreshDraftOrderAdjustmentsWorkflowInput {
  order: OrderDTO
  promo_codes: string[]
  action: PromotionActions
}

export const refreshDraftOrderAdjustmentsWorkflow = createWorkflow(
  refreshDraftOrderAdjustmentsWorkflowId,
  function (input: WorkflowData<RefreshDraftOrderAdjustmentsWorkflowInput>) {
    const promotionCodesToApply = getPromotionCodesToApply({
      cart: input.order,
      promo_codes: input.promo_codes,
      action: input.action,
    })

    const actions = getActionsToComputeFromPromotionsStep({
      cart: input.order as any,
      promotionCodesToApply,
    })

    const {
      lineItemAdjustmentsToCreate,
      lineItemAdjustmentIdsToRemove,
      shippingMethodAdjustmentsToCreate,
      shippingMethodAdjustmentIdsToRemove,
    } = prepareAdjustmentsFromPromotionActionsStep({ actions })

    parallelize(
      removeDraftOrderLineItemAdjustmentsStep({
        lineItemAdjustmentIdsToRemove: lineItemAdjustmentIdsToRemove,
      }),
      removeDraftOrderShippingMethodAdjustmentsStep({
        shippingMethodAdjustmentIdsToRemove:
          shippingMethodAdjustmentIdsToRemove,
      }),
      createDraftOrderLineItemAdjustmentsStep({
        lineItemAdjustmentsToCreate: lineItemAdjustmentsToCreate,
        order_id: input.order.id,
      }),
      createDraftOrderShippingMethodAdjustmentsStep({
        shippingMethodAdjustmentsToCreate: shippingMethodAdjustmentsToCreate,
      }),
      updateDraftOrderPromotionsStep({
        id: input.order.id,
        promo_codes: input.promo_codes,
        action: input.action,
      })
    )

    return new WorkflowResponse(void 0)
  }
)
