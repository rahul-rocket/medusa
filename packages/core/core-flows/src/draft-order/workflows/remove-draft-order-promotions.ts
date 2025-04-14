import {
  ChangeActionType,
  OrderChangeStatus,
  PromotionActions,
} from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { OrderChangeDTO, OrderDTO, PromotionDTO } from "@medusajs/types"
import { useRemoteQueryStep } from "../../common"
import {
  createOrderChangeActionsWorkflow,
  previewOrderChangeStep,
} from "../../order"
import { validateDraftOrderChangeStep } from "../steps/validate-draft-order-change"
import { validatePromoCodesToRemoveStep } from "../steps/validate-promo-codes-to-remove"
import { draftOrderFieldsForRefreshSteps } from "../utils/fields"
import { refreshDraftOrderAdjustmentsWorkflow } from "./refresh-draft-order-adjustments"

export const removeDraftOrderPromotionsWorkflowId =
  "remove-draft-order-promotions"

interface RemoveDraftOrderPromotionsWorkflowInput {
  order_id: string
  promo_codes: string[]
}

export const removeDraftOrderPromotionsWorkflow = createWorkflow(
  removeDraftOrderPromotionsWorkflowId,
  function (input: WorkflowData<RemoveDraftOrderPromotionsWorkflowInput>) {
    const order: OrderDTO = useRemoteQueryStep({
      entry_point: "orders",
      fields: draftOrderFieldsForRefreshSteps,
      variables: {
        id: input.order_id,
      },
      list: false,
      throw_if_key_not_found: true,
    }).config({ name: "order-query" })

    const orderChange: OrderChangeDTO = useRemoteQueryStep({
      entry_point: "order_change",
      fields: ["id", "status"],
      variables: {
        filters: {
          order_id: input.order_id,
          status: [OrderChangeStatus.PENDING, OrderChangeStatus.REQUESTED],
        },
      },
      list: false,
    }).config({ name: "order-change-query" })

    validateDraftOrderChangeStep({ order, orderChange })

    const promotions: PromotionDTO[] = useRemoteQueryStep({
      entry_point: "promotion",
      fields: ["id", "code", "status"],
      variables: {
        filters: {
          code: input.promo_codes,
        },
      },
      list: true,
    }).config({ name: "promotions-query" })

    validatePromoCodesToRemoveStep({
      promo_codes: input.promo_codes,
      promotions,
    })

    refreshDraftOrderAdjustmentsWorkflow.runAsStep({
      input: {
        order,
        promo_codes: input.promo_codes,
        action: PromotionActions.REMOVE,
      },
    })

    const orderChangeActionInput = transform(
      { order, orderChange, promotions },
      ({ order, orderChange, promotions }) => {
        return promotions.map((promotion) => ({
          action: ChangeActionType.PROMOTION_REMOVE,
          reference: "order_promotion",
          order_change_id: orderChange.id,
          reference_id: promotion.id,
          order_id: order.id,
          details: {
            removed_code: promotion.code,
          },
        }))
      }
    )

    createOrderChangeActionsWorkflow.runAsStep({
      input: orderChangeActionInput,
    })

    return new WorkflowResponse(previewOrderChangeStep(input.order_id))
  }
)
