export type Bounds = { x: number; y: number; width: number; height: number }

export type QuantityRecognitionResult = {
  quantity: number | null
  confidence: number
  source:
    | 'digit-template'
    | 'digit-components'
    | 'legacy-heuristic'
    | 'combined'
    | 'unknown'
  badgeBounds?: Bounds
  glyphBounds?: Bounds[]
  alternatives?: Array<{ quantity: number; confidence: number }>
  notes?: string[]
}

const WIDTH = 20
const HEIGHT = 28
let templates: Array<{ digit: number; mask: Uint8Array }> | null = null

function connectedComponents(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length)
  const result: Array<Bounds & { pixels: number }> = []
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue
    const queue = [start]
    let cursor = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let pixels = 0
    visited[start] = 1
    while (cursor < queue.length) {
      const index = queue[cursor++]
      const x = index % width
      const y = Math.floor(index / width)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      pixels += 1
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        const next = ny * width + nx
        if (!mask[next] || visited[next]) continue
        visited[next] = 1
        queue.push(next)
      }
    }
    result.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, pixels })
  }
  return result
}

function normalize(mask: Uint8Array, sourceWidth: number, bounds: Bounds) {
  const output = new Uint8Array(WIDTH * HEIGHT)
  const scale = Math.min((WIDTH - 4) / bounds.width, (HEIGHT - 4) / bounds.height)
  const width = Math.max(1, Math.round(bounds.width * scale))
  const height = Math.max(1, Math.round(bounds.height * scale))
  const left = Math.floor((WIDTH - width) / 2)
  const top = Math.floor((HEIGHT - height) / 2)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = bounds.x + Math.min(bounds.width - 1, Math.floor(x / scale))
      const sy = bounds.y + Math.min(bounds.height - 1, Math.floor(y / scale))
      output[(top + y) * WIDTH + left + x] = mask[sy * sourceWidth + sx] ?? 0
    }
  }
  return output
}

function buildTemplates() {
  if (templates) return templates
  templates = []
  for (const font of ['700 68px Arial', '700 68px "Segoe UI"', '800 68px sans-serif']) {
    for (let digit = 0; digit <= 9; digit += 1) {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 80
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.fillStyle = '#000'
      context.fillRect(0, 0, 64, 80)
      context.font = font
      context.textAlign = 'center'
      context.fillStyle = '#fff'
      context.fillText(String(digit), 32, 66)
      const data = context.getImageData(0, 0, 64, 80).data
      const mask = new Uint8Array(64 * 80)
      for (let index = 0; index < mask.length; index += 1) {
        mask[index] = (data[index * 4] ?? 0) >= 96 ? 1 : 0
      }
      const glyph = connectedComponents(mask, 64, 80).sort((a, b) => b.pixels - a.pixels)[0]
      if (glyph) templates.push({ digit, mask: normalize(mask, 64, glyph) })
    }
  }
  return templates
}

function similarity(left: Uint8Array, right: Uint8Array) {
  let intersection = 0
  let total = 0
  for (let index = 0; index < left.length; index += 1) {
    intersection += left[index] && right[index] ? 2 : 0
    total += (left[index] ?? 0) + (right[index] ?? 0)
  }
  return intersection / Math.max(1, total)
}

export function recognizeBadgeQuantity(
  image: HTMLImageElement,
  badgeBounds: Bounds
): QuantityRecognitionResult {
  const canvas = document.createElement('canvas')
  canvas.width = badgeBounds.width
  canvas.height = badgeBounds.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return { quantity: null, confidence: 0, source: 'unknown' }
  context.drawImage(image, badgeBounds.x, badgeBounds.y, badgeBounds.width, badgeBounds.height, 0, 0, badgeBounds.width, badgeBounds.height)
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data
  const mask = new Uint8Array(canvas.width * canvas.height)
  for (let index = 0; index < mask.length; index += 1) {
    const red = data[index * 4] ?? 0
    const green = data[index * 4 + 1] ?? 0
    const blue = data[index * 4 + 2] ?? 0
    const luma = red * 0.299 + green * 0.587 + blue * 0.114
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue)
    mask[index] = luma >= 150 && chroma <= 105 ? 1 : 0
  }
  const glyphs = connectedComponents(mask, canvas.width, canvas.height)
    .filter((glyph) =>
      glyph.height >= canvas.height * 0.22 &&
      glyph.height <= canvas.height * 0.82 &&
      glyph.width >= 2 &&
      glyph.width / glyph.height <= 1.05 &&
      glyph.x + glyph.width / 2 >= canvas.width * 0.18 &&
      glyph.x + glyph.width / 2 <= canvas.width * 0.82
    )
    .sort((a, b) => a.x - b.x)
    .slice(0, 2)
  if (!glyphs.length) return { quantity: null, confidence: 0, source: 'unknown', badgeBounds, notes: ['Glyph segmentation failed.'] }
  const classified = glyphs.map((glyph) => {
    const normalized = normalize(mask, canvas.width, glyph)
    const scores = buildTemplates()
      .map((template) => ({ digit: template.digit, confidence: similarity(normalized, template.mask) }))
      .sort((a, b) => b.confidence - a.confidence)
    return scores[0]
  })
  const quantity = Number(classified.map((digit) => digit.digit).join(''))
  const confidence = classified.reduce((sum, digit) => sum + digit.confidence, 0) / classified.length
  const alternatives = quantity >= 1 && quantity <= 60
    ? [{ quantity, confidence }]
    : []

  if (classified.length > 1) {
    const firstDigit = classified[0]

    if (firstDigit && firstDigit.digit >= 1 && firstDigit.digit <= 9) {
      alternatives.push({
        quantity: firstDigit.digit,
        confidence: firstDigit.confidence,
      })
    }
  }

  return {
    quantity: quantity >= 1 && quantity <= 60 ? quantity : null,
    confidence,
    source: 'digit-template',
    badgeBounds,
    glyphBounds: glyphs,
    alternatives,
  }
}

export function combineQuantityRecognition(
  template: QuantityRecognitionResult,
  legacy: { quantity: number; confidence: number; known: boolean }
) {
  if (!template.quantity) return null
  if (legacy.known && template.quantity === legacy.quantity) {
    return { quantity: template.quantity, confidence: Math.max(template.confidence, legacy.confidence), source: 'combined' as const }
  }
  const threshold = legacy.known ? 0.735 : 0.72
  return template.confidence >= threshold
    ? { quantity: template.quantity, confidence: template.confidence, source: 'digit-template' as const }
    : null
}
