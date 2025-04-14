import {
  ChangeActionType,
  OrderChangeStatus,
  PromotionActions,
} from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { BigNumberInput, OrderChangeDTO, OrderDTO } from "@medusajs/types"
import { useRemoteQueryStep } from "../../common"
import {
  createOrderChangeActionsWorkflow,
  previewOrderChangeStep,
  updateOrderTaxLinesWorkflow,
} from "../../order"
import { updateDraftOrderShippingMethodStep } from "../steps/update-draft-order-shipping-metod"
import { validateDraftOrderChangeStep } from "../steps/validate-draft-order-change"
import { draftOrderFieldsForRefreshSteps } from "../utils/fields"
import { refreshDraftOrderAdjustmentsWorkflow } from "./refresh-draft-order-adjustments"

export const updateDraftOrderShippingMethodWorkflowId =
  "update-draft-order-shipping-method"

export interface UpdateDraftOrderShippingMethodWorkflowInput {
  /**
   * The ID of the order to update the shipping method in its edit.
   */
  order_id: string
  data: {
    /**
     * The ID of the shipping method to update.
     */
    shipping_method_id: string
    /**
     * The ID of the shipping option to associate with the shipping method.
     */
    shipping_option_id?: string
    /**
     * Set a custom amount for the shipping method.
     */
    custom_amount?: BigNumberInput
    /**
     * A note viewed by admins only related to the shipping method.
     */
    internal_note?: string | null
  }
}

export const updateDraftOrderShippingMethodWorkflow = createWorkflow(
  updateDraftOrderShippingMethodWorkflowId,
  function (input: WorkflowData<UpdateDraftOrderShippingMethodWorkflowInput>) {
    const order: OrderDTO = useRemoteQueryStep({
      entry_point: "orders",
      fields: ["id", "status", "is_draft_order"],
      variables: { id: input.order_id },
      list: false,
      throw_if_key_not_found: true,
    }).config({ name: "order-query" })

    const orderChange: OrderChangeDTO = useRemoteQueryStep({
      entry_point: "order_change",
      fields: ["id", "status", "version", "actions.*"],
      variables: {
        filters: {
          order_id: input.order_id,
          status: [OrderChangeStatus.PENDING, OrderChangeStatus.REQUESTED],
        },
      },
      list: false,
    }).config({ name: "order-change-query" })

    validateDraftOrderChangeStep({ order, orderChange })

    const { before, after } = updateDraftOrderShippingMethodStep({
      order_id: input.order_id,
      shipping_method_id: input.data.shipping_method_id,
      shipping_option_id: input.data.shipping_option_id,
      amount: input.data.custom_amount,
    })

    updateOrderTaxLinesWorkflow.runAsStep({
      input: {
        order_id: order.id,
        shipping_method_ids: [input.data.shipping_method_id],
      },
    })

    const refetchedOrder = useRemoteQueryStep({
      entry_point: "orders",
      fields: draftOrderFieldsForRefreshSteps,
      variables: { id: input.order_id },
      list: false,
      throw_if_key_not_found: true,
    }).config({ name: "refetched-order-query" })

    const appliedPromoCodes = transform(refetchedOrder, (refetchedOrder) => {
      const promotionLink = (refetchedOrder as any).promotion_link

      if (!promotionLink) {
        return []
      }

      if (Array.isArray(promotionLink)) {
        return promotionLink.map((promo) => promo.promotion.code)
      }

      return [promotionLink.promotion.code]
    })

    when(
      appliedPromoCodes,
      (appliedPromoCodes) => appliedPromoCodes.length > 0
    ).then(() => {
      refreshDraftOrderAdjustmentsWorkflow.runAsStep({
        input: {
          order: refetchedOrder,
          promo_codes: appliedPromoCodes,
          action: PromotionActions.REPLACE,
        },
      })
    })

    const orderChangeActionInput = transform(
      { order, orderChange, data: input.data, before, after },
      ({ order, orderChange, data, before, after }) => {
        return {
          order_change_id: orderChange.id,
          reference: "order_shipping_method",
          reference_id: data.shipping_method_id,
          order_id: order.id,
          version: orderChange.version,
          action: ChangeActionType.SHIPPING_UPDATE,
          internal_note: data.internal_note,
          details: {
            old_shipping_option_id: before.shipping_option_id,
            new_shipping_option_id: after.shipping_option_id,
            old_amount: before.amount,
            new_amount: after.amount,
          },
        }
      }
    )

    createOrderChangeActionsWorkflow.runAsStep({
      input: [orderChangeActionInput as any],
    })

    return new WorkflowResponse(previewOrderChangeStep(input.order_id))
  }
)
