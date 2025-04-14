import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { OrderDTO, OrderWorkflow } from "@medusajs/types"
import { useRemoteQueryStep } from "../../common"
import { createOrderChangeStep } from "../../order"
import { validateDraftOrderStep } from "../steps"

export const beginDraftOrderEditWorkflowId = "begin-draft-order-edit"

export const beginDraftOrderEditWorkflow = createWorkflow(
  beginDraftOrderEditWorkflowId,
  function (input: WorkflowData<OrderWorkflow.BeginorderEditWorkflowInput>) {
    const order: OrderDTO = useRemoteQueryStep({
      entry_point: "orders",
      fields: ["id", "status", "is_draft_order"],
      variables: { id: input.order_id },
      list: false,
      throw_if_key_not_found: true,
    }).config({ name: "order-query" })

    validateDraftOrderStep({ order })

    const orderChangeInput = transform({ input }, ({ input }) => {
      return {
        change_type: "edit" as const,
        order_id: input.order_id,
        created_by: input.created_by,
        description: input.description,
        internal_note: input.internal_note,
      }
    })

    return new WorkflowResponse(createOrderChangeStep(orderChangeInput))
  }
)
