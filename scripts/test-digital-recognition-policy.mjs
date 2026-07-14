import assert from 'node:assert/strict'
import {
  DIGITAL_RECOGNITION_CONFIG,
  selectSingleDigitBadgeAlternative,
  validateDeckQuantityTotal,
  validateDigitalQuantityRead,
} from '../src/lib/deck-recognition/digital-recognition-config.mjs'

const ordinaryCard = { category: 'Trainer', name: "Boss's Orders" }
for (const quantity of [1, 2, 3, 4]) {
  const result = validateDigitalQuantityRead({
    rawQuantity: quantity,
    confidence: 0.8,
    card: ordinaryCard,
  })
  assert.equal(result.quantity, quantity)
  assert.equal(result.status, 'recognized')
}

for (const quantity of [5, 7, 8, 11, 21, 22, 33, 47]) {
  const result = validateDigitalQuantityRead({
    rawQuantity: quantity,
    confidence: 0.99,
    card: ordinaryCard,
  })
  assert.equal(result.quantity, 1)
  assert.equal(result.status, 'fallback-single')
  assert.match(result.rejectionReason, /rejected implausible/i)
}

assert.equal(
  validateDigitalQuantityRead({
    rawQuantity: 12,
    confidence: 0.95,
    card: { category: 'Energy', name: 'Basic Psychic Energy' },
  }).quantity,
  12
)
assert.equal(
  validateDigitalQuantityRead({
    rawQuantity: 12,
    confidence: 0.7,
    card: { category: 'Energy', name: 'Basic Psychic Energy' },
  }).status,
  'fallback-single'
)
assert.equal(
  validateDigitalQuantityRead({
    rawQuantity: 12,
    confidence: 0.99,
    card: { category: 'Energy', name: 'Prism Energy' },
  }).status,
  'fallback-single'
)
assert.equal(validateDeckQuantityTotal(60), 'valid')
assert.equal(validateDeckQuantityTotal(55), 'near-valid')
assert.equal(validateDeckQuantityTotal(65), 'near-valid')
assert.equal(validateDeckQuantityTotal(98), 'invalid')
assert.equal(DIGITAL_RECOGNITION_CONFIG.quantityMax, 4)

const affectedBadgeReads = [
  { raw: 43, rawConfidence: 0.7883, value: 4, confidence: 0.9141 },
  { raw: 21, rawConfidence: 0.7952, value: 2, confidence: 0.8475 },
  { raw: 23, rawConfidence: 0.7312, value: 2, confidence: 0.8475 },
  { raw: 20, rawConfidence: 0.7234, value: 2, confidence: 0.8475 },
  { raw: 21, rawConfidence: 0.7437, value: 2, confidence: 0.8475 },
  { raw: 47, rawConfidence: 0.7331, value: 4, confidence: 0.9396 },
]

for (const read of affectedBadgeReads) {
  assert.deepEqual(
    selectSingleDigitBadgeAlternative({
      rawQuantity: read.raw,
      rawConfidence: read.rawConfidence,
      templateCandidates: [
        { value: read.raw, confidence: read.rawConfidence },
        { value: read.value, confidence: read.confidence },
      ],
      card: ordinaryCard,
    }),
    { value: read.value, confidence: read.confidence }
  )
}

assert.equal(
  selectSingleDigitBadgeAlternative({
    rawQuantity: 21,
    rawConfidence: 0.8,
    templateCandidates: [{ value: 2, confidence: 0.77 }],
    card: ordinaryCard,
  }),
  null
)
assert.equal(
  selectSingleDigitBadgeAlternative({
    rawQuantity: 12,
    rawConfidence: 0.8,
    templateCandidates: [{ value: 1, confidence: 0.95 }],
    card: { category: 'Energy', name: 'Basic Psychic Energy' },
  }),
  null
)

console.log('Digital recognition quantity policy: pass')
