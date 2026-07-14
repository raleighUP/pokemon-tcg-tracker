export const DIGITAL_RECOGNITION_CONFIG = Object.freeze({
  configVersion: 'digital-production-v2',
  layout: 'ptcgl',
  quantityMin: 1,
  quantityMax: 4,
  basicEnergyQuantityMax: 60,
  basicEnergyMultiDigitMinimumConfidence: 0.9,
  minimumAcceptedQuantityConfidence: 0.78,
  minimumCardMatchConfidence: 0.68,
  minimumIdentityMargin: 0.035,
  unresolvedBelowConfidence: true,
  duplicateSuppressionThreshold: 0.45,
  expectedDeckTotal: 60,
  nearValidDeckTotalMin: 55,
  nearValidDeckTotalMax: 65,
})

export function isBasicEnergyIdentity(card) {
  if (!card || card.category !== 'Energy') return false

  return /^(basic\s+)?(grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy$/i.test(
    String(card.name ?? card.englishName ?? '').trim()
  )
}

export function validateDigitalQuantityRead({
  rawQuantity,
  confidence,
  card,
  layout = DIGITAL_RECOGNITION_CONFIG.layout,
  config = DIGITAL_RECOGNITION_CONFIG,
}) {
  const rawCandidates = rawQuantity == null ? [] : [String(rawQuantity)]
  const ordinaryValid =
    Number.isInteger(rawQuantity) &&
    rawQuantity >= config.quantityMin &&
    rawQuantity <= config.quantityMax

  if (ordinaryValid) {
    return {
      quantity: rawQuantity,
      confidence,
      status: 'recognized',
      rawCandidates,
      rejectionReason: null,
    }
  }

  const layoutSupportsMultiDigitEnergy = layout === 'ptcgl'
  const validBasicEnergyQuantity =
    isBasicEnergyIdentity(card) &&
    layoutSupportsMultiDigitEnergy &&
    Number.isInteger(rawQuantity) &&
    rawQuantity > config.quantityMax &&
    rawQuantity <= config.basicEnergyQuantityMax &&
    confidence >= config.basicEnergyMultiDigitMinimumConfidence

  if (validBasicEnergyQuantity) {
    return {
      quantity: rawQuantity,
      confidence,
      status: 'recognized',
      rawCandidates,
      rejectionReason: null,
    }
  }

  return {
    quantity: 1,
    confidence: 0,
    status: 'fallback-single',
    rawCandidates,
    rejectionReason:
      rawQuantity == null
        ? 'No reliable quantity digit was found.'
        : `Rejected implausible ${layout} quantity ${rawQuantity}.`,
  }
}

export function selectSingleDigitBadgeAlternative({
  rawQuantity,
  rawConfidence,
  templateCandidates,
  card,
  config = DIGITAL_RECOGNITION_CONFIG,
}) {
  if (isBasicEnergyIdentity(card)) return null

  const candidate = (templateCandidates ?? [])
    .filter((alternative) =>
      alternative.value >= config.quantityMin &&
      alternative.value <= config.quantityMax
    )
    .sort((left, right) => right.confidence - left.confidence)[0]

  if (
    !candidate ||
    candidate.confidence < config.minimumAcceptedQuantityConfidence
  ) return null

  const rawIsInvalid =
    rawQuantity < config.quantityMin || rawQuantity > config.quantityMax
  const clearlyStronger = candidate.confidence - rawConfidence >= 0.05

  return rawIsInvalid || clearlyStronger ? candidate : null
}

export function validateDeckQuantityTotal(
  total,
  config = DIGITAL_RECOGNITION_CONFIG
) {
  if (total === config.expectedDeckTotal) return 'valid'
  if (
    total >= config.nearValidDeckTotalMin &&
    total <= config.nearValidDeckTotalMax
  ) {
    return 'near-valid'
  }
  return 'invalid'
}
