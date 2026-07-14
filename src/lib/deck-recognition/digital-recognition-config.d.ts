export type DigitalDeckLayout = 'ptcgl' | 'limitless' | 'unknown'
export type QuantityDecisionStatus =
  | 'recognized'
  | 'fallback-single'
  | 'guessed'
  | 'unresolved'
export type DeckQuantityValidationStatus = 'valid' | 'near-valid' | 'invalid'

export interface DigitalRecognitionConfig {
  configVersion: string
  layout: DigitalDeckLayout
  quantityMin: number
  quantityMax: number
  basicEnergyQuantityMax: number
  basicEnergyMultiDigitMinimumConfidence: number
  minimumCardMatchConfidence: number
  minimumIdentityMargin: number
  unresolvedBelowConfidence: boolean
  duplicateSuppressionThreshold: number
  expectedDeckTotal: number
  nearValidDeckTotalMin: number
  nearValidDeckTotalMax: number
}

export const DIGITAL_RECOGNITION_CONFIG: Readonly<DigitalRecognitionConfig>
export function isBasicEnergyIdentity(card: {
  category?: string
  name?: string
  englishName?: string
} | null | undefined): boolean
export function validateDigitalQuantityRead(input: {
  rawQuantity: number | null | undefined
  confidence: number
  card?: { category?: string; name?: string; englishName?: string } | null
  layout?: DigitalDeckLayout
  config?: DigitalRecognitionConfig
}): {
  quantity: number
  confidence: number
  status: QuantityDecisionStatus
  rawCandidates: string[]
  rejectionReason: string | null
}
export function validateDeckQuantityTotal(
  total: number,
  config?: DigitalRecognitionConfig
): DeckQuantityValidationStatus
