import sharp from 'sharp'

export const NORMALIZED_CANVAS_SIZE = 96
export const NORMALIZED_ART_SIZE = 84

export async function getVisibleAlphaBounds(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = info.width
  let top = info.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] === 0) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  if (right < left || bottom < top) throw new Error('Sprite has no visible pixels.')
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

export async function normalizeSpriteBuffer(input) {
  const bounds = await getVisibleAlphaBounds(input)
  return sharp(input)
    .ensureAlpha()
    .extract(bounds)
    .resize(NORMALIZED_ART_SIZE, NORMALIZED_ART_SIZE, {
      fit: 'contain',
      kernel: sharp.kernel.nearest,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 6,
      bottom: 6,
      left: 6,
      right: 6,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer()
}
