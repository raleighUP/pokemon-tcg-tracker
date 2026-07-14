const TEMPLATE_WIDTH = 20
const TEMPLATE_HEIGHT = 28
const FONT_VARIANTS = [
  { family: 'Arial', weight: 700 },
  { family: 'Arial', weight: 800 },
  { family: 'Segoe UI', weight: 700 },
  { family: 'sans-serif', weight: 700 },
]

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right)

  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0
}

function components(mask, width, height) {
  const visited = new Uint8Array(mask.length)
  const found = []

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
        const nextX = x + dx
        const nextY = y + dy
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue
        const next = nextY * width + nextX
        if (!mask[next] || visited[next]) continue
        visited[next] = 1
        queue.push(next)
      }
    }

    found.push({
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixels,
    })
  }

  return found
}

function normalizeMask(mask, sourceWidth, bounds) {
  const normalized = new Uint8Array(TEMPLATE_WIDTH * TEMPLATE_HEIGHT)
  const insetX = 2
  const insetY = 2
  const availableWidth = TEMPLATE_WIDTH - insetX * 2
  const availableHeight = TEMPLATE_HEIGHT - insetY * 2
  const scale = Math.min(availableWidth / bounds.width, availableHeight / bounds.height)
  const width = Math.max(1, Math.round(bounds.width * scale))
  const height = Math.max(1, Math.round(bounds.height * scale))
  const left = Math.floor((TEMPLATE_WIDTH - width) / 2)
  const top = Math.floor((TEMPLATE_HEIGHT - height) / 2)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(bounds.width - 1, Math.floor(x / scale)) + bounds.x
      const sourceY = Math.min(bounds.height - 1, Math.floor(y / scale)) + bounds.y
      normalized[(top + y) * TEMPLATE_WIDTH + left + x] =
        mask[sourceY * sourceWidth + sourceX] ?? 0
    }
  }

  return normalized
}

function diceSimilarity(left, right, dx = 0, dy = 0) {
  let intersection = 0
  let leftPixels = 0
  let rightPixels = 0

  for (let y = 0; y < TEMPLATE_HEIGHT; y += 1) {
    for (let x = 0; x < TEMPLATE_WIDTH; x += 1) {
      const leftValue = left[y * TEMPLATE_WIDTH + x] ?? 0
      const sourceX = x - dx
      const sourceY = y - dy
      const rightValue =
        sourceX >= 0 && sourceX < TEMPLATE_WIDTH && sourceY >= 0 && sourceY < TEMPLATE_HEIGHT
          ? right[sourceY * TEMPLATE_WIDTH + sourceX] ?? 0
          : 0
      leftPixels += leftValue
      rightPixels += rightValue
      intersection += leftValue && rightValue ? 1 : 0
    }
  }

  return (2 * intersection) / Math.max(1, leftPixels + rightPixels)
}

function bestShiftedSimilarity(left, right) {
  let best = 0
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      best = Math.max(best, diceSimilarity(left, right, dx, dy))
    }
  }
  return best
}

async function renderTemplates(sharp) {
  const templates = []

  for (const variant of FONT_VARIANTS) {
    for (let digit = 0; digit <= 9; digit += 1) {
      const svg = Buffer.from(`<svg width="64" height="80" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="80" fill="black"/>
        <text x="32" y="66" text-anchor="middle" fill="white" font-family="${variant.family}" font-size="68" font-weight="${variant.weight}">${digit}</text>
      </svg>`)
      const { data, info } = await sharp(svg).grayscale().raw().toBuffer({ resolveWithObject: true })
      const mask = Uint8Array.from(data, (value) => value >= 96 ? 1 : 0)
      const glyph = components(mask, info.width, info.height)
        .filter((component) => component.pixels >= 12)
        .sort((left, right) => right.pixels - left.pixels)[0]
      if (!glyph) continue
      templates.push({
        digit,
        variant: `${variant.family}-${variant.weight}`,
        mask: normalizeMask(mask, info.width, glyph),
      })
    }
  }

  return templates
}

let templatePromise = null

function getTemplates(sharp) {
  templatePromise ??= renderTemplates(sharp)
  return templatePromise
}

function thresholdVariants(crop, bounds) {
  const pixels = []
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const index = ((bounds.y + y) * crop.width + bounds.x + x) * 3
      const red = crop.data[index] ?? 0
      const green = crop.data[index + 1] ?? 0
      const blue = crop.data[index + 2] ?? 0
      pixels.push({
        luma: red * 0.299 + green * 0.587 + blue * 0.114,
        chroma: Math.max(red, green, blue) - Math.min(red, green, blue),
      })
    }
  }
  const luma = pixels.map((pixel) => pixel.luma)
  const low = percentile(luma, 0.12)
  const high = percentile(luma, 0.88)
  const midpoint = (low + high) / 2
  const variants = [
    { name: 'light-neutral', test: (pixel) => pixel.luma >= Math.max(150, high - 35) && pixel.chroma <= 105 },
    { name: 'light-adaptive', test: (pixel) => pixel.luma >= midpoint + (high - low) * 0.18 },
    { name: 'dark-adaptive', test: (pixel) => pixel.luma <= midpoint - (high - low) * 0.18 },
  ]

  return variants.map((variant) => ({
    name: variant.name,
    width: bounds.width,
    height: bounds.height,
    mask: Uint8Array.from(pixels, (pixel) => variant.test(pixel) ? 1 : 0),
  }))
}

