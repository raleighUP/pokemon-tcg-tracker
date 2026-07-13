import type {
  CardReference,
  CardPrintReference,
  DeckCardLegalityStatus,
  DeckPrintMode,
  ExtractedDeckCard,
} from '@/types'
import { detectDeckEntryCandidates } from './crop-detector'
import type { DeckEntryCandidate } from './types'
import {
  combineQuantityRecognition,
  recognizeBadgeQuantity,
} from './quantity-recognition'
import {
  buildColorHistogram,
  buildDHash,
  buildEdgeVector,
  buildTemplateVector,
  createEmptyFutureFeatureMatching,
  scoreImageFeatures,
} from './local-image-matcher-core.mjs'
import { resolveBasePrintForRecognizedCard } from '@/lib/deck-recognition/references/base-print-resolver'

type ImageFeatures = {
  perceptualHash: string
  colorHistogram: number[]
  templateVector: number[]
  artTemplateVector: number[]
  titleTemplateVector: number[]
  lowerTemplateVector: number[]
  edgeVector: number[]
  futureFeatureMatching?: ReturnType<typeof createEmptyFutureFeatureMatching>
}

type FixtureCardImageManifest = {
  cards: Array<{
    id: string
    name: string
    setCode: string
    cardNumber: string
    regulationMark?: string
    legalities?: CardReference['legalities']
    category: CardReference['category']
    imageUrl: string
    publicImagePath?: string
  }>
}

export type LocalImageMatch = {
  name: string
  setCode: string
  cardNumber: string
  regulationMark?: string
  category: CardReference['category']
  confidence: number
  imageReferenceId: string
  imageUrl: string
  scoreComponents: ReturnType<typeof scoreImageFeatures>['components']
  legalities?: CardReference['legalities']
}

type TopCandidateMatch = {
  name: string
  setCode: string
  cardNumber: string
  confidence: number
  scoreComponents: LocalImageMatch['scoreComponents']
}

type QuantityReadResult = {
  quantity: number
  quantityConfidence: number
  quantitySource: DeckEntryCandidate['quantitySource']
  note: string | null
  badgeFound: boolean
  failureReason: string | null
  badgeBounds?: DeckEntryCandidate['representativeBounds']
  badgePreviewDataUrl?: string
  selectedBadgeZone?: string | null
  globalBadgePattern?: BadgePattern | null
  globalBadgePatternApplied?: boolean
  rejectedBadgeZones?: Array<{
    zone: string
    confidence: number
    parsedValue: number | null
    reason: string
  }>
}

export type BadgePattern = {
  zone: string
  relativeBounds: {
    x: number
    y: number
    width: number
    height: number
  }
  sampleCount: number
  candidateCount: number
}

export type BrowserDeckImageRecognitionResult = {
  cards: ExtractedDeckCard[]
  candidateCount: number
  matchedCount: number
  unresolvedCount: number
  estimatedTotalQuantity: number
  unknownQuantityCount: number
  rejectedCropCount: number
  mergedCount: number
  finalReviewRowCount: number
  globalBadgePattern?: BadgePattern | null
  debugMatches: Array<{
    candidateId: string
    status:
      | 'detected'
      | 'rejected'
      | 'matched'
      | 'low-confidence'
      | 'unresolved'
      | 'merged'
    topMatch?: string
    topCandidateMatches: TopCandidateMatch[]
    closeMatch: boolean
    closeMatchDelta?: number
    confidence?: number
    threshold?: number
    reviewRowId?: string
    mergedIntoCandidateId?: string
    quantity: number
    quantityConfidence: number
    quantitySource: DeckEntryCandidate['quantitySource']
    quantityDiagnostics: {
      badgeFound: boolean
      badgeBounds?: DeckEntryCandidate['representativeBounds']
      parsedValue: number
      confidence: number
      failureReason: string | null
      selectedBadgeZone?: string | null
      globalBadgePattern?: BadgePattern | null
      globalBadgePatternApplied?: boolean
      rejectedBadgeZones?: QuantityReadResult['rejectedBadgeZones']
    }
    badgeBounds?: DeckEntryCandidate['representativeBounds']
    badgePreviewDataUrl?: string
    notes: string[]
  }>
  warnings: string[]
}

const MANIFEST_PATH = '/card-image-cache/fixture-subset/manifest.json'
const LOW_CONFIDENCE_THRESHOLD = 0.68
const MULTIPLE_MATCH_DELTA = 0.02
const TRAINER_ENERGY_CLOSE_MATCH_DELTA = 0.035
const SUSPICIOUS_QUANTITY_CONFIDENCE = 0.62

