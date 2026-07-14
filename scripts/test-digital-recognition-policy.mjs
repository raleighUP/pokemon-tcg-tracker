import assert from 'node:assert/strict'
import {
  DIGITAL_RECOGNITION_CONFIG,
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

console.log('Digital recognition quantity policy: pass')
