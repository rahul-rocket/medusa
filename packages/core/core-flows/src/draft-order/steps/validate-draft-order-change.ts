import { createStep } from "@medusajs/framework/workflows-sdk"
import { OrderChangeDTO, OrderDTO } from "@medusajs/types"
import { throwIfOrderChangeIsNotActive } from "../../order/utils/order-validation"
import { throwIfNotDraftOrder } from "../utils/validation"

interface ValidateDraftOrderChangeStepInput {
  order: OrderDTO
  orderChange: OrderChangeDTO
}

export const validateDraftOrderChangeStepId = "validate-draft-order-change"

export const validateDraftOrderChangeStep = createStep(
  validateDraftOrderChangeStepId,
  async function ({ order, orderChange }: ValidateDraftOrderChangeStepInput) {
    throwIfNotDraftOrder({ order })
    throwIfOrderChangeIsNotActive({ orderChange })
  }
)
