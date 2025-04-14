import { OrderChangeActionDTO } from "@medusajs/types"

import { ChangeActionType, MedusaError } from "@medusajs/framework/utils"
import { createStep } from "@medusajs/framework/workflows-sdk"
import { OrderChangeDTO, OrderWorkflow } from "@medusajs/types"

export interface ValidateDraftOrderUpdateActionItemStepInput {
  input: OrderWorkflow.UpdateOrderEditAddNewItemWorkflowInput
  orderChange: OrderChangeDTO
}

export const validateDraftOrderUpdateActionItemStep = createStep(
  "validate-draft-order-update-action-item",
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
        `No request to add item for order ${input.order_id} in order change ${orderChange.id}`
      )
    }

    if (associatedAction.action !== ChangeActionType.ITEM_ADD) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Action ${associatedAction.id} is not adding an item`
      )
    }
  }
)