function segmentGlyphs(variant) {
  const minimumHeight = variant.height * 0.22
  const maximumHeight = variant.height * 0.82
  const candidates = components(variant.mask, variant.width, variant.height)
    .filter((component) => {
      const touchesHorizontalEdges = component.x === 0 && component.x + component.width === variant.width
      const centerX = component.x + component.width / 2
      return (
        component.height >= minimumHeight &&
        component.height <= maximumHeight &&
        component.width >= 2 &&
        component.width <= variant.width * 0.55 &&
        component.width / component.height <= 1.05 &&
        component.pixels / (component.width * component.height) >= 0.08 &&
        !touchesHorizontalEdges &&
        centerX >= variant.width * 0.18 &&
        centerX <= variant.width * 0.82
      )
    })
    .sort((left, right) => left.x - right.x)

  if (candidates.length === 0) return []
  const tallest = Math.max(...candidates.map((candidate) => candidate.height))
  return candidates
    .filter((candidate) => candidate.height >= tallest * 0.68)
    .slice(0, 2)
}

function classifyGlyph(mask, templates) {
  const byDigit = new Map()
  for (const template of templates) {
    const score = bestShiftedSimilarity(mask, template.mask)
    byDigit.set(template.digit, Math.max(score, byDigit.get(template.digit) ?? 0))
  }
  return Array.from(byDigit.entries())
    .map(([digit, confidence]) => ({ digit, confidence }))
    .sort((left, right) => right.confidence - left.confidence)
}

export async function recognizeQuantityFromBadge({ sharp, crop, badgeBounds, legacyResult }) {
  const templates = await getTemplates(sharp)
  const variants = thresholdVariants(crop, badgeBounds)
  const attempts = []

  for (const variant of variants) {
    const glyphs = segmentGlyphs(variant)
    if (glyphs.length === 0) {
      attempts.push({ variant: variant.name, failure: 'glyph-segmentation-failed', variantData: variant })
      continue
    }
    const classifications = glyphs.map((glyph) => {
      const normalized = normalizeMask(variant.mask, variant.width, glyph)
      return { glyph, normalized, alternatives: classifyGlyph(normalized, templates) }
    })
    const digits = classifications.map((classification) => classification.alternatives[0])
    if (digits.some((digit) => !digit)) continue
    const quantity = Number(digits.map((digit) => digit.digit).join(''))
    const classifierConfidence = digits.reduce((total, digit) => total + digit.confidence, 0) / digits.length
    const margins = classifications.map((classification) =>
      classification.alternatives[0].confidence - classification.alternatives[1].confidence
    )
    const margin = Math.min(...margins)
    const segmentationConfidence = Math.min(1, glyphs.reduce((total, glyph) => total + glyph.height / variant.height, 0) / glyphs.length)
    const confidence = Math.max(0, Math.min(0.99,
      classifierConfidence * 0.72 + segmentationConfidence * 0.18 + Math.min(0.1, margin)
    ))
    attempts.push({ quantity, confidence, classifierConfidence, margin, classifications, variantData: variant, variant: variant.name })
  }

  const successful = attempts
    .filter((attempt) => Number.isInteger(attempt.quantity) && attempt.quantity >= 1 && attempt.quantity <= 60)
    .sort((left, right) => right.confidence - left.confidence)
  const aggregateScores = new Map()
  for (const attempt of successful) {
    const aggregate = aggregateScores.get(attempt.quantity) ?? {
      quantity: attempt.quantity,
      confidence: 0,
      support: 0,
    }
    aggregate.confidence = Math.max(aggregate.confidence, attempt.confidence)
    aggregate.support += 1
    aggregateScores.set(attempt.quantity, aggregate)
  }
  for (const aggregate of aggregateScores.values()) {
    aggregate.confidence += Math.min(0.08, Math.max(0, aggregate.support - 1) * 0.04)
    if (legacyResult?.source !== 'unknown' && legacyResult.quantity === aggregate.quantity) {
      aggregate.confidence += 0.08
    }
  }
  const selectedAggregate = Array.from(aggregateScores.values())
    .sort((left, right) => right.confidence - left.confidence)[0]
  const selectedAttempt = selectedAggregate
    ? successful
        .filter((attempt) => attempt.quantity === selectedAggregate.quantity)
        .sort((left, right) => right.confidence - left.confidence)[0]
    : null
  const best = selectedAttempt
    ? { ...selectedAttempt, confidence: Math.min(0.99, selectedAggregate.confidence) }
    : null
  const quantityAlternatives = new Map()
  for (const attempt of successful) {
    quantityAlternatives.set(attempt.quantity, Math.max(attempt.confidence, quantityAlternatives.get(attempt.quantity) ?? 0))
  }
  if (legacyResult?.quantity >= 1 && legacyResult.quantity <= 60) {
    quantityAlternatives.set(legacyResult.quantity, Math.max(legacyResult.confidence ?? 0, quantityAlternatives.get(legacyResult.quantity) ?? 0))
  }
  const alternatives = Array.from(quantityAlternatives.entries())
    .map(([quantity, confidence]) => ({ quantity, confidence }))
    .sort((left, right) => right.confidence - left.confidence)
  const agrees = Boolean(best && legacyResult?.source !== 'unknown' && best.quantity === legacyResult.quantity)
  const disagreement = Boolean(best && legacyResult?.source !== 'unknown' && best.quantity !== legacyResult.quantity)

  return {
    quantity: best?.quantity ?? null,
    confidence: best ? Math.min(0.99, best.confidence + (agrees ? 0.06 : 0)) : 0,
    source: agrees ? 'combined' : best ? 'digit-template' : legacyResult?.source ?? 'unknown',
    badgeBounds,
    glyphBounds: best?.classifications.map((classification) => classification.glyph) ?? [],
    alternatives,
    notes: [
      ...(disagreement ? [`New parser disagrees with legacy quantity ${legacyResult.quantity}.`] : []),
      ...(!best ? ['No digit glyph passed segmentation and classification.'] : []),
    ],
    disagreement,
    failure: best ? null : attempts.some((attempt) => attempt.failure !== 'glyph-segmentation-failed')
      ? 'classifier-failed'
      : 'glyph-segmentation-failed',
    attempts,
  }
}

