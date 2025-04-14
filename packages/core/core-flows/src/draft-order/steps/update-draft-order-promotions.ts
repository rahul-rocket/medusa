import {
  ContainerRegistrationKeys,
  Modules,
  PromotionActions,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { IPromotionModuleService } from "@medusajs/types"

export const updateDraftOrderPromotionsStepId = "update-draft-order-promotions"

interface UpdateDraftOrderPromotionsStepInput {
  id: string
  promo_codes: string[]
  action?: PromotionActions
}

export const updateDraftOrderPromotionsStep = createStep(
  updateDraftOrderPromotionsStepId,
  async function (data: UpdateDraftOrderPromotionsStepInput, { container }) {
    const { id, promo_codes = [], action = PromotionActions.ADD } = data

    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
    const remoteQuery = container.resolve(
      ContainerRegistrationKeys.REMOTE_QUERY
    )
    const promotionService = container.resolve<IPromotionModuleService>(
      Modules.PROMOTION
    )

    const existingDraftOrderPromotionLinks = await remoteQuery({
      entryPoint: "order_promotion",
      fields: ["order_id", "promotion_id"],
      variables: { order_id: [id] },
    })

    const promotionLinkMap = new Map<string, any>(
      existingDraftOrderPromotionLinks.map((link) => [link.promotion_id, link])
    )

    const linksToCreate: any[] = []
    const linksToDismiss: any[] = []

    if (promo_codes?.length) {
      const promotions = await promotionService.listPromotions(
        { code: promo_codes },
        { select: ["id"] }
      )

      for (const promotion of promotions) {
        const linkObject = {
          [Modules.ORDER]: { order_id: id },
          [Modules.PROMOTION]: { promotion_id: promotion.id },
        }

        if ([PromotionActions.ADD, PromotionActions.REPLACE].includes(action)) {
          linksToCreate.push(linkObject)
        }

        if (action === PromotionActions.REMOVE) {
          const link = promotionLinkMap.get(promotion.id)

          if (link) {
            linksToDismiss.push(linkObject)
          }
        }
      }
    }

    if (action === PromotionActions.REPLACE) {
      for (const link of existingDraftOrderPromotionLinks) {
        linksToDismiss.push({
          [Modules.ORDER]: { order_id: link.order_id },
          [Modules.PROMOTION]: { promotion_id: link.promotion_id },
        })
      }
    }

    if (linksToDismiss.length) {
      await remoteLink.dismiss(linksToDismiss)
    }

    const createdLinks = linksToCreate.length
      ? await remoteLink.create(linksToCreate)
      : []

    return new StepResponse(null, {
      // @ts-expect-error
      createdLinkIds: createdLinks.map((link) => link.id),
      dismissedLinks: linksToDismiss,
    })
  },
  async function (revertData, { container }) {
    const { dismissedLinks, createdLinkIds } = revertData ?? {}

    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)

    if (dismissedLinks?.length) {
      await remoteLink.create(dismissedLinks)
    }

    if (createdLinkIds?.length) {
      // @ts-expect-error
      await remoteLink.delete(createdLinkIds)
    }
  }
)
