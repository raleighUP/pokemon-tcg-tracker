import assert from 'node:assert/strict'
import sharp from 'sharp'
import { getVisibleAlphaBounds, normalizeSpriteBuffer, NORMALIZED_ART_SIZE, NORMALIZED_CANVAS_SIZE } from './lib/sprite-normalization.mjs'

async function fixture(width, height, left, top, artWidth, artHeight) {
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: { create: { width: artWidth, height: artHeight, channels: 4, background: { r: 40, g: 160, b: 80, alpha: 1 } } }, left, top }])
    .png()
    .toBuffer()
}

for (const input of [
  await fixture(96, 96, 42, 42, 12, 12),
  await fixture(120, 80, 8, 30, 104, 20),
  await fixture(80, 120, 30, 8, 20, 104),
]) {
  const output = await normalizeSpriteBuffer(input)
  const metadata = await sharp(output).metadata()
  const bounds = await getVisibleAlphaBounds(output)
  assert.equal(metadata.width, NORMALIZED_CANVAS_SIZE)
  assert.equal(metadata.height, NORMALIZED_CANVAS_SIZE)
  assert.ok(Math.max(bounds.width, bounds.height) <= NORMALIZED_ART_SIZE)
  assert.ok(Math.max(bounds.width, bounds.height) >= NORMALIZED_ART_SIZE - 1)
  assert.ok(Math.abs((bounds.left * 2 + bounds.width) - NORMALIZED_CANVAS_SIZE) <= 1)
  assert.ok(Math.abs((bounds.top * 2 + bounds.height) - NORMALIZED_CANVAS_SIZE) <= 1)
}
console.log('Sprite alpha-bound normalization tests passed.')
