import { OrderChangeActionDTO } from "@medusajs/types"

import { ChangeActionType, MedusaError } from "@medusajs/framework/utils"
import { createStep } from "@medusajs/framework/workflows-sdk"
import { OrderChangeDTO, OrderWorkflow } from "@medusajs/types"

export interface ValidateDraftOrderUpdateActionItemStepInput {
  input: OrderWorkflow.DeleteOrderEditItemActionWorkflowInput
  orderChange: OrderChangeDTO
}

export const validateDraftOrderRemoveActionItemStep = createStep(
  "validate-draft-order-remove-action-item",
  async function ({
    input,
    orderChange,
  }: ValidateDraftOrderUpdateActionItemStepInput) {
    const associatedAction = (orderChange.actions ?? []).find(
      (a) => a.id === input.action_id
    ) as OrderChangeActionDTO

    if (!associatedAction) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No item found for order ${input.order_id} in order change ${orderChange.id}`
      )
    }

    if (
      ![ChangeActionType.ITEM_ADD, ChangeActionType.ITEM_UPDATE].includes(
        associatedAction.action as ChangeActionType
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Action ${associatedAction.id} is not adding or updating an item`
      )
    }
  }
)