type RefinedCandidate = DeckEntryCandidate & {
  cropQuality: {
    rejected: boolean
    notes: string[]
  }
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to load image: ${source}`))
    image.src = source
  })
}

function getImageSize(image: HTMLImageElement) {
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  }
}

function drawImageToImageData(
  image: HTMLImageElement,
  width: number,
  height: number,
  options: {
    sourceBounds?: DeckEntryCandidate['representativeBounds']
    fit?: 'fill' | 'cover'
  } = {}
) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('Unable to create image processing canvas.')
  }

  canvas.width = width
  canvas.height = height
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)

  const bounds = options.sourceBounds

  if (bounds) {
    context.drawImage(
      image,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      width,
      height
    )
  } else if (options.fit === 'cover') {
    const size = getImageSize(image)
    const sourceAspect = size.width / size.height
    const targetAspect = width / height
    let sourceX = 0
    let sourceY = 0
    let sourceWidth = size.width
    let sourceHeight = size.height

    if (sourceAspect > targetAspect) {
      sourceWidth = Math.round(size.height * targetAspect)
      sourceX = Math.round((size.width - sourceWidth) / 2)
    } else {
      sourceHeight = Math.round(size.width / targetAspect)
      sourceY = Math.round((size.height - sourceHeight) / 2)
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height
    )
  } else {
    context.drawImage(image, 0, 0, width, height)
  }

  return context.getImageData(0, 0, width, height)
}

function clampBounds(
  bounds: DeckEntryCandidate['representativeBounds'],
  image: HTMLImageElement
) {
  const size = getImageSize(image)
  const x = Math.max(0, Math.min(Math.round(bounds.x), size.width - 1))
  const y = Math.max(0, Math.min(Math.round(bounds.y), size.height - 1))
  const width = Math.max(1, Math.min(Math.round(bounds.width), size.width - x))
  const height = Math.max(1, Math.min(Math.round(bounds.height), size.height - y))

  return {
    x,
    y,
    width,
    height,
    rotation: bounds.rotation,
  }
}

function refineCandidateCrop(
  candidate: DeckEntryCandidate,
  image: HTMLImageElement
): RefinedCandidate {
  const notes: string[] = []
  const original = candidate.representativeBounds
  const aspect = original.width / original.height
  let width = original.width
  let height = original.height

  if (Math.abs(aspect - 63 / 88) > 0.18) {
    notes.push('Crop aspect ratio is uncertain.')
  }

  if (aspect > 63 / 88) {
    width = height * (63 / 88)
  } else {
    height = width / (63 / 88)
  }

  width *= 0.985
  height *= 0.985

  const refinedBounds = clampBounds(
    {
      x: original.x + (original.width - width) / 2,
      y: original.y + (original.height - height) / 2,
      width,
      height,
      rotation: original.rotation,
    },
    image
  )
  const size = getImageSize(image)
  const areaRatio = (refinedBounds.width * refinedBounds.height) / (size.width * size.height)

  if (areaRatio < 0.006 || areaRatio > 0.09) {
    notes.push('Crop size is outside expected digital card bounds.')
  }

  return {
    ...candidate,
    representativeBounds: refinedBounds,
    x: refinedBounds.x,
    y: refinedBounds.y,
    width: refinedBounds.width,
    height: refinedBounds.height,
    cropQuality: {
      rejected: notes.some((note) => note.includes('outside expected')),
      notes,
    },
  }
}

function cropBoundsToDataUrl(
  image: HTMLImageElement,
  bounds: DeckEntryCandidate['representativeBounds']
) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) return undefined

  canvas.width = 64
  canvas.height = 64
  context.drawImage(
    image,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    canvas.width,
    canvas.height
  )

  return canvas.toDataURL('image/png')
}

function relativeBounds(
  base: DeckEntryCandidate['representativeBounds'] | undefined,
  image: HTMLImageElement,
  region: { x: number; y: number; width: number; height: number }
) {
  const size = getImageSize(image)
  const source = base ?? {
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
  }

  return clampBounds(
    {
      x: source.x + source.width * region.x,
      y: source.y + source.height * region.y,
      width: source.width * region.width,
      height: source.height * region.height,
    },
    image
  )
}

type DigitRead = {
  digit: number
  confidence: number
  foregroundPixels: number
  contrast: number
  digitCount?: number
}

function percentile(values: number[], percent: number) {
  if (values.length === 0) return 0

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.floor(sorted.length * percent))
  )

  return sorted[index] ?? 0
}

function connectedMaskBounds(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const components: Array<{
    x: number
    y: number
    width: number
    height: number
    pixels: number
    score: number
  }> = []

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue

    let head = 0
    let tail = 0
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    let pixels = 0

    visited[start] = 1
    queue[tail] = start
    tail += 1

    while (head < tail) {
      const current = queue[head]
      head += 1
      pixels += 1

      const x = current % width
      const y = Math.floor(current / width)

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      const neighbors = [current - 1, current + 1, current - width, current + width]

      for (const neighbor of neighbors) {
        if (
          neighbor < 0 ||
          neighbor >= mask.length ||
          visited[neighbor] ||
          !mask[neighbor]
        ) {
          continue
        }

        const neighborX = neighbor % width

        if (Math.abs(neighborX - x) > 1) continue

        visited[neighbor] = 1
        queue[tail] = neighbor
        tail += 1
      }
    }

    const componentWidth = maxX - minX + 1
    const componentHeight = maxY - minY + 1
    const centerX = minX + componentWidth / 2
    const centerY = minY + componentHeight / 2
    const centerDistance = Math.hypot(
      centerX / width - 0.5,
      centerY / height - 0.5
    )
    const aspect = componentWidth / componentHeight
    const density = pixels / (componentWidth * componentHeight)
    const touchesEdge = minX === 0 || minY === 0 || maxX === width - 1 || maxY === height - 1
    const digitShapeScore =
      componentWidth >= 3 &&
      componentHeight >= 7 &&
      aspect >= 0.2 &&
      aspect <= 1.15 &&
      density >= 0.12 &&
      density <= 0.78 &&
      !touchesEdge
        ? 1
        : 0
    const areaScore = Math.min(1, pixels / (width * height * 0.16))
    const centerScore = Math.max(0, 1 - centerDistance / 0.42)

    components.push({
      x: minX,
      y: minY,
      width: componentWidth,
      height: componentHeight,
      pixels,
      score: digitShapeScore * 0.68 + areaScore * 0.1 + centerScore * 0.22,
    })
  }

  return components.sort((left, right) => right.score - left.score)[0] ?? null
}

function classifyDigitFromBadge(
  image: HTMLImageElement,
  bounds: DeckEntryCandidate['representativeBounds']
): DigitRead | null {
  const width = 5
  const height = 7
  const sampleWidth = 32
  const sampleHeight = 32
  const templates: Record<number, string[]> = {
    0: ['11110', '10010', '10010', '10010', '10010', '10010', '11110'],
    1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    2: ['11110', '00010', '00010', '11110', '10000', '10000', '11110'],
    3: ['11110', '00010', '00010', '01110', '00010', '00010', '11110'],
    4: ['10010', '10010', '10010', '11110', '00010', '00010', '00010'],
    5: ['11110', '10000', '10000', '11110', '00010', '00010', '11110'],
    6: ['11110', '10000', '10000', '11110', '10010', '10010', '11110'],
    7: ['11110', '00010', '00010', '00100', '00100', '01000', '01000'],
    8: ['11110', '10010', '10010', '11110', '10010', '10010', '11110'],
    9: ['11110', '10010', '10010', '11110', '00010', '00010', '11110'],
  }
  const imageData = drawImageToImageData(image, sampleWidth, sampleHeight, {
    sourceBounds: bounds,
  })
  const luma: number[] = []

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index] ?? 0
    const green = imageData.data[index + 1] ?? 0
    const blue = imageData.data[index + 2] ?? 0

    luma.push(red * 0.299 + green * 0.587 + blue * 0.114)
  }

  const low = percentile(luma, 0.08)
  const high = percentile(luma, 0.92)
  const contrast = high - low

  if (contrast < 28) return null

  const makeBits = (foreground: 'light' | 'dark') => {
    const mask = new Uint8Array(sampleWidth * sampleHeight)
    const threshold = Math.max(12, contrast * 0.24)

    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        const value = luma[y * sampleWidth + x] ?? 128
        const isForeground =
          foreground === 'light'
            ? value >= high - threshold
            : value <= low + threshold

        mask[y * sampleWidth + x] = isForeground ? 1 : 0
      }
    }

    const foregroundBounds = connectedMaskBounds(mask, sampleWidth, sampleHeight)

    if (!foregroundBounds) return null

    const aspect = foregroundBounds.width / foregroundBounds.height
    const density = foregroundBounds.pixels / (foregroundBounds.width * foregroundBounds.height)

    if (
      foregroundBounds.width < 3 ||
      foregroundBounds.height < 8 ||
      aspect < 0.18 ||
      aspect > 1.25 ||
      density < 0.08 ||
      density > 0.72
    ) {
      return null
    }

    const bitsForBounds = (digitBounds: {
      x: number
      y: number
      width: number
      height: number
    }) => {
      const bits: string[] = []

      for (let y = 0; y < height; y += 1) {
        let row = ''

        for (let x = 0; x < width; x += 1) {
          const sourceX = Math.min(
            sampleWidth - 1,
            Math.max(
              0,
              Math.floor(
                digitBounds.x +
                  ((x + 0.5) / width) * digitBounds.width
              )
            )
          )
          const sourceY = Math.min(
            sampleHeight - 1,
            Math.max(
              0,
              Math.floor(
                digitBounds.y +
                  ((y + 0.5) / height) * digitBounds.height
              )
            )
          )
          const isForeground = Boolean(mask[sourceY * sampleWidth + sourceX])

          row += isForeground ? '1' : '0'
        }

        bits.push(row)
      }

      return bits
    }
    const reads: Array<{
      bits: string[] | [string[], string[]]
      digitCount: 1 | 2
    }> = [{ bits: bitsForBounds(foregroundBounds), digitCount: 1 }]

    if (aspect > 0.62 && foregroundBounds.width >= 10) {
      const gap = foregroundBounds.width * 0.08
      const leftBounds = {
        ...foregroundBounds,
        width: foregroundBounds.width / 2 - gap / 2,
      }
      const rightBounds = {
        ...foregroundBounds,
        x: foregroundBounds.x + foregroundBounds.width / 2 + gap / 2,
        width: foregroundBounds.width / 2 - gap / 2,
      }

      reads.push({
        bits: [bitsForBounds(leftBounds), bitsForBounds(rightBounds)],
        digitCount: 2,
      })
    }

    return reads
  }
  const scoreBits = (bits: string[] | null) => {
    if (!bits) return []

    const activePixels = bits.join('').replaceAll('0', '').length
    const densityPenalty = Math.max(0, 1 - Math.abs(activePixels / 35 - 0.38) / 0.38)

    return (
    Object.entries(templates).map(([digit, template]) => {
      let same = 0
      let total = 0

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (bits[y]?.[x] === template[y]?.[x]) same += 1
          total += 1
        }
      }

      return {
        digit: Number(digit),
        confidence: (same / total) * (0.72 + densityPenalty * 0.28),
        foregroundPixels: activePixels,
        contrast,
        digitCount: 1,
      }
    }))
  }
  const scores = [
    ...(makeBits('light') ?? []).flatMap((read) => {
      if (read.digitCount === 1) return scoreBits(read.bits as string[])

      const [leftBits, rightBits] = read.bits as [string[], string[]]
      const bestLeft = scoreBits(leftBits).sort(
        (left, right) => right.confidence - left.confidence
      )[0]
      const bestRight = scoreBits(rightBits).sort(
        (left, right) => right.confidence - left.confidence
      )[0]

      if (!bestLeft || !bestRight || bestLeft.digit === 0) return []

      const quantity = bestLeft.digit * 10 + bestRight.digit

      if (quantity < 1 || quantity > 60) return []

      return [{
        digit: quantity,
        confidence: ((bestLeft.confidence + bestRight.confidence) / 2) * 0.92,
        foregroundPixels: bestLeft.foregroundPixels + bestRight.foregroundPixels,
        contrast: Math.min(bestLeft.contrast, bestRight.contrast),
        digitCount: 2,
      }]
    }),
    ...(makeBits('dark') ?? []).flatMap((read) => {
      if (read.digitCount === 1) return scoreBits(read.bits as string[])

      const [leftBits, rightBits] = read.bits as [string[], string[]]
      const bestLeft = scoreBits(leftBits).sort(
        (left, right) => right.confidence - left.confidence
      )[0]
      const bestRight = scoreBits(rightBits).sort(
        (left, right) => right.confidence - left.confidence
      )[0]

      if (!bestLeft || !bestRight || bestLeft.digit === 0) return []

      const quantity = bestLeft.digit * 10 + bestRight.digit

      if (quantity < 1 || quantity > 60) return []

      return [{
        digit: quantity,
        confidence: ((bestLeft.confidence + bestRight.confidence) / 2) * 0.92,
        foregroundPixels: bestLeft.foregroundPixels + bestRight.foregroundPixels,
        contrast: Math.min(bestLeft.contrast, bestRight.contrast),
        digitCount: 2,
      }]
    }),
  ].map((score) => ({
    ...score,
    confidence: score.confidence * Math.min(1, contrast / 80),
  }))

  const sortedScores = scores.sort((left, right) => right.confidence - left.confidence)
  const plausibleScore = sortedScores.find(
    (score) =>
      score.digit >= 1 &&
      score.digit <= 60 &&
      (score.digit <= 4 ||
        score.digitCount === 2 ||
        (score.digit < 10 && score.confidence >= 0.9))
  )

  return plausibleScore ?? sortedScores[0] ?? null
}

function classifyTcgLiveRedBadgeFour(
  image: HTMLImageElement,
  bounds: DeckEntryCandidate['representativeBounds']
) {
  const sampleWidth = 32
  const sampleHeight = 32
  const imageData = drawImageToImageData(image, sampleWidth, sampleHeight, {
    sourceBounds: bounds,
  })
  const whiteMask = new Uint8Array(sampleWidth * sampleHeight)
  let redPixels = 0
  let minX = sampleWidth
  let minY = sampleHeight
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const pixelIndex = (y * sampleWidth + x) * 4
      const red = imageData.data[pixelIndex] ?? 0
      const green = imageData.data[pixelIndex + 1] ?? 0
      const blue = imageData.data[pixelIndex + 2] ?? 0
      const luma = red * 0.299 + green * 0.587 + blue * 0.114
      const maskIndex = y * sampleWidth + x
      const isRed = red > 95 && red > green * 1.35 && red > blue * 1.35
      const isWhiteStroke =
        luma > 175 && Math.max(red, green, blue) - Math.min(red, green, blue) < 110

      if (isRed) {
        redPixels += 1
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }

      if (isWhiteStroke) {
        whiteMask[maskIndex] = 1
      }
    }
  }

  if (redPixels / (sampleWidth * sampleHeight) < 0.25 || maxX < minX || maxY < minY) {
    return null
  }

  const redWidth = maxX - minX + 1
  const redHeight = (maxY - minY + 1) * 0.72
  const cell: number[] = []

  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      let active = 0
      let total = 0
      const xStart = Math.floor(minX + (x * redWidth) / 5)
      const xEnd = Math.floor(minX + ((x + 1) * redWidth) / 5)
      const yStart = Math.floor(minY + (y * redHeight) / 7)
      const yEnd = Math.floor(minY + ((y + 1) * redHeight) / 7)

      for (let sampleY = yStart; sampleY < yEnd; sampleY += 1) {
        for (let sampleX = xStart; sampleX < xEnd; sampleX += 1) {
          active += whiteMask[sampleY * sampleWidth + sampleX] ?? 0
          total += 1
        }
      }

      cell[y * 5 + x] = active / Math.max(1, total)
    }
  }

  const average = (coordinates: Array<[number, number]>) =>
    coordinates.reduce((total, [y, x]) => total + (cell[y * 5 + x] ?? 0), 0) /
    coordinates.length
  const middleLeft = average([
    [2, 0],
    [3, 0],
    [4, 0],
    [2, 1],
    [3, 1],
    [4, 1],
  ])
  const outerLeft = average([
    [0, 0],
    [1, 0],
    [5, 0],
    [6, 0],
    [0, 1],
    [1, 1],
    [5, 1],
    [6, 1],
  ])
  const rightStroke = average([
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [5, 4],
  ])
  const middleBar = average([
    [2, 0],
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
    [3, 0],
    [3, 1],
    [3, 2],
    [3, 3],
    [3, 4],
  ])

  if (
    outerLeft - middleLeft <= 0.1 ||
    rightStroke <= 0.24 ||
    middleBar <= 0.18
  ) {
    return null
  }

  return {
    digit: 4,
    confidence: Math.min(
      0.82,
      0.6 +
        Math.max(0, outerLeft - middleLeft - 0.1) * 0.5 +
        Math.max(0, rightStroke - 0.24) * 0.35 +
        Math.max(0, middleBar - 0.18) * 0.35
    ),
  }
}

function scoreBadgeWindow(
  image: HTMLImageElement,
  bounds: DeckEntryCandidate['representativeBounds'],
  candidateBounds: DeckEntryCandidate['representativeBounds'],
  locationWeight: number,
  zone: string,
  source = 'zone-search'
) {
  const digit = classifyDigitFromBadge(image, bounds)
  const imageData = drawImageToImageData(image, 16, 16, { sourceBounds: bounds })
  const luma: number[] = []

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index] ?? 0
    const green = imageData.data[index + 1] ?? 0
    const blue = imageData.data[index + 2] ?? 0
    luma.push(red * 0.299 + green * 0.587 + blue * 0.114)
  }

  const sorted = [...luma].sort((left, right) => left - right)
  const contrast = (sorted.at(-1) ?? 255) - (sorted[0] ?? 0)
  const relativeCenterX =
    (bounds.x + bounds.width / 2 - candidateBounds.x) / candidateBounds.width
  const relativeCenterY =
    (bounds.y + bounds.height / 2 - candidateBounds.y) / candidateBounds.height
  const sizeRatio = bounds.width / candidateBounds.width
  const sizeScore = Math.max(0, 1 - Math.abs(sizeRatio - 0.3) / 0.18)

  return {
    bounds,
    zone,
    source,
    digit,
    score:
      (digit?.confidence ?? 0) * 0.58 +
      Math.min(1, contrast / 120) * 0.1 +
      Math.max(0, 1 - Math.hypot(relativeCenterX - 0.52, relativeCenterY - 0.86) / 0.24) * 0.25 +
      sizeScore * 0.06 +
      locationWeight,
  }
}

function relativeBoundsFromBadgeRead(
  candidate: DeckEntryCandidate,
  read: ReturnType<typeof scoreBadgeWindow>
) {
  return {
    x: (read.bounds.x - candidate.representativeBounds.x) / candidate.representativeBounds.width,
    y: (read.bounds.y - candidate.representativeBounds.y) / candidate.representativeBounds.height,
    width: read.bounds.width / candidate.representativeBounds.width,
    height: read.bounds.height / candidate.representativeBounds.height,
  }
}

function absoluteBoundsFromBadgePattern(
  image: HTMLImageElement,
  candidate: DeckEntryCandidate,
  pattern: BadgePattern,
  xOffset = 0,
  yOffset = 0,
  scale = 1
) {
  const bounds = candidate.representativeBounds
  const width = bounds.width * pattern.relativeBounds.width * scale
  const height = bounds.height * pattern.relativeBounds.height * scale
  const centerX =
    bounds.x +
    bounds.width * (pattern.relativeBounds.x + pattern.relativeBounds.width / 2) +
    bounds.width * xOffset
  const centerY =
    bounds.y +
    bounds.height * (pattern.relativeBounds.y + pattern.relativeBounds.height / 2) +
    bounds.height * yOffset

  return clampBounds(
    {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    },
    image
  )
}

function findBadgeRead(
  image: HTMLImageElement,
  candidate: DeckEntryCandidate,
  badgePattern: BadgePattern | null = null
) {
  const bounds = candidate.representativeBounds
  const sizeFactors = [0.24, 0.28, 0.32, 0.36]
  const zones = [
    { name: 'bottom-middle', x: [0.44, 0.6], y: [0.8, 0.9], target: [0.52, 0.86], weight: 0.08 },
    { name: 'bottom-left', x: [0.18, 0.36], y: [0.78, 0.9], target: [0.28, 0.86], weight: 0.04 },
    { name: 'bottom-right', x: [0.64, 0.82], y: [0.78, 0.9], target: [0.72, 0.86], weight: 0.04 },
    { name: 'top-left', x: [0.16, 0.36], y: [0.1, 0.24], target: [0.26, 0.16], weight: 0.035 },
    { name: 'top-right', x: [0.64, 0.84], y: [0.1, 0.24], target: [0.74, 0.16], weight: 0.035 },
    { name: 'left-edge', x: [0.06, 0.22], y: [0.36, 0.62], target: [0.14, 0.5], weight: 0.025 },
    { name: 'right-edge', x: [0.78, 0.94], y: [0.36, 0.62], target: [0.86, 0.5], weight: 0.025 },
  ] satisfies Array<{
    name: string
    x: [number, number]
    y: [number, number]
    target: [number, number]
    weight: number
  }>
  const anchors = []
  const scoredWindows = []

  if (badgePattern?.relativeBounds) {
    for (const scale of [0.94, 1, 1.08]) {
      for (const yOffset of [-0.012, 0, 0.012]) {
        for (const xOffset of [-0.012, 0, 0.012]) {
          scoredWindows.push(
            scoreBadgeWindow(
              image,
              absoluteBoundsFromBadgePattern(image, candidate, badgePattern, xOffset, yOffset, scale),
              bounds,
              0.14,
              badgePattern.zone,
              'global-pattern'
            )
          )
        }
      }
    }
  }

  for (const zone of zones) {
    const yStep = zone.name === 'bottom-middle' ? 0.025 : 0.04

    for (let y = zone.y[0]; y <= zone.y[1]; y += yStep) {
      for (let x = zone.x[0]; x <= zone.x[1]; x += 0.04) {
        const centerBias =
          1 - Math.min(1, Math.hypot(x - zone.target[0], y - zone.target[1]) / 0.22)

        anchors.push({
          x,
          y,
          zone: zone.name,
          weight: centerBias * zone.weight,
        })
      }
    }
  }

  for (const factor of sizeFactors) {
    const windowWidth = bounds.width * factor
    const windowHeight = windowWidth

    for (const anchor of anchors) {
      scoredWindows.push(
        scoreBadgeWindow(
          image,
          clampBounds(
            {
              x: bounds.x + bounds.width * anchor.x - windowWidth / 2,
              y: bounds.y + bounds.height * anchor.y - windowHeight / 2,
              width: windowWidth,
              height: windowHeight,
            },
            image
          ),
          bounds,
          anchor.weight,
          anchor.zone,
          'zone-search'
        )
      )
    }
  }

  const sortedWindows = scoredWindows.sort((left, right) => right.score - left.score)
  const zoneWindows = sortedWindows.filter((window) => window.source !== 'global-pattern')
  const bestOverall = zoneWindows[0] ?? null
  const bestBottomMiddle =
    zoneWindows.find((window) => window.zone === 'bottom-middle') ?? null
  const bestLocal =
    bestOverall?.zone === 'bottom-middle' ||
    !bestBottomMiddle ||
    ((bestOverall?.digit?.confidence ?? 0) >= 0.72 &&
      bestOverall.score >= bestBottomMiddle.score + 0.18 &&
      (bestBottomMiddle.digit?.confidence ?? 0) < 0.42)
      ? bestOverall
      : bestBottomMiddle
  const bestPattern =
    sortedWindows.find((window) => window.source === 'global-pattern') ?? null
  const shouldUsePattern =
    bestPattern &&
    (!bestLocal ||
      ((bestPattern.digit?.confidence ?? 0) >= 0.72 &&
        bestPattern.score >= bestLocal.score + 0.12 &&
        (bestLocal.digit?.confidence ?? 0) < 0.5))
  const best = shouldUsePattern ? bestPattern : bestLocal

  if (!best) return null

  const rejectedZones = zones
    .map((zone) => {
      const bestInZone = sortedWindows.find((window) => window.zone === zone.name)

      if (!bestInZone || bestInZone === best) return null

      return {
        zone: zone.name,
        confidence: bestInZone.digit?.confidence ?? 0,
        parsedValue: bestInZone.digit?.digit ?? null,
        reason:
          bestInZone.digit?.confidence == null
            ? 'No isolated digit found.'
            : `Lower score than selected ${best.zone}.`,
      }
    })
    .filter(
      (
        zone
      ): zone is {
        zone: string
        confidence: number
        parsedValue: number | null
        reason: string
      } => zone !== null
    )

  return {
    ...best,
    patternApplied: best.source === 'global-pattern',
    rejectedZones,
  }
}

function inferBadgePattern(
  image: HTMLImageElement,
  candidates: RefinedCandidate[]
): BadgePattern | null {
  const reads = candidates
    .map((candidate) => ({
      candidate,
      badgeRead: findBadgeRead(image, candidate),
    }))
    .filter(
      (entry) =>
        entry.badgeRead?.bounds &&
        entry.badgeRead?.digit &&
        (entry.badgeRead.digit.confidence >= 0.4 ||
          entry.badgeRead.digit.digit <= 4)
    )

  if (reads.length < 3) return null

  const byZone = new Map<string, typeof reads>()

  for (const read of reads) {
    const zone = read.badgeRead?.zone

    if (!zone) continue

    const zoneReads = byZone.get(zone) ?? []

    zoneReads.push(read)
    byZone.set(zone, zoneReads)
  }

  const [zone, zoneReads] =
    Array.from(byZone.entries()).sort((left, right) => {
      const countDelta = right[1].length - left[1].length

      if (countDelta !== 0) return countDelta
      if (left[0] === 'bottom-middle') return -1
      if (right[0] === 'bottom-middle') return 1

      return 0
    })[0] ?? []

  if (!zone || !zoneReads || zoneReads.length < Math.max(3, Math.ceil(reads.length * 0.45))) {
    return null
  }

  const relativeBounds = zoneReads.map((read) =>
    relativeBoundsFromBadgeRead(read.candidate, read.badgeRead!)
  )
  const average = (key: keyof BadgePattern['relativeBounds']) =>
    relativeBounds.reduce((total, bounds) => total + bounds[key], 0) /
    relativeBounds.length

  return {
    zone,
    relativeBounds: {
      x: average('x'),
      y: average('y'),
      width: average('width'),
      height: average('height'),
    },
    sampleCount: zoneReads.length,
    candidateCount: candidates.length,
  }
}

function readLegacyDigitalQuantityBadge(
  image: HTMLImageElement,
  candidate: RefinedCandidate,
  badgePattern: BadgePattern | null
) {
  const badgeRead = findBadgeRead(image, candidate, badgePattern)
  const digit = badgeRead?.digit

  if (!badgeRead || !digit) {
    return {
      quantity: 1,
      quantityConfidence: 0,
      quantitySource: 'unknown' as const,
      badgeFound: false,
      failureReason: 'No high-contrast quantity badge candidate found.',
      selectedBadgeZone: null,
      globalBadgePattern: badgePattern,
      globalBadgePatternApplied: false,
      rejectedBadgeZones: [],
      note: 'Quantity badge was not found; quantity defaulted to 1.',
    }
  }

  const implausibleHighSingleDigit =
    digit.digit > 4 && digit.digit < 10 && digit.digitCount === 1 && digit.confidence < 0.9

  if (
    digit.confidence < 0.56 ||
    digit.digit < 1 ||
    digit.digit > 60 ||
    implausibleHighSingleDigit
  ) {
    const redBadgeFour = classifyTcgLiveRedBadgeFour(image, badgeRead.bounds)

    if (redBadgeFour) {
      return {
        quantity: 4,
        quantityConfidence: redBadgeFour.confidence,
        quantitySource: 'digital-badge-second-pass' as const,
        badgeFound: true,
        failureReason: null,
        badgeBounds: badgeRead.bounds,
        badgePreviewDataUrl: cropBoundsToDataUrl(image, badgeRead.bounds),
        selectedBadgeZone: badgeRead.zone,
        globalBadgePattern: badgePattern,
        globalBadgePatternApplied: badgeRead.patternApplied,
        rejectedBadgeZones: badgeRead.rejectedZones,
        note: null,
      }
    }

    const failureReason = `Badge found but digit confidence was too low (${Math.round(
      digit.confidence * 100
    )}%).`

    return {
      quantity: 1,
      quantityConfidence: digit.confidence,
      quantitySource: 'unknown' as const,
      badgeFound: true,
      failureReason,
      badgeBounds: badgeRead.bounds,
      badgePreviewDataUrl: cropBoundsToDataUrl(image, badgeRead.bounds),
      selectedBadgeZone: badgeRead.zone,
      globalBadgePattern: badgePattern,
      globalBadgePatternApplied: badgeRead.patternApplied,
      rejectedBadgeZones: badgeRead.rejectedZones,
      note: `${failureReason} Quantity defaulted to 1.`,
    }
  }

  return {
    quantity: digit.digit,
    quantityConfidence: digit.confidence,
    quantitySource: 'digital-badge' as const,
    badgeFound: true,
    failureReason: null,
    badgeBounds: badgeRead.bounds,
    badgePreviewDataUrl: cropBoundsToDataUrl(image, badgeRead.bounds),
    selectedBadgeZone: badgeRead.zone,
    globalBadgePattern: badgePattern,
    globalBadgePatternApplied: badgeRead.patternApplied,
    rejectedBadgeZones: badgeRead.rejectedZones,
    note: null,
  }
}

function readDigitalQuantityBadge(
  image: HTMLImageElement,
  candidate: RefinedCandidate,
  badgePattern: BadgePattern | null
) {
  const legacy = readLegacyDigitalQuantityBadge(image, candidate, badgePattern)
  if (!legacy.badgeBounds) return legacy

  const template = recognizeBadgeQuantity(image, legacy.badgeBounds)
  const combined = combineQuantityRecognition(template, {
    quantity: legacy.quantity,
    confidence: legacy.quantityConfidence,
    known: legacy.quantitySource !== 'unknown',
  })
  if (!combined) {
    const disagreementNote =
      template.quantity && template.quantity !== legacy.quantity
        ? `Digit-template alternative ${template.quantity} (${Math.round(template.confidence * 100)}%) disagreed with the legacy read.`
        : null
    return {
      ...legacy,
      note: [legacy.note, disagreementNote].filter(Boolean).join(' ') || null,
    }
  }

  return {
    ...legacy,
    quantity: combined.quantity,
    quantityConfidence: combined.confidence,
    quantitySource: combined.source,
    failureReason: null,
    note:
      legacy.quantitySource !== 'unknown' && legacy.quantity !== combined.quantity
        ? `Digit-template read ${combined.quantity} replaced legacy alternative ${legacy.quantity}.`
        : null,
  }
}

async function extractFeatures(
  image: HTMLImageElement,
  sourceBounds?: DeckEntryCandidate['representativeBounds']
): Promise<ImageFeatures> {
  const hashPixels = drawImageToImageData(image, 9, 8, { sourceBounds })
  const histogramPixels = drawImageToImageData(image, 64, 88, {
    sourceBounds,
    fit: sourceBounds ? 'fill' : 'cover',
  })
  const templatePixels = drawImageToImageData(image, 32, 44, { sourceBounds })
  const artPixels = drawImageToImageData(image, 32, 24, {
    sourceBounds: relativeBounds(sourceBounds, image, {
      x: 0.08,
      y: 0.13,
      width: 0.84,
      height: 0.34,
    }),
  })
  const titlePixels = drawImageToImageData(image, 32, 8, {
    sourceBounds: relativeBounds(sourceBounds, image, {
      x: 0.08,
      y: 0.02,
      width: 0.84,
      height: 0.1,
    }),
  })
  const lowerPixels = drawImageToImageData(image, 32, 18, {
    sourceBounds: relativeBounds(sourceBounds, image, {
      x: 0.08,
      y: 0.48,
      width: 0.84,
      height: 0.3,
    }),
  })
  const edgePixels = drawImageToImageData(image, 24, 32, { sourceBounds })

  return {
    perceptualHash: buildDHash(hashPixels.data),
    colorHistogram: buildColorHistogram(histogramPixels.data),
    templateVector: buildTemplateVector(templatePixels.data),
    artTemplateVector: buildTemplateVector(artPixels.data),
    titleTemplateVector: buildTemplateVector(titlePixels.data),
    lowerTemplateVector: buildTemplateVector(lowerPixels.data),
    edgeVector: buildEdgeVector(edgePixels.data, 24, 32),
    futureFeatureMatching: createEmptyFutureFeatureMatching(),
  }
}

async function loadFixtureCardManifest() {
  const response = await fetch(MANIFEST_PATH, { cache: 'force-cache' })

  if (!response.ok) {
    throw new Error('Local fixture card image cache is not available.')
  }

  const manifest = (await response.json()) as FixtureCardImageManifest

  if (!Array.isArray(manifest.cards) || manifest.cards.length === 0) {
    throw new Error('Local fixture card image cache has no cards.')
  }

  return manifest
}

function getLegalityStatus(card: LocalImageMatch): DeckCardLegalityStatus {
  const standardLegality = card.legalities?.standard?.toLowerCase()

  if (standardLegality === 'legal') return 'standard'
  if (standardLegality === 'banned' || standardLegality === 'not legal') {
    return 'not_standard'
  }

  if (card.regulationMark && ['H', 'I', 'J'].includes(card.regulationMark.toUpperCase())) {
    return 'standard'
  }

  return 'unknown'
}

function buildNotes(
  match: LocalImageMatch,
  candidate: RefinedCandidate,
  quantityRead: QuantityReadResult,
  runnerUp?: LocalImageMatch,
  closeMatchDelta?: number
) {
  const notes: string[] = []

  if (match.confidence < LOW_CONFIDENCE_THRESHOLD) {
    notes.push('Low local image-match confidence; confirm this card.')
  }

  if (
    runnerUp &&
    typeof closeMatchDelta === 'number'
  ) {
    notes.push(
      `Multiple likely image matches; next best is ${runnerUp.name} ${runnerUp.setCode} ${runnerUp.cardNumber}.`
    )
  }

  if (
    ['digital-badge', 'digit-template'].includes(quantityRead.quantitySource) &&
    quantityRead.quantityConfidence < SUSPICIOUS_QUANTITY_CONFIDENCE
  ) {
    notes.push(
      `Quantity ${quantityRead.quantity} read has low badge confidence (${Math.round(
        quantityRead.quantityConfidence * 100
      )}%); verify the visible badge.`
    )
  }

  if (candidate.cropQuality.notes.length > 0) {
    notes.push(...candidate.cropQuality.notes)
  }

  if (quantityRead.note) {
    notes.push(quantityRead.note)
  }

  return notes.length > 0 ? notes : undefined
}

function summarizeTopMatches(matches: LocalImageMatch[]): TopCandidateMatch[] {
  return matches.slice(0, 5).map((match) => ({
    name: match.name,
    setCode: match.setCode,
    cardNumber: match.cardNumber,
    confidence: match.confidence,
    scoreComponents: match.scoreComponents,
  }))
}

function createPrintReferenceFromMatch(match: LocalImageMatch): CardPrintReference {
  const sourceSetId = match.imageReferenceId.split('-')[0] ?? match.setCode
  const exactPrintKey = `pokemon-tcg-api:${sourceSetId}:${match.cardNumber}:english:${match.imageReferenceId}`

  return {
    id: match.imageReferenceId,
    englishName: match.name,
    setCode: match.setCode,
    cardNumber: match.cardNumber,
    regulationMark: match.regulationMark,
    category: match.category,
    sourceLanguage: 'english',
    imageUrl: match.imageUrl,
    sourceCardId: match.imageReferenceId,
    sourceSetId,
    englishEquivalentReferenceId: match.imageReferenceId,
    exactPrintKey,
    exactPrintIdentity: {
      source: 'pokemon-tcg-api',
      sourceCardId: match.imageReferenceId,
      setId: sourceSetId,
      collectorNumber: match.cardNumber,
      language: 'english',
    },
    mappingStatus: 'resolved-print',
  }
}

function decorateWithPrintMetadata(
  card: ExtractedDeckCard,
  mode: DeckPrintMode = 'exact-print'
): ExtractedDeckCard {
  const recognizedPrint = card.recognizedPrint ?? {
    id: card.id,
    englishName: card.englishName ?? card.name,
    setCode: card.setCode,
    cardNumber: card.cardNumber,
    regulationMark: card.regulationMark,
    category: card.category,
    sourceLanguage: 'unknown' as const,
    mappingStatus: card.setCode && card.cardNumber ? 'resolved-print' as const : 'unresolved' as const,
  }
  const basePrint = card.basePrint ?? recognizedPrint

  return {
    ...card,
    canonicalCardId:
      card.canonicalCardId ?? `${card.category}:${card.name.trim().toLowerCase()}`,
    englishName: card.englishName ?? card.name,
    recognizedPrint,
    basePrint,
    selectedPrintMode: mode,
    selectedPrint: mode === 'base-print' ? basePrint : recognizedPrint,
    printRecognitionConfidence: card.printRecognitionConfidence ?? card.confidence,
    basePrintResolutionConfidence:
      card.basePrintResolutionConfidence ?? (basePrint ? 0.55 : 0),
  }
}

function isCloseMatch(
  bestMatch: LocalImageMatch | undefined,
  challengers: LocalImageMatch[]
) {
  if (!bestMatch || challengers.length === 0) return false

  const delta =
    bestMatch.category === 'Trainer' || bestMatch.category === 'Energy'
      ? TRAINER_ENERGY_CLOSE_MATCH_DELTA
      : MULTIPLE_MATCH_DELTA

  return challengers.some(
    (match) => bestMatch.confidence - match.confidence <= delta
  )
}

function isBasicEnergyCard(card: Pick<ExtractedDeckCard, 'category' | 'name'>) {
  return card.category === 'Energy' && /^basic\s+.+\s+energy$/i.test(card.name.trim())
}

function quantityValidationWarning(card: Pick<ExtractedDeckCard, 'category' | 'name' | 'quantity'>) {
  if (card.quantity <= 4) return undefined
  if (isBasicEnergyCard(card)) return undefined

  if (card.category === 'Energy') {
    return 'Special Energy cards are normally limited to 4 copies.'
  }

  return `${card.category} cards are normally limited to 4 copies.`
}

function toExtractedCard(
  candidate: RefinedCandidate,
  match: LocalImageMatch,
  index: number,
  quantityRead: QuantityReadResult,
  runnerUp?: LocalImageMatch,
  closeMatchDelta?: number
): ExtractedDeckCard {
  const card: ExtractedDeckCard = {
    id: `local-match-${candidate.id}-${match.imageReferenceId}-${index}`,
    quantity: quantityRead.quantity,
    name: match.name,
    setCode: match.setCode,
    cardNumber: match.cardNumber,
    regulationMark: match.regulationMark,
    category: match.category,
    confidence: match.confidence,
    legalityStatus: getLegalityStatus(match),
    notes: buildNotes(match, candidate, quantityRead, runnerUp, closeMatchDelta),
  }
  const recognizedPrint = createPrintReferenceFromMatch(match)
  const basePrintResult = resolveBasePrintForRecognizedCard(
    {
      canonicalCardId: `${match.category}:${match.name.trim().toLowerCase()}`,
      englishName: match.name,
      category: match.category,
      recognizedPrint,
    },
    [recognizedPrint]
  )
  const basePrint = basePrintResult.selectedPrint ?? recognizedPrint
  const warning = quantityValidationWarning(card)

  return decorateWithPrintMetadata({
    ...card,
    canonicalCardId: `${match.category}:${match.name.trim().toLowerCase()}`,
    englishName: match.name,
    recognizedPrint,
    basePrint,
    selectedPrintMode: 'exact-print',
    selectedPrint: recognizedPrint,
    printRecognitionConfidence: match.confidence,
    basePrintResolutionConfidence: basePrintResult.confidence,
    quantityValidationWarning: warning,
    notes: warning
      ? Array.from(new Set([...(card.notes ?? []), warning]))
      : card.notes,
  })
}

function toUnresolvedCard(
  candidate: RefinedCandidate,
  index: number,
  quantityRead: QuantityReadResult,
  notes: string[]
): ExtractedDeckCard {
  return decorateWithPrintMetadata({
    id: `unresolved-${candidate.id}-${index}`,
    quantity: quantityRead.quantity,
    name: `Unresolved crop ${index + 1}`,
    setCode: '',
    cardNumber: '',
    category: 'Pokemon',
    confidence: 0,
    legalityStatus: 'unknown',
    notes: Array.from(new Set(['Manual review needed for this crop.', ...notes])),
  })
}

function normalizeMergeKey(value: string) {
  return value.trim().toLowerCase()
}

function combineLegalityStatus(
  left: DeckCardLegalityStatus,
  right: DeckCardLegalityStatus
): DeckCardLegalityStatus {
  if (left === 'not_standard' || right === 'not_standard') return 'not_standard'
  if (left === 'unknown' || right === 'unknown') return 'unknown'

  return 'standard'
}

function consolidateRecognizedCards(cards: ExtractedDeckCard[]) {
  const merged = new Map<string, ExtractedDeckCard>()
  const sourceToFinalId = new Map<string, string>()
  const mergedSourceIds = new Set<string>()

  for (const card of cards) {
    const key = [
      normalizeMergeKey(card.name),
      normalizeMergeKey(card.setCode),
      normalizeMergeKey(card.cardNumber),
      card.category,
    ].join('|')
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, {
        ...card,
        notes: card.notes ? [...card.notes] : undefined,
      })
      sourceToFinalId.set(card.id, card.id)
      continue
    }

    const notes = Array.from(
      new Set([...(existing.notes ?? []), ...(card.notes ?? [])])
    )

    merged.set(key, {
      ...existing,
      id: existing.id,
      quantity: existing.quantity + card.quantity,
      confidence: Math.max(existing.confidence, card.confidence),
      legalityStatus: combineLegalityStatus(
        existing.legalityStatus,
        card.legalityStatus
      ),
      notes: notes.length > 0 ? notes : undefined,
    })
    sourceToFinalId.set(card.id, existing.id)
    mergedSourceIds.add(card.id)
  }

  return {
    cards: Array.from(merged.values()),
    sourceToFinalId,
    mergedSourceIds,
  }
}

async function buildReferenceIndex(manifest: FixtureCardImageManifest) {
  const indexedCards = []

  for (const card of manifest.cards) {
    const image = await loadImage(card.publicImagePath ?? card.imageUrl)
    const features = await extractFeatures(image)

    indexedCards.push({
      card,
      features,
    })
  }

  return indexedCards
}

function findTopMatches(
  candidateFeatures: ImageFeatures,
  referenceIndex: Awaited<ReturnType<typeof buildReferenceIndex>>
): LocalImageMatch[] {
  return referenceIndex
    .map(({ card, features }) => {
      const score = scoreImageFeatures(candidateFeatures, features)

      return {
        name: card.name,
        setCode: card.setCode,
        cardNumber: card.cardNumber,
        regulationMark: card.regulationMark,
        category: card.category,
        confidence: score.confidence,
        imageReferenceId: card.id,
        imageUrl: card.imageUrl,
        scoreComponents: score.components,
        legalities: card.legalities,
      }
    })
    .sort((left, right) => right.confidence - left.confidence)
}

export async function recognizeUploadedDeckImageLocally(
  imageUrl: string
): Promise<BrowserDeckImageRecognitionResult> {
  const [uploadedImage, manifest] = await Promise.all([
    loadImage(imageUrl),
    loadFixtureCardManifest(),
  ])
  const candidates = await detectDeckEntryCandidates(uploadedImage)
  const refinedCandidates = candidates.map((candidate) =>
    refineCandidateCrop(candidate, uploadedImage)
  )
  const badgePattern = inferBadgePattern(uploadedImage, refinedCandidates)
  const referenceIndex = await buildReferenceIndex(manifest)
  const cards: ExtractedDeckCard[] = []
  const debugMatches: BrowserDeckImageRecognitionResult['debugMatches'] = []
  let unknownQuantityCount = 0
  let rejectedCropCount = 0
  let matchedCount = 0
  let unresolvedCount = 0
  const warnings: string[] = [
    'Experimental local matcher uses fixture-subset reference images only.',
  ]

  for (const [index, candidate] of refinedCandidates.entries()) {
    const quantityRead = readDigitalQuantityBadge(uploadedImage, candidate, badgePattern)
    const candidateNotes = [
      ...candidate.cropQuality.notes,
      ...(quantityRead.note ? [quantityRead.note] : []),
    ]

    if (quantityRead.quantitySource === 'unknown') {
      unknownQuantityCount += 1
    }

    if (candidate.cropQuality.rejected) {
      rejectedCropCount += 1
      unresolvedCount += 1
      const unresolvedCard = toUnresolvedCard(candidate, index, quantityRead, [
        'Rejected before matching.',
        ...candidateNotes,
      ])
      cards.push(unresolvedCard)
      debugMatches.push({
        candidateId: candidate.id,
        status: 'rejected',
        topCandidateMatches: [],
        closeMatch: false,
        quantity: quantityRead.quantity,
        quantityConfidence: quantityRead.quantityConfidence,
        quantitySource: quantityRead.quantitySource,
        quantityDiagnostics: {
          badgeFound: quantityRead.badgeFound,
          badgeBounds: quantityRead.badgeBounds,
          parsedValue: quantityRead.quantity,
          confidence: quantityRead.quantityConfidence,
          failureReason: quantityRead.failureReason,
          selectedBadgeZone: quantityRead.selectedBadgeZone,
          globalBadgePattern: quantityRead.globalBadgePattern,
          globalBadgePatternApplied: quantityRead.globalBadgePatternApplied,
          rejectedBadgeZones: quantityRead.rejectedBadgeZones,
        },
        badgeBounds: quantityRead.badgeBounds,
        badgePreviewDataUrl: quantityRead.badgePreviewDataUrl,
        reviewRowId: unresolvedCard.id,
        notes: ['Rejected before matching.', ...candidateNotes],
      })
      continue
    }

    const features = await extractFeatures(uploadedImage, candidate.representativeBounds)
    const topMatches = findTopMatches(features, referenceIndex)
    const bestMatch = topMatches[0]
    const runnerUp = topMatches[1]
    const closeChallenger = topMatches
      .slice(1, 3)
      .sort(
        (left, right) =>
          Math.abs((bestMatch?.confidence ?? 0) - left.confidence) -
          Math.abs((bestMatch?.confidence ?? 0) - right.confidence)
      )[0]
    const topCandidateMatches = summarizeTopMatches(topMatches)
    const closeMatch = isCloseMatch(bestMatch, topMatches.slice(1, 3))
    const closeMatchDelta =
      bestMatch && closeChallenger
        ? Number((bestMatch.confidence - closeChallenger.confidence).toFixed(4))
        : undefined

    if (!bestMatch) {
      unresolvedCount += 1
      const unresolvedCard = toUnresolvedCard(candidate, index, quantityRead, [
        'No local image match found.',
        ...candidateNotes,
      ])
      cards.push(unresolvedCard)
      debugMatches.push({
        candidateId: candidate.id,
        status: 'unresolved',
        topCandidateMatches,
        closeMatch: false,
        quantity: quantityRead.quantity,
        quantityConfidence: quantityRead.quantityConfidence,
        quantitySource: quantityRead.quantitySource,
        quantityDiagnostics: {
          badgeFound: quantityRead.badgeFound,
          badgeBounds: quantityRead.badgeBounds,
          parsedValue: quantityRead.quantity,
          confidence: quantityRead.quantityConfidence,
          failureReason: quantityRead.failureReason,
          selectedBadgeZone: quantityRead.selectedBadgeZone,
          globalBadgePattern: quantityRead.globalBadgePattern,
          globalBadgePatternApplied: quantityRead.globalBadgePatternApplied,
          rejectedBadgeZones: quantityRead.rejectedBadgeZones,
        },
        badgeBounds: quantityRead.badgeBounds,
        badgePreviewDataUrl: quantityRead.badgePreviewDataUrl,
        reviewRowId: unresolvedCard.id,
        notes: ['No local image match found.', ...candidateNotes],
      })
      continue
    }

    if (bestMatch.confidence < LOW_CONFIDENCE_THRESHOLD || closeMatch) {
      matchedCount += 1
      const lowConfidenceCard = toExtractedCard(
        candidate,
        bestMatch,
        index,
        quantityRead,
        closeChallenger ?? runnerUp,
        closeMatch ? closeMatchDelta : undefined
      )
      cards.push(lowConfidenceCard)
      debugMatches.push({
        candidateId: candidate.id,
        status: 'low-confidence',
        topMatch: `${bestMatch.name} ${bestMatch.setCode} ${bestMatch.cardNumber}`,
        topCandidateMatches,
        closeMatch,
        closeMatchDelta,
        confidence: bestMatch.confidence,
        threshold: LOW_CONFIDENCE_THRESHOLD,
        quantity: quantityRead.quantity,
        quantityConfidence: quantityRead.quantityConfidence,
        quantitySource: quantityRead.quantitySource,
        quantityDiagnostics: {
          badgeFound: quantityRead.badgeFound,
          badgeBounds: quantityRead.badgeBounds,
          parsedValue: quantityRead.quantity,
          confidence: quantityRead.quantityConfidence,
          failureReason: quantityRead.failureReason,
          selectedBadgeZone: quantityRead.selectedBadgeZone,
          globalBadgePattern: quantityRead.globalBadgePattern,
          globalBadgePatternApplied: quantityRead.globalBadgePatternApplied,
          rejectedBadgeZones: quantityRead.rejectedBadgeZones,
        },
        badgeBounds: quantityRead.badgeBounds,
        badgePreviewDataUrl: quantityRead.badgePreviewDataUrl,
        reviewRowId: lowConfidenceCard.id,
        notes: [
          closeMatch
            ? `Close match delta ${closeMatchDelta}; manual review required.`
            : `Low-confidence match ignored below threshold ${LOW_CONFIDENCE_THRESHOLD}.`,
          ...candidateNotes,
        ],
      })
      continue
    }

    matchedCount += 1
    const matchedCard = toExtractedCard(
      candidate,
      bestMatch,
      index,
      quantityRead,
      closeChallenger ?? runnerUp,
      closeMatch ? closeMatchDelta : undefined
    )
    cards.push(matchedCard)
    debugMatches.push({
      candidateId: candidate.id,
      status: 'matched',
      topMatch: `${bestMatch.name} ${bestMatch.setCode} ${bestMatch.cardNumber}`,
      topCandidateMatches,
      closeMatch,
      closeMatchDelta,
      confidence: bestMatch.confidence,
      threshold: LOW_CONFIDENCE_THRESHOLD,
      quantity: quantityRead.quantity,
      quantityConfidence: quantityRead.quantityConfidence,
      quantitySource: quantityRead.quantitySource,
      quantityDiagnostics: {
        badgeFound: quantityRead.badgeFound,
        badgeBounds: quantityRead.badgeBounds,
        parsedValue: quantityRead.quantity,
        confidence: quantityRead.quantityConfidence,
        failureReason: quantityRead.failureReason,
        selectedBadgeZone: quantityRead.selectedBadgeZone,
        globalBadgePattern: quantityRead.globalBadgePattern,
        globalBadgePatternApplied: quantityRead.globalBadgePatternApplied,
        rejectedBadgeZones: quantityRead.rejectedBadgeZones,
      },
      badgeBounds: quantityRead.badgeBounds,
      badgePreviewDataUrl: quantityRead.badgePreviewDataUrl,
      reviewRowId: matchedCard.id,
      notes: candidateNotes,
    })
  }

  if (cards.length === 0) {
    warnings.push('No local image matches were produced.')
  }
  const consolidated = consolidateRecognizedCards(cards)
  const consolidatedCards = consolidated.cards
  const mergedCount = consolidated.mergedSourceIds.size
  const finalDebugMatches = debugMatches.map((entry) => {
    if (!entry.reviewRowId) return entry

    const finalId = consolidated.sourceToFinalId.get(entry.reviewRowId)

    if (!finalId || finalId === entry.reviewRowId) return entry

    const mergedInto = debugMatches.find(
      (candidate) => candidate.reviewRowId === finalId
    )

    return {
      ...entry,
      status: 'merged' as const,
      mergedIntoCandidateId: mergedInto?.candidateId,
      reviewRowId: finalId,
      notes: [
        ...entry.notes,
        `Merged into review row from ${mergedInto?.candidateId ?? finalId}.`,
      ],
    }
  })

  return {
    cards: consolidatedCards,
    candidateCount: candidates.length,
    matchedCount,
    unresolvedCount,
    estimatedTotalQuantity: consolidatedCards.reduce(
      (total, card) => total + card.quantity,
      0
    ),
    unknownQuantityCount,
    rejectedCropCount,
    mergedCount,
    finalReviewRowCount: consolidatedCards.length,
    globalBadgePattern: badgePattern,
    debugMatches: finalDebugMatches,
    warnings,
  }
}
