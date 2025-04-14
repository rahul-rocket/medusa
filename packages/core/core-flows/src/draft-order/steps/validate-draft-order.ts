import { MedusaError, OrderStatus } from "@medusajs/framework/utils"
import { createStep } from "@medusajs/framework/workflows-sdk"
import { OrderDTO } from "@medusajs/types"

interface ValidateDraftOrderStepInput {
  order: OrderDTO
}

export const validateDraftOrderStep = createStep(
  "validate-draft-order",
  async function ({ order }: ValidateDraftOrderStepInput) {
    if (order.status !== OrderStatus.DRAFT && !order.is_draft_order) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order ${order.id} is not a draft order`
      )
    }
  }
)
