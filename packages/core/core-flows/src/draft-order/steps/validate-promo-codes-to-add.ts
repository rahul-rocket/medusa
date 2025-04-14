import { createStep } from "@medusajs/framework/workflows-sdk"
import { PromotionDTO } from "@medusajs/types"
import {
  throwIfCodesAreInactive,
  throwIfCodesAreMissing,
} from "../utils/validation"

export const validatePromoCodesToAddId = "validate-promo-codes-to-add"

interface ValidatePromoCodesToAddStepInput {
  promo_codes: string[]
  promotions: PromotionDTO[]
}

export const validatePromoCodesToAddStep = createStep(
  validatePromoCodesToAddId,
  async function (input: ValidatePromoCodesToAddStepInput) {
    const { promo_codes, promotions } = input

    throwIfCodesAreMissing(promo_codes, promotions)
    throwIfCodesAreInactive(promo_codes, promotions)
  }
)
