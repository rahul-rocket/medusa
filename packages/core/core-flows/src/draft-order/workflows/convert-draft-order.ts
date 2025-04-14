import {
  Modules,
  OrderStatus,
  OrderWorkflowEvents,
} from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { IOrderModuleService, OrderDTO } from "@medusajs/types"
import { emitEventStep, useRemoteQueryStep } from "../../common"
import { validateDraftOrderStep } from "../steps/validate-draft-order"

const convertDraftOrderWorkflowId = "convert-draft-order"

interface ConvertDraftOrderWorkflowInput {
  id: string
}

interface ConvertDraftOrderStepInput {
  id: string
}

/**
 * This step converts a draft order to a pending order.
 *
 * @example
 * ```typescript
 * const order = await convertDraftOrderStep({ id: "order_123" })
 * ```
 */
const convertDraftOrderStep = createStep(
  "convert-draft-order",
  async function ({ id }: ConvertDraftOrderStepInput, { container }) {
    const service = container.resolve<IOrderModuleService>(Modules.ORDER)

    const response = await service.updateOrders([
      {
        id,
        status: OrderStatus.PENDING,
        is_draft_order: false,
      },
    ])

    const order = response[0]

    return new StepResponse(order, {
      id,
    })
  },
  async function (prevData, { container }) {
    if (!prevData) {
      return
    }

    const service = container.resolve<IOrderModuleService>(Modules.ORDER)

    await service.updateOrders([
      {
        id: prevData.id,
        status: OrderStatus.DRAFT,
        is_draft_order: true,
      },
    ])
  }
)

/**
 * This workflow converts a draft order to a pending order.
 *
 * @example
 * ```typescript
 * const order = await convertDraftOrderWorkflow({ id: "order_123" })
 * ```
 */
export const convertDraftOrderWorkflow = createWorkflow(
  convertDraftOrderWorkflowId,
  function (
    input: WorkflowData<ConvertDraftOrderWorkflowInput>
  ): WorkflowResponse<OrderDTO> {
    const order = useRemoteQueryStep({
      entry_point: "orders",
      fields: ["id", "status", "is_draft_order"],
      variables: {
        id: input.id,
      },
      list: false,
      throw_if_key_not_found: true,
    }).config({ name: "order-query" })

    validateDraftOrderStep({ order })

    const updatedOrder = convertDraftOrderStep({ id: input.id })

    emitEventStep({
      eventName: OrderWorkflowEvents.PLACED,
      data: { id: updatedOrder.id },
    })

    return new WorkflowResponse(updatedOrder)
  }
)