export function chooseCombinedQuantity(newResult, legacyResult, options = {}) {
  const minimumOverrideConfidence = options.minimumOverrideConfidence ?? 0.72
  const minimumDisagreementOverrideConfidence =
    options.minimumDisagreementOverrideConfidence ?? 0.735
  if (!newResult?.quantity) return { ...legacyResult, parser: newResult }
  if (legacyResult.source !== 'unknown' && newResult.quantity === legacyResult.quantity) {
    return {
      quantity: newResult.quantity,
      confidence: Math.max(legacyResult.confidence ?? 0, newResult.confidence),
      source: 'combined',
      parser: newResult,
    }
  }
  const requiredConfidence =
    legacyResult.source === 'unknown'
      ? minimumOverrideConfidence
      : minimumDisagreementOverrideConfidence
  if (newResult.confidence >= requiredConfidence) {
    return {
      quantity: newResult.quantity,
      confidence: newResult.confidence,
      source: 'digit-template',
      parser: newResult,
    }
  }
  return { ...legacyResult, parser: newResult }
}

export async function writeQuantityRecognitionArtifacts({
  sharp,
  outputRoot,
  fixtureSlug,
  candidateId,
  crop,
  result,
}) {
  const candidateRoot = path.join(outputRoot, fixtureSlug, candidateId)
  mkdirSync(candidateRoot, { recursive: true })
  const paths = []

  for (const [index, attempt] of result.attempts.entries()) {
    const variantPath = path.join(candidateRoot, `${index + 1}-${attempt.variant}.png`)
    await sharp(Buffer.from(attempt.variantData.mask, (value) => value ? 255 : 0), {
      raw: {
        width: attempt.variantData.width,
        height: attempt.variantData.height,
        channels: 1,
      },
    }).png().toFile(variantPath)
    paths.push(variantPath)

    for (const [glyphIndex, classification] of (attempt.classifications ?? []).entries()) {
      const glyphPath = path.join(candidateRoot, `${index + 1}-${attempt.variant}-glyph-${glyphIndex + 1}.png`)
      await sharp(Buffer.from(classification.normalized, (value) => value ? 255 : 0), {
        raw: { width: TEMPLATE_WIDTH, height: TEMPLATE_HEIGHT, channels: 1 },
      }).resize({ width: 80, height: 112, kernel: 'nearest' }).png().toFile(glyphPath)
      paths.push(glyphPath)
    }
  }

  const badgePath = path.join(candidateRoot, 'badge.png')
  const badgeExtract = {
    left: result.badgeBounds.x,
    top: result.badgeBounds.y,
    width: result.badgeBounds.width,
    height: result.badgeBounds.height,
  }
  await sharp(Buffer.from(crop.data), {
    raw: { width: crop.width, height: crop.height, channels: 3 },
  }).extract(badgeExtract).png().toFile(badgePath)
  paths.push(badgePath)

  return paths
}
import { mkdirSync } from 'node:fs'
import path from 'node:path'
