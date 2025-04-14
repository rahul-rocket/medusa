import { createStep } from "@medusajs/framework/workflows-sdk"
import { PromotionDTO } from "@medusajs/types"
import { throwIfCodesAreMissing } from "../utils/validation"

export const validatePromoCodesToRemoveId = "validate-promo-codes-to-remove"

interface ValidatePromoCodesToRemoveStepInput {
  promo_codes: string[]
  promotions: PromotionDTO[]
}

export const validatePromoCodesToRemoveStep = createStep(
  validatePromoCodesToRemoveId,
  async function (input: ValidatePromoCodesToRemoveStepInput) {
    const { promo_codes, promotions } = input

    throwIfCodesAreMissing(promo_codes, promotions)
  }
)
