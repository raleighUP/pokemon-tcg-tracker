import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  chooseCombinedQuantity,
  recognizeQuantityFromBadge,
  writeQuantityRecognitionArtifacts,
} from './lib/quantity-recognition.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const imagePathArgument = process.argv[2]
const strategyArgument = process.argv.includes('--strategy')
  ? process.argv[process.argv.indexOf('--strategy') + 1]
  : 'auto'
const DEFAULT_OUTPUT_ROOT = path.join(repoRoot, 'debug-output', 'card-frame-detection')
const QUANTITY_OUTPUT_ROOT = path.join(repoRoot, 'debug-output', 'quantity-recognition')
const PROCESSING_MAX_WIDTH = 1200
const CARD_ASPECT_RATIO = 63 / 88
const validStrategies = new Set(['auto', 'digital', 'physical'])

function printUsage() {
  console.log('Usage: node scripts/prototype-card-frame-detection.mjs <image-path> [--strategy auto|digital|physical]')
  console.log('')
  console.log('Example:')
  console.log('  node scripts/prototype-card-frame-detection.mjs test-data/deck-image-importer/aob/digital.png')
  console.log('  node scripts/prototype-card-frame-detection.mjs test-data/deck-image-importer/aob/physical.jfif --strategy physical')
}

function resolveImagePath(imagePath) {
  return path.isAbsolute(imagePath)
    ? imagePath
    : path.resolve(repoRoot, imagePath)
}

function getOutputPaths(imagePath, outputRoot = DEFAULT_OUTPUT_ROOT) {
  const relativePath = path.relative(repoRoot, imagePath)
  const parsedPath = path.parse(relativePath)
  const parentName = path.basename(parsedPath.dir)
  const outputSlug = [parentName, parsedPath.name]
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9_-]/gi, '-')
    .toLowerCase()
  const outputDir = path.join(outputRoot, outputSlug)

  return {
    outputDir,
    overlayOutputPath: path.join(outputDir, 'overlay.png'),
    cropsOutputDir: path.join(outputDir, 'crops'),
    badgesOutputDir: path.join(outputDir, 'badges'),
    reportOutputPath: path.join(outputDir, 'report.json'),
  }
}

function resolveStrategy(requestedStrategy, imagePath) {
  const strategy = requestedStrategy ?? 'auto'

  if (!validStrategies.has(strategy)) {
    throw new Error(`Unknown strategy "${strategy}". Use auto, digital, or physical.`)
  }

  if (strategy !== 'auto') return strategy

  const fileName = path.basename(imagePath).toLowerCase()

  if (fileName.startsWith('digital')) return 'digital'
  if (fileName.startsWith('physical')) return 'physical'

  return 'physical'
}

async function loadSharp() {
  try {
    const sharpModule = await import('sharp')

    return sharpModule.default
  } catch {
    throw new Error(
      'Missing image processing dependency: sharp. Install with: npm install --save-dev sharp. This prototype needs sharp for local pixel analysis, overlay rendering, and crop export.'
    )
  }
}

async function loadImage(sharp, imagePath) {
  const metadata = await sharp(imagePath).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0

  if (width <= 0 || height <= 0) {
    throw new Error(`Unable to read image dimensions for ${imagePath}`)
  }

  const processingWidth = Math.min(PROCESSING_MAX_WIDTH, width)
  const processingScale = processingWidth / width
  const processingHeight = Math.round(height * processingScale)
  const { data } = await sharp(imagePath)
    .rotate()
    .resize({ width: processingWidth, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return {
    original: { width, height },
    processing: {
      data,
      width: processingWidth,
      height: processingHeight,
      scale: processingScale,
    },
  }
}

function toGrayscale(rgb, width, height) {
  const gray = new Uint8Array(width * height)

  for (let index = 0; index < gray.length; index += 1) {
    const sourceIndex = index * 3
    const red = rgb[sourceIndex] ?? 0
    const green = rgb[sourceIndex + 1] ?? 0
    const blue = rgb[sourceIndex + 2] ?? 0
    gray[index] = Math.round(red * 0.299 + green * 0.587 + blue * 0.114)
  }

  return gray
}

function percentile(values, percent) {
  const histogram = new Uint32Array(256)

  for (const value of values) {
    histogram[Math.max(0, Math.min(255, value))] += 1
  }

  const target = Math.floor(values.length * percent)
  let seen = 0

  for (let value = 0; value < histogram.length; value += 1) {
    seen += histogram[value]

    if (seen >= target) {
      return value
    }
  }

  return 255
}

function normalizeContrast(gray) {
  const low = percentile(gray, 0.04)
  const high = percentile(gray, 0.96)
  const range = Math.max(1, high - low)
  const normalized = new Uint8Array(gray.length)

  for (let index = 0; index < gray.length; index += 1) {
    const value = ((gray[index] - low) / range) * 255
    normalized[index] = Math.max(0, Math.min(255, Math.round(value)))
  }

  return normalized
}

function sobelMagnitude(gray, width, height) {
  const magnitude = new Uint8Array(width * height)

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const topLeft = gray[(y - 1) * width + x - 1]
      const top = gray[(y - 1) * width + x]
      const topRight = gray[(y - 1) * width + x + 1]
      const left = gray[y * width + x - 1]
      const right = gray[y * width + x + 1]
      const bottomLeft = gray[(y + 1) * width + x - 1]
      const bottom = gray[(y + 1) * width + x]
      const bottomRight = gray[(y + 1) * width + x + 1]

      const gx = -topLeft - 2 * left - bottomLeft + topRight + 2 * right + bottomRight
      const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight
      magnitude[y * width + x] = Math.min(255, Math.round((Math.abs(gx) + Math.abs(gy)) / 4))
    }
  }

  return magnitude
}

function thresholdEdges(magnitude) {
  const dynamicThreshold = Math.max(32, percentile(magnitude, 0.88))
  const mask = new Uint8Array(magnitude.length)

  for (let index = 0; index < magnitude.length; index += 1) {
    mask[index] = magnitude[index] >= dynamicThreshold ? 1 : 0
  }

  return mask
}

function dilate(mask, width, height, radius) {
  const output = new Uint8Array(mask.length)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let found = false

      for (let dy = -radius; dy <= radius && !found; dy += 1) {
        const ny = y + dy

        if (ny < 0 || ny >= height) {
          continue
        }

        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx

          if (nx >= 0 && nx < width && mask[ny * width + nx]) {
            output[y * width + x] = 1
            found = true
            break
          }
        }
      }
    }
  }

  return output
}

function erode(mask, width, height, radius) {
  const output = new Uint8Array(mask.length)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let allFound = true

      for (let dy = -radius; dy <= radius && allFound; dy += 1) {
        const ny = y + dy

        if (ny < 0 || ny >= height) {
          allFound = false
          break
        }

        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx

          if (nx < 0 || nx >= width || !mask[ny * width + nx]) {
            allFound = false
            break
          }
        }
      }

      output[y * width + x] = allFound ? 1 : 0
    }
  }

  return output
}

function closeEdges(mask, width, height) {
  const dilated = dilate(mask, width, height, 2)

  return erode(dilated, width, height, 1)
}

function closeTileMask(mask, width, height) {
  return dilate(mask, width, height, 1)
}

function findConnectedComponents(mask, width, height) {
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const components = []

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue
    }

    let head = 0
    let tail = 0
    let pixels = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0

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
        if (neighbor < 0 || neighbor >= mask.length || visited[neighbor] || !mask[neighbor]) {
          continue
        }

        const neighborX = neighbor % width

        if (Math.abs(neighborX - x) > 1) {
          continue
        }

        visited[neighbor] = 1
        queue[tail] = neighbor
        tail += 1
      }
    }

    components.push({
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixels,
    })
  }

  return components
}

function scoreCandidate(component, imageWidth, imageHeight) {
  const area = component.width * component.height
  const imageArea = imageWidth * imageHeight
  const areaRatio = area / imageArea
  const aspectRatio = component.width / component.height
  const portraitDifference = Math.abs(aspectRatio - CARD_ASPECT_RATIO)
  const landscapeDifference = Math.abs(1 / aspectRatio - CARD_ASPECT_RATIO)
  const aspectDifference = Math.min(portraitDifference, landscapeDifference)
  const aspectScore = Math.max(0, 1 - aspectDifference / 0.35)
  const minArea = 0.0025
  const maxArea = 0.45

  if (
    component.width < 42 ||
    component.height < 58 ||
    areaRatio < minArea ||
    areaRatio > maxArea ||
    aspectScore <= 0
  ) {
    return 0
  }

  const density = component.pixels / area
  const densityScore = Math.max(0, 1 - Math.abs(density - 0.28) / 0.28)
  const sizeScore = Math.min(1, Math.max(0.2, areaRatio / 0.035))

  return Number((aspectScore * 0.6 + densityScore * 0.2 + sizeScore * 0.2).toFixed(3))
}

function intersectionOverUnion(a, b) {
  const left = Math.max(a.x, b.x)
  const top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top)

  if (intersection === 0) {
    return 0
  }

  const areaA = a.width * a.height
  const areaB = b.width * b.height

  return intersection / (areaA + areaB - intersection)
}

function mergeDuplicateCandidates(candidates) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  const merged = []

  for (const candidate of sorted) {
    const duplicate = merged.some((existing) => intersectionOverUnion(existing, candidate) > 0.45)

    if (!duplicate) {
      merged.push(candidate)
    }
  }

  return merged.sort((a, b) => a.y - b.y || a.x - b.x)
}

function mean(values) {
  if (values.length === 0) return 0

  return values.reduce((total, value) => total + value, 0) / values.length
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

function createIntegral(values, width, height) {
  const integral = new Float64Array((width + 1) * (height + 1))

  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0

    for (let x = 1; x <= width; x += 1) {
      rowSum += values[(y - 1) * width + (x - 1)] ?? 0
      integral[y * (width + 1) + x] =
        integral[(y - 1) * (width + 1) + x] + rowSum
    }
  }

  return integral
}

function integralSum(integral, width, height, bounds) {
  const x1 = Math.max(0, Math.min(width, Math.round(bounds.x)))
  const y1 = Math.max(0, Math.min(height, Math.round(bounds.y)))
  const x2 = Math.max(x1, Math.min(width, Math.round(bounds.x + bounds.width)))
  const y2 = Math.max(y1, Math.min(height, Math.round(bounds.y + bounds.height)))
  const stride = width + 1

  return (
    integral[y2 * stride + x2] -
    integral[y1 * stride + x2] -
    integral[y2 * stride + x1] +
    integral[y1 * stride + x1]
  )
}

function rectStats(integrals, width, height, bounds) {
  const x = Math.max(0, Math.min(width, Math.round(bounds.x)))
  const y = Math.max(0, Math.min(height, Math.round(bounds.y)))
  const right = Math.max(x, Math.min(width, Math.round(bounds.x + bounds.width)))
  const bottom = Math.max(y, Math.min(height, Math.round(bounds.y + bounds.height)))
  const area = Math.max(1, (right - x) * (bottom - y))
  const graySum = integralSum(integrals.gray, width, height, { x, y, width: right - x, height: bottom - y })
  const graySquareSum = integralSum(integrals.graySquare, width, height, { x, y, width: right - x, height: bottom - y })
  const edgeSum = integralSum(integrals.edge, width, height, { x, y, width: right - x, height: bottom - y })
  const grayMean = graySum / area
  const variance = Math.max(0, graySquareSum / area - grayMean * grayMean)

  return {
    area,
    grayMean,
    variance,
    edgeMean: edgeSum / area,
  }
}

function smoothProjection(values, radius) {
  const smoothed = new Float64Array(values.length)

  for (let index = 0; index < values.length; index += 1) {
    let total = 0
    let count = 0

    for (let offset = -radius; offset <= radius; offset += 1) {
      const next = index + offset

      if (next < 0 || next >= values.length) continue
      total += values[next]
      count += 1
    }

    smoothed[index] = total / Math.max(1, count)
  }

  return smoothed
}

function estimateBackgroundColor(rgb, width, height) {
  const sampleSize = Math.max(24, Math.round(Math.min(width, height) * 0.08))
  const red = []
  const green = []
  const blue = []
  const samplePixel = (x, y) => {
    const index = (y * width + x) * 3
    red.push(rgb[index] ?? 0)
    green.push(rgb[index + 1] ?? 0)
    blue.push(rgb[index + 2] ?? 0)
  }

  for (let y = 0; y < sampleSize; y += 2) {
    for (let x = 0; x < sampleSize; x += 2) {
      samplePixel(x, y)
      samplePixel(width - 1 - x, y)
      samplePixel(x, height - 1 - y)
      samplePixel(width - 1 - x, height - 1 - y)
    }
  }

  return {
    red: median(red),
    green: median(green),
    blue: median(blue),
  }
}

function createDigitalForegroundMask(rgb, width, height) {
  const background = estimateBackgroundColor(rgb, width, height)
  const mask = new Uint8Array(width * height)

  for (let index = 0; index < mask.length; index += 1) {
    const sourceIndex = index * 3
    const red = rgb[sourceIndex] ?? 0
    const green = rgb[sourceIndex + 1] ?? 0
    const blue = rgb[sourceIndex + 2] ?? 0
    const brightness = (red + green + blue) / 3
    const max = Math.max(red, green, blue)
    const min = Math.min(red, green, blue)
    const chroma = max - min
    const distance = Math.hypot(
      red - background.red,
      green - background.green,
      blue - background.blue
    )

    mask[index] =
      distance > 28 && (brightness > 34 || chroma > 24)
        ? 1
        : 0
  }

  return closeTileMask(mask, width, height)
}

function scoreDigitalTile(component, imageWidth, imageHeight) {
  const area = component.width * component.height
  const imageArea = imageWidth * imageHeight
  const areaRatio = area / imageArea
  const aspectRatio = component.width / component.height
  const aspectDifference = Math.abs(aspectRatio - CARD_ASPECT_RATIO)
  const aspectScore = Math.max(0, 1 - aspectDifference / 0.28)
  const density = component.pixels / area
  const densityScore = Math.min(1, Math.max(0, density / 0.32))

  if (
    component.width < imageWidth * 0.055 ||
    component.height < imageHeight * 0.14 ||
    areaRatio < 0.008 ||
    areaRatio > 0.08 ||
    aspectScore <= 0
  ) {
    return 0
  }

  return Number((aspectScore * 0.72 + densityScore * 0.28).toFixed(3))
}

function refineDigitalTileCandidate(component, imageWidth, imageHeight) {
  const targetHeightFromWidth = component.width / CARD_ASPECT_RATIO
  const targetWidthFromHeight = component.height * CARD_ASPECT_RATIO
  let x = component.x
  let y = component.y
  let width = component.width
  let height = component.height

  if (targetHeightFromWidth > height) {
    const growth = targetHeightFromWidth - height
    y -= growth / 2
    height = targetHeightFromWidth
  } else if (targetWidthFromHeight > width) {
    const growth = targetWidthFromHeight - width
    x -= growth / 2
    width = targetWidthFromHeight
  }

  const padding = Math.round(Math.min(width, height) * 0.035)
  x = Math.max(0, Math.round(x) - padding)
  y = Math.max(0, Math.round(y) - padding)
  width = Math.min(imageWidth - x, Math.round(width) + padding * 2)
  height = Math.min(imageHeight - y, Math.round(height) + padding * 2)

  return {
    ...component,
    x,
    y,
    width,
    height,
  }
}

function buildEdgeProjections(magnitude, width, height) {
  const vertical = new Float64Array(width)
  const horizontal = new Float64Array(height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = magnitude[y * width + x] ?? 0

      vertical[x] += value
      horizontal[y] += value
    }
  }

  return {
    vertical: Array.from(vertical, (value) => value / height),
    horizontal: Array.from(horizontal, (value) => value / width),
  }
}

function scoreProjectionLine(projection, position, radius) {
  const center = Math.round(position)
  let total = 0
  let count = 0

  for (let offset = -radius; offset <= radius; offset += 1) {
    const index = center + offset

    if (index < 0 || index >= projection.length) continue
    total += projection[index]
    count += 1
  }

  return total / Math.max(1, count)
}

function repeatedAxisHypotheses({
  projection,
  imageSize,
  tileSize,
  pitchFactors,
  lineRadius,
  axis,
}) {
  const hypotheses = []
  const projectionMean = mean(projection)
  const projectionHigh = percentile(Uint8Array.from(projection.map((value) => Math.max(0, Math.min(255, Math.round(value))))), 0.92)

  for (const pitchFactor of pitchFactors) {
    const pitch = tileSize * pitchFactor

    if (pitch <= tileSize || pitch > imageSize * 0.7) continue

    const offsetStep = Math.max(3, Math.round(pitch / 24))
    const maxOffset = Math.min(pitch, imageSize - tileSize)

    for (let offset = 0; offset <= maxOffset; offset += offsetStep) {
      const starts = []

      for (let position = offset; position + tileSize <= imageSize; position += pitch) {
        starts.push(position)
      }

      if (starts.length < 2) continue

      const lineScores = starts.flatMap((start) => [
        scoreProjectionLine(projection, start, lineRadius),
        scoreProjectionLine(projection, start + tileSize, lineRadius),
      ])
      const averageLineScore = mean(lineScores)
      const normalizedLineScore =
        averageLineScore / Math.max(1, projectionHigh || projectionMean || 1)
      const spacingScore = Math.max(0, 1 - Math.abs(pitchFactor - 1.08) / 0.24)
      const coverage = (starts.at(-1) + tileSize - starts[0]) / imageSize
      const countScore = Math.min(1, starts.length / (axis === 'x' ? 5 : 4))

      hypotheses.push({
        axis,
        offset,
        tileSize,
        pitch,
        pitchFactor,
        starts,
        count: starts.length,
        score:
          Math.min(1.4, normalizedLineScore) * 0.54 +
          spacingScore * 0.2 +
          Math.min(1, coverage) * 0.16 +
          countScore * 0.1,
      })
    }
  }

  return hypotheses
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
}

function tileContentScore(integrals, imageWidth, imageHeight, bounds) {
  const inside = rectStats(integrals, imageWidth, imageHeight, bounds)
  const pad = Math.max(4, Math.round(Math.min(bounds.width, bounds.height) * 0.08))
  const outer = rectStats(integrals, imageWidth, imageHeight, {
    x: bounds.x - pad,
    y: bounds.y - pad,
    width: bounds.width + pad * 2,
    height: bounds.height + pad * 2,
  })
  const borderThickness = Math.max(2, Math.round(Math.min(bounds.width, bounds.height) * 0.035))
  const borderRects = [
    { x: bounds.x, y: bounds.y, width: bounds.width, height: borderThickness },
    { x: bounds.x, y: bounds.y + bounds.height - borderThickness, width: bounds.width, height: borderThickness },
    { x: bounds.x, y: bounds.y, width: borderThickness, height: bounds.height },
    { x: bounds.x + bounds.width - borderThickness, y: bounds.y, width: borderThickness, height: bounds.height },
  ]
  const borderEdge = mean(
    borderRects.map((rect) => rectStats(integrals, imageWidth, imageHeight, rect).edgeMean)
  )
  const varianceScore = Math.min(1, inside.variance / 2300)
  const edgeScore = Math.min(1, inside.edgeMean / 26)
  const borderScore = Math.min(1, borderEdge / 42)
  const contrastScore = Math.min(1, Math.abs(inside.grayMean - outer.grayMean) / 42)

  return {
    score:
      varianceScore * 0.36 +
      edgeScore * 0.3 +
      borderScore * 0.24 +
      contrastScore * 0.1,
    variance: inside.variance,
    edgeMean: inside.edgeMean,
    borderEdge,
    contrast: Math.abs(inside.grayMean - outer.grayMean),
  }
}

function horizontalEdgeBandScore(magnitude, imageWidth, imageHeight, x, y, width) {
  const centerY = Math.round(y)
  const left = Math.max(0, Math.round(x + width * 0.08))
  const right = Math.min(imageWidth, Math.round(x + width * 0.92))
  let total = 0
  let count = 0

  for (let yy = centerY - 2; yy <= centerY + 2; yy += 1) {
    if (yy < 0 || yy >= imageHeight) continue

    for (let xx = left; xx < right; xx += 1) {
      total += magnitude[yy * imageWidth + xx] ?? 0
      count += 1
    }
  }

  return total / Math.max(1, count)
}

function refineRepeatedGridCellBounds(cell, magnitude, imageWidth, imageHeight) {
  const searchTop = Math.max(0, cell.y - cell.height * 0.85)
  const searchBottom = Math.min(imageHeight - cell.height, cell.y + cell.height * 0.18)
  const step = Math.max(2, Math.round(cell.height / 90))
  const candidates = []

  for (let y = searchTop; y <= searchBottom; y += step) {
    const topEdge = horizontalEdgeBandScore(
      magnitude,
      imageWidth,
      imageHeight,
      cell.x,
      y,
      cell.width
    )
    const bottomEdge = horizontalEdgeBandScore(
      magnitude,
      imageWidth,
      imageHeight,
      cell.x,
      y + cell.height,
      cell.width
    )
    const nearCoarseScore = Math.max(
      0,
      1 - Math.abs(y - cell.y) / Math.max(1, cell.height * 0.85)
    )

    candidates.push({
      y,
      topEdge,
      bottomEdge,
      score: topEdge + bottomEdge + nearCoarseScore * 7,
    })
  }

  const best = candidates.sort((left, right) => right.score - left.score)[0]
  const confidence = best
    ? Math.min(1, (best.topEdge + best.bottomEdge) / 72)
    : 0

  if (!best || confidence < 0.42) {
    return {
      ...cell,
      coarseBounds: {
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height,
      },
      refinedBounds: {
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height,
      },
      refinementConfidence: 0,
      refinementReason: 'No stronger local frame edges found.',
    }
  }

  return {
    ...cell,
    y: best.y,
    coarseBounds: {
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
    },
    refinedBounds: {
      x: cell.x,
      y: best.y,
      width: cell.width,
      height: cell.height,
    },
    refinementConfidence: Number(confidence.toFixed(3)),
    refinementReason:
      Math.abs(best.y - cell.y) > step
        ? 'Adjusted to stronger local top/bottom card-frame edges.'
        : 'Coarse bounds already aligned with local frame edges.',
  }
}

function keepRepeatedGridCellBounds(cell, reason) {
  const bounds = {
    x: cell.x,
    y: cell.y,
    width: cell.width,
    height: cell.height,
  }

  return {
    ...cell,
    coarseBounds: bounds,
    refinedBounds: bounds,
    refinementConfidence: 1,
    refinementReason: reason,
  }
}

function detectRepeatedDigitalGrid(image) {
  const width = image.processing.width
  const height = image.processing.height
  const background = estimateBackgroundColor(image.processing.data, width, height)
  const backgroundBrightness = (background.red + background.green + background.blue) / 3
  const shouldRefineBounds = backgroundBrightness >= 145
  const gray = toGrayscale(image.processing.data, width, height)
  const normalized = normalizeContrast(gray)
  const magnitude = sobelMagnitude(normalized, width, height)
  const projections = buildEdgeProjections(magnitude, width, height)
  const integrals = {
    gray: createIntegral(normalized, width, height),
    graySquare: createIntegral(
      Float64Array.from(normalized, (value) => value * value),
      width,
      height
    ),
    edge: createIntegral(magnitude, width, height),
  }
  const minTileWidth = Math.max(54, Math.round(width * 0.055))
  const maxTileWidth = Math.min(
    Math.round(width * 0.24),
    Math.round(height * CARD_ASPECT_RATIO * 0.72)
  )
  const tileWidths = []

  for (let tileWidth = minTileWidth; tileWidth <= maxTileWidth; tileWidth = Math.round(tileWidth * 1.075) + 1) {
    tileWidths.push(tileWidth)
  }

  const pitchFactors = [1.01, 1.04, 1.08, 1.12, 1.18, 1.25, 1.34]
  const hypotheses = []

  for (const tileWidth of tileWidths) {
    const tileHeight = tileWidth / CARD_ASPECT_RATIO

    if (tileHeight < 70 || tileHeight > height * 0.72) continue

    const lineRadius = Math.max(2, Math.round(tileWidth * 0.018))
    const xHypotheses = repeatedAxisHypotheses({
      projection: smoothProjection(projections.vertical, lineRadius),
      imageSize: width,
      tileSize: tileWidth,
      pitchFactors,
      lineRadius,
      axis: 'x',
    })
    const yHypotheses = repeatedAxisHypotheses({
      projection: smoothProjection(projections.horizontal, lineRadius),
      imageSize: height,
      tileSize: tileHeight,
      pitchFactors,
      lineRadius,
      axis: 'y',
    })

    for (const xHypothesis of xHypotheses.slice(0, 5)) {
      for (const yHypothesis of yHypotheses.slice(0, 5)) {
        const cells = []

        for (const y of yHypothesis.starts) {
          for (const x of xHypothesis.starts) {
            const bounds = {
              x,
              y,
              width: tileWidth,
              height: tileHeight,
            }
            const content = tileContentScore(integrals, width, height, bounds)

            if (content.score >= 0.28) {
              cells.push({
                ...bounds,
                contentScore: content.score,
                content,
              })
            }
          }
        }

        const possibleCells = xHypothesis.starts.length * yHypothesis.starts.length
        const countScore =
          cells.length <= 36
            ? Math.min(1, cells.length / 24)
            : Math.max(0, 1 - (cells.length - 36) / 24)
        const occupancy = cells.length / Math.max(1, possibleCells)
        const occupancyScore = Math.max(0, 1 - Math.abs(occupancy - 0.78) / 0.55)
        const contentScore = mean(cells.map((cell) => cell.contentScore))
        const alignmentScore = (xHypothesis.score + yHypothesis.score) / 2
        const excessiveCountPenalty =
          cells.length > 42 ? Math.min(0.32, (cells.length - 42) / 70) : 0
        const score =
          alignmentScore * 0.34 +
          contentScore * 0.34 +
          countScore * 0.2 +
          occupancyScore * 0.12 -
          excessiveCountPenalty
        const rejectionReasons = []

        if (cells.length < 4) rejectionReasons.push('too-few-contentful-cells')
        if (cells.length > 42) rejectionReasons.push('excessive-subtile-count')
        if (contentScore < 0.34) rejectionReasons.push('low-tile-content-score')
        if (occupancy < 0.25) rejectionReasons.push('low-grid-occupancy')

        hypotheses.push({
          source: 'repeated-grid',
          tileWidth: Number(tileWidth.toFixed(1)),
          tileHeight: Number(tileHeight.toFixed(1)),
          pitchX: Number(xHypothesis.pitch.toFixed(1)),
          pitchY: Number(yHypothesis.pitch.toFixed(1)),
          offsetX: Number(xHypothesis.offset.toFixed(1)),
          offsetY: Number(yHypothesis.offset.toFixed(1)),
          columns: xHypothesis.starts.length,
          rows: yHypothesis.starts.length,
          possibleCells,
          candidateCount: cells.length,
          score: Number(score.toFixed(4)),
          alignmentScore: Number(alignmentScore.toFixed(4)),
          contentScore: Number(contentScore.toFixed(4)),
          occupancy: Number(occupancy.toFixed(4)),
          rejectionReasons,
          cells,
        })
      }
    }
  }

  const sortedHypotheses = hypotheses.sort((left, right) => right.score - left.score)
  const selected = sortedHypotheses.find(
    (hypothesis) =>
      hypothesis.candidateCount >= 4 &&
      hypothesis.contentScore >= 0.34 &&
      hypothesis.occupancy >= 0.25
  ) ?? null
  const candidates = selected
    ? selected.cells.map((cell) => {
        const refined = shouldRefineBounds
          ? refineRepeatedGridCellBounds(cell, magnitude, width, height)
          : keepRepeatedGridCellBounds(
              cell,
              'Skipped local refinement for dark-background repeated-grid layout.'
            )
        const x = Math.max(0, Math.round(refined.x))
        const y = Math.max(0, Math.round(refined.y))

        return {
          x,
          y,
          width: Math.min(width - x, Math.round(refined.width)),
          height: Math.min(height - y, Math.round(refined.height)),
          pixels: Math.round(refined.width * refined.height * 0.4),
          score: Number(Math.min(0.99, selected.score * 0.72 + cell.contentScore * 0.28).toFixed(3)),
          layoutSource: 'repeated-grid',
          coarseBounds: refined.coarseBounds,
          refinedBounds: refined.refinedBounds,
          refinementConfidence: refined.refinementConfidence,
          refinementReason: refined.refinementReason,
        }
      })
    : []

  return {
    candidates,
    diagnostics: {
      attemptedHypotheses: sortedHypotheses.slice(0, 40).map((hypothesis) => ({
        source: hypothesis.source,
        tileWidth: hypothesis.tileWidth,
        tileHeight: hypothesis.tileHeight,
        pitchX: hypothesis.pitchX,
        pitchY: hypothesis.pitchY,
        offsetX: hypothesis.offsetX,
        offsetY: hypothesis.offsetY,
        columns: hypothesis.columns,
        rows: hypothesis.rows,
        possibleCells: hypothesis.possibleCells,
        candidateCount: hypothesis.candidateCount,
        score: hypothesis.score,
        alignmentScore: hypothesis.alignmentScore,
        contentScore: hypothesis.contentScore,
        occupancy: hypothesis.occupancy,
        rejected: hypothesis !== selected,
        rejectionReasons:
          hypothesis === selected
            ? []
            : hypothesis.rejectionReasons.length > 0
              ? hypothesis.rejectionReasons
              : ['lower-score-than-selected'],
      })),
      selectedHypothesis: selected
        ? {
            source: selected.source,
            tileWidth: selected.tileWidth,
            tileHeight: selected.tileHeight,
            pitchX: selected.pitchX,
            pitchY: selected.pitchY,
            offsetX: selected.offsetX,
            offsetY: selected.offsetY,
            columns: selected.columns,
            rows: selected.rows,
            possibleCells: selected.possibleCells,
            candidateCount: selected.candidateCount,
            score: selected.score,
            alignmentScore: selected.alignmentScore,
            contentScore: selected.contentScore,
            occupancy: selected.occupancy,
            boundRefinement: {
              enabled: shouldRefineBounds,
              backgroundBrightness: Number(backgroundBrightness.toFixed(1)),
              reason: shouldRefineBounds
                ? 'Enabled for light-background repeated-grid layout.'
                : 'Skipped for dark-background repeated-grid layout.',
            },
          }
        : null,
    },
  }
}

function scaleBounds(bounds, scale, originalWidth, originalHeight, padding = 0) {
  if (!bounds) return null

  const left = Math.max(0, Math.round(bounds.x / scale) - padding)
  const top = Math.max(0, Math.round(bounds.y / scale) - padding)
  const right = Math.min(
    originalWidth,
    Math.round((bounds.x + bounds.width) / scale) + padding
  )
  const bottom = Math.min(
    originalHeight,
    Math.round((bounds.y + bounds.height) / scale) + padding
  )

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

function scaleCandidate(candidate, scale, originalWidth, originalHeight, index) {
  const padding = Math.round(6 / scale)
  const bounds = scaleBounds(candidate, scale, originalWidth, originalHeight, padding)
  const coarseBounds = scaleBounds(candidate.coarseBounds, scale, originalWidth, originalHeight)
  const refinedBounds = scaleBounds(candidate.refinedBounds, scale, originalWidth, originalHeight)

  return {
    id: `candidate-${String(index + 1).padStart(3, '0')}`,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    score: candidate.score,
    layoutSource: candidate.layoutSource,
    coarseBounds,
    refinedBounds,
    tileBounds: coarseBounds ?? bounds,
    cardFrameBounds: refinedBounds ?? bounds,
    matchingBounds: refinedBounds ?? bounds,
    quantitySearchBounds:
      candidate.layoutSource === 'repeated-grid' &&
      coarseBounds &&
      refinedBounds &&
      !candidate.refinementReason?.includes('dark-background')
        ? {
            x: refinedBounds.x,
            y: refinedBounds.y,
            width: refinedBounds.width,
            height: Math.round(Math.min(
              coarseBounds.y + coarseBounds.height - refinedBounds.y,
              refinedBounds.height * 1.08
            )),
          }
        : bounds,
    refinementConfidence: candidate.refinementConfidence,
    refinementReason: candidate.refinementReason,
  }
}

function detectPhysicalCardFrames(image) {
  const gray = toGrayscale(image.processing.data, image.processing.width, image.processing.height)
  const normalized = normalizeContrast(gray)
  const magnitude = sobelMagnitude(normalized, image.processing.width, image.processing.height)
  const edgeMask = thresholdEdges(magnitude)
  const closedMask = closeEdges(edgeMask, image.processing.width, image.processing.height)
  const components = findConnectedComponents(
    closedMask,
    image.processing.width,
    image.processing.height
  )
  const scored = components
    .map((component) => ({
      ...component,
      score: scoreCandidate(component, image.processing.width, image.processing.height),
    }))
    .filter((candidate) => candidate.score >= 0.34)
  const merged = mergeDuplicateCandidates(scored)

  return merged
    .slice(0, 80)
    .map((candidate, index) =>
      scaleCandidate(
        candidate,
        image.processing.scale,
        image.original.width,
        image.original.height,
        index
      )
    )
}

function detectDigitalCardTiles(image) {
  const mask = createDigitalForegroundMask(
    image.processing.data,
    image.processing.width,
    image.processing.height
  )
  const components = findConnectedComponents(
    mask,
    image.processing.width,
    image.processing.height
  )
  const scored = components
    .map((component) =>
      refineDigitalTileCandidate(
        {
          ...component,
          score: scoreDigitalTile(component, image.processing.width, image.processing.height),
        },
        image.processing.width,
        image.processing.height
      )
    )
    .filter((candidate) => candidate.score >= 0.38)
  const merged = mergeDuplicateCandidates(scored)
  const segmentationCandidates = merged.slice(0, 90)
  const repeatedGrid = segmentationCandidates.length >= 4
    ? {
        candidates: [],
        diagnostics: {
          attemptedHypotheses: [],
          selectedHypothesis: null,
          skippedReason: 'foreground-segmentation-produced-candidates',
        },
      }
    : detectRepeatedDigitalGrid(image)
  const processingCandidates =
    segmentationCandidates.length >= 4
      ? segmentationCandidates.map((candidate) => ({
          ...candidate,
          layoutSource: 'foreground-segmentation',
        }))
      : repeatedGrid.candidates

  return {
    candidates: processingCandidates
      .slice(0, 90)
      .map((candidate, index) =>
        scaleCandidate(
          candidate,
          image.processing.scale,
          image.original.width,
          image.original.height,
          index
        )
      ),
    layoutDiagnostics: {
      selectedDetector:
        segmentationCandidates.length >= 4
          ? 'foreground-segmentation'
          : repeatedGrid.candidates.length > 0
            ? 'repeated-grid'
            : 'none',
      foregroundSegmentation: {
        candidateCount: segmentationCandidates.length,
        candidates: segmentationCandidates.slice(0, 20).map((candidate) => ({
          x: candidate.x,
          y: candidate.y,
          width: candidate.width,
          height: candidate.height,
          score: candidate.score,
        })),
      },
      repeatedGrid: repeatedGrid.diagnostics,
    },
  }
}

function withQuantityPlaceholder(candidate, strategy) {
  if (strategy !== 'digital') {
    return candidate
  }

  return {
    ...candidate,
    quantity: null,
    quantityConfidence: 0,
    quantitySource: 'unknown',
  }
}

function summarizeCropQuality(candidates, strategy) {
  const widths = candidates.map((candidate) => candidate.width)
  const heights = candidates.map((candidate) => candidate.height)
  const candidateCount = candidates.length

  if (candidateCount === 0) {
    return {
      candidateCount,
      average: { width: 0, height: 0 },
      min: { width: 0, height: 0 },
      max: { width: 0, height: 0 },
      suspiciouslySmall: [],
      suspiciouslyLarge: [],
      estimatedVisibleDeckEntries: 0,
    }
  }

  const averageWidth = widths.reduce((total, width) => total + width, 0) / candidateCount
  const averageHeight = heights.reduce((total, height) => total + height, 0) / candidateCount
  const minWidth = Math.min(...widths)
  const minHeight = Math.min(...heights)
  const maxWidth = Math.max(...widths)
  const maxHeight = Math.max(...heights)
  const smallWidthThreshold = averageWidth * 0.72
  const smallHeightThreshold = averageHeight * 0.72
  const largeWidthThreshold = averageWidth * 1.28
  const largeHeightThreshold = averageHeight * 1.28
  const suspiciouslySmall = candidates
    .filter(
      (candidate) =>
        candidate.width < smallWidthThreshold ||
        candidate.height < smallHeightThreshold
    )
    .map((candidate) => ({
      id: candidate.id,
      width: candidate.width,
      height: candidate.height,
    }))
  const suspiciouslyLarge = candidates
    .filter(
      (candidate) =>
        candidate.width > largeWidthThreshold ||
        candidate.height > largeHeightThreshold
    )
    .map((candidate) => ({
      id: candidate.id,
      width: candidate.width,
      height: candidate.height,
    }))

  return {
    candidateCount,
    average: {
      width: Number(averageWidth.toFixed(1)),
      height: Number(averageHeight.toFixed(1)),
    },
    min: {
      width: minWidth,
      height: minHeight,
    },
    max: {
      width: maxWidth,
      height: maxHeight,
    },
    suspiciouslySmall,
    suspiciouslyLarge,
    estimatedVisibleDeckEntries: strategy === 'digital' ? candidateCount : null,
  }
}

function summarizeQuantity(candidates) {
  const knownQuantities = candidates.filter(
    (candidate) => typeof candidate.quantity === 'number'
  )
  const estimatedTotalQuantity =
    knownQuantities.length === candidates.length
      ? knownQuantities.reduce((total, candidate) => total + candidate.quantity, 0)
      : null

  return {
    estimatedTotalQuantity,
    unknownQuantityCount: candidates.filter(
      (candidate) => candidate.quantitySource === 'unknown'
    ).length,
  }
}

function createOverlaySvg(width, height, candidates) {
  const boxes = candidates
    .map((candidate, index) => {
      const label = `${index + 1} ${(candidate.score * 100).toFixed(0)}%`
      const labelY = Math.max(20, candidate.y - 8)
      const coarse = candidate.coarseBounds
        ? `<rect x="${candidate.coarseBounds.x}" y="${candidate.coarseBounds.y}" width="${candidate.coarseBounds.width}" height="${candidate.coarseBounds.height}" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="12 8" opacity="0.9" />`
        : ''
      const refined = candidate.refinedBounds
        ? `<rect x="${candidate.refinedBounds.x}" y="${candidate.refinedBounds.y}" width="${candidate.refinedBounds.width}" height="${candidate.refinedBounds.height}" fill="none" stroke="#22c55e" stroke-width="4" opacity="0.9" />`
        : ''

      return `
        ${coarse}
        ${refined}
        <rect x="${candidate.x}" y="${candidate.y}" width="${candidate.width}" height="${candidate.height}" fill="none" stroke="#1f7ad1" stroke-width="5" />
        <rect x="${candidate.x}" y="${labelY - 18}" width="86" height="24" rx="6" fill="#1f7ad1" />
        <text x="${candidate.x + 8}" y="${labelY}" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="700">${label}</text>
      `
    })
    .join('')

  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${boxes}
    </svg>
  `)
}

async function writeOverlay(sharp, imagePath, outputPath, image, candidates) {
  const overlay = createOverlaySvg(image.original.width, image.original.height, candidates)

  await sharp(imagePath)
    .rotate()
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toFile(outputPath)
}

async function writeCrops(sharp, imagePath, cropsOutputDir, candidates) {
  for (const candidate of candidates) {
    const cropPath = path.join(cropsOutputDir, `${candidate.id}.png`)

    await sharp(imagePath)
      .rotate()
      .extract({
        left: candidate.x,
        top: candidate.y,
        width: candidate.width,
        height: candidate.height,
      })
      .png()
      .toFile(cropPath)
  }
}

function clampRelativeBounds(bounds, width, height) {
  const x = Math.max(0, Math.min(Math.round(bounds.x), width - 1))
  const y = Math.max(0, Math.min(Math.round(bounds.y), height - 1))
  const right = Math.max(x + 1, Math.min(width, Math.round(bounds.x + bounds.width)))
  const bottom = Math.max(y + 1, Math.min(height, Math.round(bounds.y + bounds.height)))

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  }
}

function connectedMaskBounds(mask, width, height) {
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const components = []

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
        if (neighbor < 0 || neighbor >= mask.length || visited[neighbor] || !mask[neighbor]) {
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

function sampleLuma(crop, bounds, sampleWidth, sampleHeight) {
  const luma = []

  for (let y = 0; y < sampleHeight; y += 1) {
    const sourceY = Math.max(
      0,
      Math.min(
        crop.height - 1,
        Math.floor(bounds.y + ((y + 0.5) / sampleHeight) * bounds.height)
      )
    )

    for (let x = 0; x < sampleWidth; x += 1) {
      const sourceX = Math.max(
        0,
        Math.min(
          crop.width - 1,
          Math.floor(bounds.x + ((x + 0.5) / sampleWidth) * bounds.width)
        )
      )
      const index = (sourceY * crop.width + sourceX) * 3
      const red = crop.data[index] ?? 0
      const green = crop.data[index + 1] ?? 0
      const blue = crop.data[index + 2] ?? 0

      luma.push(red * 0.299 + green * 0.587 + blue * 0.114)
    }
  }

  return luma
}

function classifyDigitFromBadgePixels(crop, bounds) {
  const sampleWidth = 32
  const sampleHeight = 32
  const digitWidth = 5
  const digitHeight = 7
  const templates = {
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
  const luma = sampleLuma(crop, bounds, sampleWidth, sampleHeight)
  const low = percentile(luma, 0.08)
  const high = percentile(luma, 0.92)
  const contrast = high - low

  if (contrast < 28) return null

  const makeBits = (polarity) => {
    const mask = new Uint8Array(sampleWidth * sampleHeight)
    const threshold = Math.max(12, contrast * 0.24)

    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        const value = luma[y * sampleWidth + x] ?? 128
        const isForeground =
          polarity === 'light'
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

    const bitsForBounds = (digitBounds) => {
      const bits = []

      for (let y = 0; y < digitHeight; y += 1) {
        let row = ''

        for (let x = 0; x < digitWidth; x += 1) {
          const sourceX = Math.max(
            0,
            Math.min(
              sampleWidth - 1,
              Math.floor(
                digitBounds.x +
                  ((x + 0.5) / digitWidth) * digitBounds.width
              )
            )
          )
          const sourceY = Math.max(
            0,
            Math.min(
              sampleHeight - 1,
              Math.floor(
                digitBounds.y +
                  ((y + 0.5) / digitHeight) * digitBounds.height
              )
            )
          )

          row += mask[sourceY * sampleWidth + sourceX] ? '1' : '0'
        }

        bits.push(row)
      }

      return bits
    }

    const reads = [{ bits: bitsForBounds(foregroundBounds), digitCount: 1 }]

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
  const scoreBits = (bits) => {
    if (!bits) return []

    const activePixels = bits.join('').replaceAll('0', '').length
    const densityPenalty = Math.max(0, 1 - Math.abs(activePixels / 35 - 0.38) / 0.38)

    return Object.entries(templates).map(([digit, template]) => {
      let same = 0
      let total = 0

      for (let y = 0; y < digitHeight; y += 1) {
        for (let x = 0; x < digitWidth; x += 1) {
          if (bits[y]?.[x] === template[y]?.[x]) same += 1
          total += 1
        }
      }

      return {
        digit: Number(digit),
        confidence: (same / total) * (0.72 + densityPenalty * 0.28) * Math.min(1, contrast / 80),
        contrast,
        digitCount: 1,
      }
    })
  }
  const scores = [
    ...(makeBits('light') ?? []).flatMap((read) => {
      if (read.digitCount === 1) return scoreBits(read.bits)

      const leftScores = scoreBits(read.bits[0])
      const rightScores = scoreBits(read.bits[1])
      const bestLeft = leftScores.sort((left, right) => right.confidence - left.confidence)[0]
      const bestRight = rightScores.sort((left, right) => right.confidence - left.confidence)[0]

      if (!bestLeft || !bestRight || bestLeft.digit === 0) return []

      const quantity = bestLeft.digit * 10 + bestRight.digit

      if (quantity < 1 || quantity > 60) return []

      return [{
        digit: quantity,
        confidence: ((bestLeft.confidence + bestRight.confidence) / 2) * 0.92,
        contrast: Math.min(bestLeft.contrast, bestRight.contrast),
        digitCount: 2,
      }]
    }),
    ...(makeBits('dark') ?? []).flatMap((read) => {
      if (read.digitCount === 1) return scoreBits(read.bits)

      const leftScores = scoreBits(read.bits[0])
      const rightScores = scoreBits(read.bits[1])
      const bestLeft = leftScores.sort((left, right) => right.confidence - left.confidence)[0]
      const bestRight = rightScores.sort((left, right) => right.confidence - left.confidence)[0]

      if (!bestLeft || !bestRight || bestLeft.digit === 0) return []

      const quantity = bestLeft.digit * 10 + bestRight.digit

      if (quantity < 1 || quantity > 60) return []

      return [{
        digit: quantity,
        confidence: ((bestLeft.confidence + bestRight.confidence) / 2) * 0.92,
        contrast: Math.min(bestLeft.contrast, bestRight.contrast),
        digitCount: 2,
      }]
    }),
  ]

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

function classifyTcgLiveRedBadgeFour(crop, bounds) {
  const sampleWidth = 32
  const sampleHeight = 32
  const redMask = new Uint8Array(sampleWidth * sampleHeight)
  const whiteMask = new Uint8Array(sampleWidth * sampleHeight)
  let redPixels = 0
  let minX = sampleWidth
  let minY = sampleHeight
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < sampleHeight; y += 1) {
    const sourceY = Math.max(
      0,
      Math.min(crop.height - 1, Math.floor(bounds.y + ((y + 0.5) / sampleHeight) * bounds.height))
    )

    for (let x = 0; x < sampleWidth; x += 1) {
      const sourceX = Math.max(
        0,
        Math.min(crop.width - 1, Math.floor(bounds.x + ((x + 0.5) / sampleWidth) * bounds.width))
      )
      const sourceIndex = (sourceY * crop.width + sourceX) * 3
      const red = crop.data[sourceIndex] ?? 0
      const green = crop.data[sourceIndex + 1] ?? 0
      const blue = crop.data[sourceIndex + 2] ?? 0
      const luma = red * 0.299 + green * 0.587 + blue * 0.114
      const index = y * sampleWidth + x
      const isRed = red > 95 && red > green * 1.35 && red > blue * 1.35
      const isWhiteStroke =
        luma > 175 && Math.max(red, green, blue) - Math.min(red, green, blue) < 110

      if (isRed) {
        redMask[index] = 1
        redPixels += 1
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }

      if (isWhiteStroke) {
        whiteMask[index] = 1
      }
    }
  }

  const redRatio = redPixels / (sampleWidth * sampleHeight)

  if (redRatio < 0.25 || maxX < minX || maxY < minY) return null

  const redWidth = maxX - minX + 1
  const redHeight = (maxY - minY + 1) * 0.72
  const cell = []

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

  const average = (coordinates) =>
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
  const confidence = Math.min(
    0.82,
    0.6 +
      Math.max(0, outerLeft - middleLeft - 0.1) * 0.5 +
      Math.max(0, rightStroke - 0.24) * 0.35 +
      Math.max(0, middleBar - 0.18) * 0.35
  )

  if (
    outerLeft - middleLeft > 0.1 &&
    rightStroke > 0.24 &&
    middleBar > 0.18
  ) {
    return {
      digit: 4,
      confidence,
      redRatio,
      outerLeft,
      middleLeft,
      rightStroke,
      middleBar,
    }
  }

  return null
}

function scoreBadgeWindowPixels(crop, bounds, locationWeight, zone, source = 'zone-search') {
  const digit = classifyDigitFromBadgePixels(crop, bounds)
  const luma = sampleLuma(crop, bounds, 16, 16)
  const contrast = percentile(luma, 0.92) - percentile(luma, 0.08)
  const relativeCenterX = (bounds.x + bounds.width / 2) / crop.width
  const relativeCenterY = (bounds.y + bounds.height / 2) / crop.height
  const centerDistance = Math.hypot(relativeCenterX - 0.52, relativeCenterY - 0.86)
  const centerScore = Math.max(0, 1 - centerDistance / 0.24)
  const sizeRatio = bounds.width / crop.width
  const sizeScore = Math.max(0, 1 - Math.abs(sizeRatio - 0.3) / 0.18)

  return {
    bounds,
    zone,
    source,
    digit,
    score:
      (digit?.confidence ?? 0) * 0.58 +
      Math.min(1, contrast / 120) * 0.1 +
      centerScore * 0.22 +
      sizeScore * 0.06 +
      locationWeight,
  }
}

function relativeBoundsFromRead(crop, read) {
  if (!read?.bounds) return null

  return {
    x: read.bounds.x / crop.width,
    y: read.bounds.y / crop.height,
    width: read.bounds.width / crop.width,
    height: read.bounds.height / crop.height,
  }
}

function absoluteBoundsFromPattern(crop, pattern, xOffset = 0, yOffset = 0, scale = 1) {
  const width = crop.width * pattern.relativeBounds.width * scale
  const height = crop.height * pattern.relativeBounds.height * scale
  const centerX =
    crop.width * (pattern.relativeBounds.x + pattern.relativeBounds.width / 2) +
    crop.width * xOffset
  const centerY =
    crop.height * (pattern.relativeBounds.y + pattern.relativeBounds.height / 2) +
    crop.height * yOffset

  return clampRelativeBounds(
    {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    },
    crop.width,
    crop.height
  )
}

function badgeWindowStats(crop, bounds) {
  const luma = sampleLuma(crop, bounds, 18, 18)
  const low = percentile(luma, 0.08)
  const high = percentile(luma, 0.92)
  const medianValue = median(luma)
  const centerBounds = clampRelativeBounds(
    {
      x: bounds.x + bounds.width * 0.28,
      y: bounds.y + bounds.height * 0.22,
      width: bounds.width * 0.44,
      height: bounds.height * 0.56,
    },
    crop.width,
    crop.height
  )
  const centerLuma = sampleLuma(crop, centerBounds, 10, 10)
  const centerLow = percentile(centerLuma, 0.12)
  const centerHigh = percentile(centerLuma, 0.88)

  return {
    low,
    high,
    median: medianValue,
    contrast: high - low,
    centerLow,
    centerHigh,
  }
}

function scoreBadgeProfileWindow(crop, bounds, family, anchor) {
  const stats = badgeWindowStats(crop, bounds)
  const relativeCenterX = (bounds.x + bounds.width / 2) / crop.width
  const relativeCenterY = (bounds.y + bounds.height / 2) / crop.height
  const distance = Math.hypot(relativeCenterX - anchor.x, relativeCenterY - anchor.y)
  const locationScore = Math.max(0, 1 - distance / anchor.tolerance)
  const sizeRatio = bounds.width / crop.width
  const sizeScore = Math.max(0, 1 - Math.abs(sizeRatio - anchor.size) / anchor.sizeTolerance)

  if (family === 'light-circle-bottom-center') {
    const paleBackgroundScore = Math.max(0, Math.min(1, (stats.high - 170) / 60))
    const darkGlyphScore = Math.max(0, Math.min(1, (stats.high - stats.centerLow - 45) / 95))
    const score =
      paleBackgroundScore * 0.34 +
      darkGlyphScore * 0.3 +
      Math.min(1, stats.contrast / 150) * 0.14 +
      locationScore * 0.16 +
      sizeScore * 0.06

    return {
      family,
      bounds,
      zone: 'bottom-middle',
      polarity: 'dark-on-light',
      score,
      stats,
    }
  }

  const darkBackgroundScore = Math.max(0, Math.min(1, (105 - stats.median) / 75))
  const lightGlyphScore = Math.max(0, Math.min(1, (stats.centerHigh - stats.median - 32) / 90))
  const score =
    darkBackgroundScore * 0.36 +
    lightGlyphScore * 0.28 +
    Math.min(1, stats.contrast / 130) * 0.14 +
    locationScore * 0.16 +
    sizeScore * 0.06

  return {
    family,
    bounds,
    zone: 'bottom-right',
    polarity: 'light-on-dark',
    score,
    stats,
  }
}

function findProfileBadgeEvidence(crop) {
  const profiles = [
    {
      family: 'light-circle-bottom-center',
      anchor: { x: 0.5, y: 0.84, tolerance: 0.2, size: 0.28, sizeTolerance: 0.16 },
      xs: [0.46, 0.5, 0.54],
      ys: [0.8, 0.84, 0.88],
      sizes: [0.24, 0.28, 0.32, 0.36],
    },
    {
      family: 'dark-overlay-bottom-right',
      anchor: { x: 0.79, y: 0.82, tolerance: 0.24, size: 0.3, sizeTolerance: 0.18 },
      xs: [0.72, 0.78, 0.84],
      ys: [0.76, 0.82, 0.88],
      sizes: [0.24, 0.28, 0.32, 0.36],
    },
  ]

  return profiles.map((profile) => {
    const windows = []

    for (const size of profile.sizes) {
      const width = crop.width * size
      const height = width

      for (const x of profile.xs) {
        for (const y of profile.ys) {
          windows.push(
            scoreBadgeProfileWindow(
              crop,
              clampRelativeBounds(
                {
                  x: crop.width * x - width / 2,
                  y: crop.height * y - height / 2,
                  width,
                  height,
                },
                crop.width,
                crop.height
              ),
              profile.family,
              profile.anchor
            )
          )
        }
      }
    }

    return windows.sort((left, right) => right.score - left.score)[0]
  })
}

function findBadgeRead(crop, badgePattern = null) {
  const sizeFactors = [0.24, 0.28, 0.32, 0.36]
  const zones = [
    { name: 'bottom-middle', x: [0.44, 0.6], y: [0.8, 0.9], target: [0.52, 0.86], weight: 0.08 },
    { name: 'bottom-left', x: [0.18, 0.36], y: [0.78, 0.9], target: [0.28, 0.86], weight: 0.04 },
    { name: 'bottom-right', x: [0.64, 0.82], y: [0.78, 0.9], target: [0.72, 0.86], weight: 0.04 },
    { name: 'top-left', x: [0.16, 0.36], y: [0.1, 0.24], target: [0.26, 0.16], weight: 0.035 },
    { name: 'top-right', x: [0.64, 0.84], y: [0.1, 0.24], target: [0.74, 0.16], weight: 0.035 },
    { name: 'left-edge', x: [0.06, 0.22], y: [0.36, 0.62], target: [0.14, 0.5], weight: 0.025 },
    { name: 'right-edge', x: [0.78, 0.94], y: [0.36, 0.62], target: [0.86, 0.5], weight: 0.025 },
  ]
  const anchors = []
  const scoredWindows = []

  if (badgePattern?.relativeBounds) {
    for (const scale of [0.94, 1, 1.08]) {
      for (const yOffset of [-0.012, 0, 0.012]) {
        for (const xOffset of [-0.012, 0, 0.012]) {
          scoredWindows.push(
            scoreBadgeWindowPixels(
              crop,
              absoluteBoundsFromPattern(crop, badgePattern, xOffset, yOffset, scale),
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
    const windowWidth = crop.width * factor
    const windowHeight = windowWidth

    for (const anchor of anchors) {
      scoredWindows.push(
        scoreBadgeWindowPixels(
          crop,
          clampRelativeBounds(
            {
              x: crop.width * anchor.x - windowWidth / 2,
              y: crop.height * anchor.y - windowHeight / 2,
              width: windowWidth,
              height: windowHeight,
            },
            crop.width,
            crop.height
          ),
          anchor.weight,
          anchor.zone
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
      (badgePattern?.family &&
        badgePattern.family !== 'foreground-bottom-center' &&
        bestPattern.score >= bestLocal.score - 0.08) ||
      ((bestPattern.digit?.confidence ?? 0) >= 0.72 &&
        bestPattern.score >= bestLocal.score + 0.12 &&
        (bestLocal.digit?.confidence ?? 0) < 0.5))
  const best = shouldUsePattern ? bestPattern : bestLocal

  if (!best) return null

  if (
    badgePattern?.family &&
    badgePattern.family !== 'foreground-bottom-center' &&
    bestPattern &&
    best === bestLocal &&
    (best.digit?.confidence ?? 0) < 0.56
  ) {
    return {
      ...bestPattern,
      patternApplied: true,
      rejectedZones: [],
    }
  }

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
    .filter(Boolean)

  return {
    ...best,
    patternApplied: best.source === 'global-pattern',
    rejectedZones,
  }
}

async function readCandidateCropPixels(sharp, imagePath, candidate) {
  const bounds = candidate.quantitySearchBounds ?? candidate
  const crop = await sharp(imagePath)
    .rotate()
    .extract({
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
    })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const cropImage = {
    data: crop.data,
    width: crop.info.width,
    height: crop.info.height,
    originX: bounds.x,
    originY: bounds.y,
  }

  return cropImage
}

function inferBadgePatternFromReads(reads) {
  const profileCandidates = []
  const familyScores = {}
  const repeatedGridReadCount = reads.filter(
    (read) => read.layoutSource === 'repeated-grid'
  ).length
  const shouldUseProfileFamilies =
    reads.length > 0 && repeatedGridReadCount >= Math.ceil(reads.length * 0.8)

  for (const family of [
    'light-circle-bottom-center',
    'dark-overlay-bottom-right',
  ]) {
    if (!shouldUseProfileFamilies) {
      familyScores[family] = {
        score: 0,
        averageScore: 0,
        supportingTiles: 0,
        requiredSupportingTiles: Math.max(4, Math.ceil(reads.length * 0.22)),
        supported: false,
        skippedReason: 'Profile families are only enabled for repeated-grid layouts.',
      }
      continue
    }

    const familyReads = reads
      .map((read) => read.profileEvidence?.find((entry) => entry.family === family))
      .filter(Boolean)
      .filter((entry) => entry.score >= 0.56)
      .sort((left, right) => right.score - left.score)
    const supportThreshold = Math.max(4, Math.ceil(reads.length * 0.22))
    const supported = familyReads.length >= supportThreshold
    const averageScore =
      familyReads.reduce((total, entry) => total + entry.score, 0) /
      Math.max(1, familyReads.length)

    familyScores[family] = {
      score: Number((averageScore * Math.min(1, familyReads.length / supportThreshold)).toFixed(4)),
      averageScore: Number(averageScore.toFixed(4)),
      supportingTiles: familyReads.length,
      requiredSupportingTiles: supportThreshold,
      supported,
    }

    if (supported) {
      const bounds = familyReads.map((entry) => entry.bounds)
      const average = (key) =>
        bounds.reduce((total, entry) => total + entry[key], 0) / bounds.length
      const cropWidth = reads.find((read) => read.cropImage)?.cropImage.width ?? 1
      const cropHeight = reads.find((read) => read.cropImage)?.cropImage.height ?? 1

      profileCandidates.push({
        family,
        zone:
          family === 'dark-overlay-bottom-right' ? 'bottom-right' : 'bottom-middle',
        relativeBounds: {
          x: average('x') / cropWidth,
          y: average('y') / cropHeight,
          width: average('width') / cropWidth,
          height: average('height') / cropHeight,
        },
        polarity:
          family === 'dark-overlay-bottom-right' ? 'light-on-dark' : 'dark-on-light',
        confidence: familyScores[family].score,
        profileConfidence: familyScores[family].score,
        sampleCount: familyReads.length,
        candidateCount: reads.length,
        familyScores,
      })
    }
  }

  const usableReads = reads.filter(
    (read) =>
      read.badgeRead?.bounds &&
      read.badgeRead?.digit &&
      (read.badgeRead.digit.confidence >= 0.4 ||
        read.badgeRead.digit.digit <= 4)
  )

  if (usableReads.length < 3) {
    return profileCandidates.sort((left, right) => right.confidence - left.confidence)[0] ?? null
  }

  const byZone = new Map()

  for (const read of usableReads) {
    const zone = read.badgeRead.zone
    const entries = byZone.get(zone) ?? []

    entries.push(read)
    byZone.set(zone, entries)
  }

  const [zone, zoneReads] =
    Array.from(byZone.entries()).sort((left, right) => {
      const countDelta = right[1].length - left[1].length

      if (countDelta !== 0) return countDelta
      if (left[0] === 'bottom-middle') return -1
      if (right[0] === 'bottom-middle') return 1

      return 0
    })[0] ?? []

  if (!zone || !zoneReads || zoneReads.length < Math.max(3, Math.ceil(usableReads.length * 0.45))) {
    return profileCandidates.sort((left, right) => right.confidence - left.confidence)[0] ?? null
  }

  const relativeBounds = zoneReads
    .map((read) => relativeBoundsFromRead(read.cropImage, read.badgeRead))
    .filter(Boolean)
  const average = (key) =>
    relativeBounds.reduce((total, bounds) => total + bounds[key], 0) /
    relativeBounds.length

  const genericPattern = {
    zone,
    family: 'foreground-bottom-center',
    relativeBounds: {
      x: average('x'),
      y: average('y'),
      width: average('width'),
      height: average('height'),
    },
    polarity: 'auto',
    confidence: Number(Math.min(0.99, zoneReads.length / Math.max(1, reads.length)).toFixed(4)),
    profileConfidence: Number(Math.min(0.99, zoneReads.length / Math.max(1, reads.length)).toFixed(4)),
    sampleCount: zoneReads.length,
    candidateCount: reads.length,
    familyScores: {
      ...familyScores,
      'foreground-bottom-center': {
        score: Number(Math.min(0.99, zoneReads.length / Math.max(1, reads.length)).toFixed(4)),
        averageScore: Number(mean(zoneReads.map((read) => read.badgeRead.score)).toFixed(4)),
        supportingTiles: zoneReads.length,
        requiredSupportingTiles: Math.max(3, Math.ceil(usableReads.length * 0.45)),
        supported: true,
      },
      unknown: {
        score: 0,
        averageScore: 0,
        supportingTiles: 0,
        requiredSupportingTiles: 0,
        supported: false,
      },
    },
  }
  const strongestProfile = profileCandidates.sort((left, right) => right.confidence - left.confidence)[0]

  if (
    strongestProfile &&
    strongestProfile.confidence >= Math.max(0.62, genericPattern.confidence + 0.08)
  ) {
    return strongestProfile
  }

  return genericPattern
}

async function detectGlobalBadgePattern(sharp, imagePath, candidates) {
  const reads = []

  for (const candidate of candidates) {
    const cropImage = await readCandidateCropPixels(sharp, imagePath, candidate)
    const badgeRead = findBadgeRead(cropImage)

    reads.push({
      candidateId: candidate.id,
      layoutSource: candidate.layoutSource,
      cropImage,
      badgeRead,
      profileEvidence: findProfileBadgeEvidence(cropImage),
    })
  }

  return inferBadgePatternFromReads(reads)
}

async function readLegacyDigitalQuantityBadge(sharp, imagePath, candidate, badgePattern = null) {
  const cropImage = await readCandidateCropPixels(sharp, imagePath, candidate)
  const badgeRead = findBadgeRead(cropImage, badgePattern)
  const digit = badgeRead?.digit

  if (!badgeRead) {
    return {
      quantity: 1,
      quantityConfidence: 0,
      quantitySource: 'unknown',
      quantityDiagnostics: {
        badgeFound: false,
        badgeBounds: null,
        parsedValue: 1,
        confidence: 0,
        failureReason: 'No high-contrast quantity badge candidate found; defaulted to 1.',
        selectedBadgeZone: null,
        globalBadgePattern: badgePattern,
        globalBadgePatternApplied: false,
        rejectedBadgeZones: [],
      },
      badgeBounds: null,
    }
  }

  const badgeBounds = {
    x: (cropImage.originX ?? candidate.x) + badgeRead.bounds.x,
    y: (cropImage.originY ?? candidate.y) + badgeRead.bounds.y,
    width: badgeRead.bounds.width,
    height: badgeRead.bounds.height,
  }

  if (!digit) {
    return {
      quantity: 1,
      quantityConfidence: 0,
      quantitySource: 'unknown',
      quantityDiagnostics: {
        badgeFound: true,
        badgeBounds,
        parsedValue: 1,
        confidence: 0,
        failureReason: 'Badge localized but no isolated digit found; defaulted to 1.',
        selectedBadgeZone: badgeRead.zone,
        globalBadgePattern: badgePattern,
        globalBadgePatternApplied: badgeRead.patternApplied,
        rejectedBadgeZones: badgeRead.rejectedZones ?? [],
      },
      badgeBounds,
    }
  }

  const implausibleHighSingleDigit =
    digit.digit > 4 && digit.digit < 10 && digit.digitCount === 1 && digit.confidence < 0.9
  const implausibleLowConfidenceMultiDigit =
    digit.digitCount > 1 && digit.confidence < 0.82
  const lowConfidenceLightCircleDigit =
    badgePattern?.family === 'light-circle-bottom-center' && digit.confidence < 0.7

  if (
    digit.confidence < 0.56 ||
    digit.digit < 1 ||
    digit.digit > 60 ||
    implausibleHighSingleDigit ||
    implausibleLowConfidenceMultiDigit ||
    lowConfidenceLightCircleDigit
  ) {
    const redBadgeFour = classifyTcgLiveRedBadgeFour(cropImage, badgeRead.bounds)

    if (redBadgeFour) {
      return {
        quantity: 4,
        quantityConfidence: redBadgeFour.confidence,
        quantitySource: 'digital-badge-second-pass',
        quantityDiagnostics: {
          badgeFound: true,
          badgeBounds,
          parsedValue: 4,
          confidence: redBadgeFour.confidence,
          failureReason: null,
          primaryParsedValue: digit.digit,
          primaryConfidence: digit.confidence,
          secondPass: true,
          secondPassMethod: 'tcg-live-red-badge-four-structure',
          selectedBadgeZone: badgeRead.zone,
          globalBadgePattern: badgePattern,
          globalBadgePatternApplied: badgeRead.patternApplied,
          rejectedBadgeZones: badgeRead.rejectedZones ?? [],
          secondPassFeatures: {
            redRatio: redBadgeFour.redRatio,
            outerLeft: redBadgeFour.outerLeft,
            middleLeft: redBadgeFour.middleLeft,
            rightStroke: redBadgeFour.rightStroke,
            middleBar: redBadgeFour.middleBar,
          },
        },
        badgeBounds,
      }
    }

    const failureReason = `Badge found but digit confidence was too low (${Math.round(
      digit.confidence * 100
    )}%); defaulted to 1.`

    return {
      quantity: 1,
      quantityConfidence: digit.confidence,
      quantitySource: 'unknown',
      quantityDiagnostics: {
        badgeFound: true,
        badgeBounds,
        parsedValue: 1,
        confidence: digit.confidence,
        failureReason,
        selectedBadgeZone: badgeRead.zone,
        globalBadgePattern: badgePattern,
        globalBadgePatternApplied: badgeRead.patternApplied,
        rejectedBadgeZones: badgeRead.rejectedZones ?? [],
      },
      badgeBounds,
    }
  }

  return {
    quantity: digit.digit,
    quantityConfidence: digit.confidence,
    quantitySource: 'digital-badge',
    quantityDiagnostics: {
      badgeFound: true,
      badgeBounds,
      parsedValue: digit.digit,
      confidence: digit.confidence,
      failureReason: null,
      selectedBadgeZone: badgeRead.zone,
      globalBadgePattern: badgePattern,
      globalBadgePatternApplied: badgeRead.patternApplied,
      rejectedBadgeZones: badgeRead.rejectedZones ?? [],
    },
    badgeBounds,
  }
}

async function readDigitalQuantityBadge(
  sharp,
  imagePath,
  candidate,
  badgePattern = null,
  quantityOutputRoot = QUANTITY_OUTPUT_ROOT
) {
  const legacy = await readLegacyDigitalQuantityBadge(
    sharp,
    imagePath,
    candidate,
    badgePattern
  )

  if (!legacy.badgeBounds) {
    return {
      ...legacy,
      quantityDiagnostics: {
        ...legacy.quantityDiagnostics,
        parserComparison: null,
      },
    }
  }

  const cropImage = await readCandidateCropPixels(sharp, imagePath, candidate)
  const relativeBadgeBounds = {
    x: legacy.badgeBounds.x - (cropImage.originX ?? candidate.x),
    y: legacy.badgeBounds.y - (cropImage.originY ?? candidate.y),
    width: legacy.badgeBounds.width,
    height: legacy.badgeBounds.height,
  }
  const digitResult = await recognizeQuantityFromBadge({
    sharp,
    crop: cropImage,
    badgeBounds: relativeBadgeBounds,
    legacyResult: {
      quantity: legacy.quantity,
      confidence: legacy.quantityConfidence,
      source: legacy.quantitySource === 'unknown' ? 'unknown' : 'legacy-heuristic',
    },
  })
  const isNewBadgeProfile =
    badgePattern?.family === 'light-circle-bottom-center' ||
    badgePattern?.family === 'dark-overlay-bottom-right'
  const profileGlyphBounds = isNewBadgeProfile
    ? clampRelativeBounds(
        badgePattern.family === 'light-circle-bottom-center'
          ? {
              x: relativeBadgeBounds.x + relativeBadgeBounds.width * 0.22,
              y: relativeBadgeBounds.y + relativeBadgeBounds.height * 0.16,
              width: relativeBadgeBounds.width * 0.56,
              height: relativeBadgeBounds.height * 0.68,
            }
          : {
              x: relativeBadgeBounds.x + relativeBadgeBounds.width * 0.08,
              y: relativeBadgeBounds.y + relativeBadgeBounds.height * 0.08,
              width: relativeBadgeBounds.width * 0.84,
              height: relativeBadgeBounds.height * 0.84,
            },
        cropImage.width,
        cropImage.height
      )
    : null
  const profileDigitResult = profileGlyphBounds
    ? await recognizeQuantityFromBadge({
        sharp,
        crop: cropImage,
        badgeBounds: profileGlyphBounds,
        legacyResult: {
          quantity: legacy.quantity,
          confidence: legacy.quantityConfidence,
          source: legacy.quantitySource === 'unknown' ? 'unknown' : 'legacy-heuristic',
        },
      })
    : null
  const selectedDigitResult =
    profileDigitResult && profileDigitResult.confidence >= digitResult.confidence + 0.035
      ? {
          ...profileDigitResult,
          profileGlyphPreprocessing: true,
          fullBadgeResultSummary: {
            quantity: digitResult.quantity,
            confidence: digitResult.confidence,
            failure: digitResult.failure,
          },
        }
      : digitResult
  const fixtureSlug = quantityFixtureSlug(imagePath)
  const artifactPaths = await writeQuantityRecognitionArtifacts({
    sharp,
    outputRoot: quantityOutputRoot,
    fixtureSlug,
    candidateId: candidate.id,
    crop: cropImage,
    result: selectedDigitResult,
  })
  const combined = chooseCombinedQuantity(
    selectedDigitResult,
    {
      quantity: legacy.quantity,
      confidence: legacy.quantityConfidence,
      source: legacy.quantitySource === 'unknown' ? 'unknown' : 'legacy-heuristic',
    },
    badgePattern?.family === 'dark-overlay-bottom-right'
      ? {
          minimumOverrideConfidence: 0.7,
          minimumDisagreementOverrideConfidence: 0.78,
        }
      : badgePattern?.family === 'light-circle-bottom-center'
        ? {
            minimumOverrideConfidence: 0.86,
            minimumDisagreementOverrideConfidence: 0.78,
          }
        : {}
  )
  const parserComparison = {
    ...selectedDigitResult,
    profileGlyphPreprocessing: selectedDigitResult.profileGlyphPreprocessing ?? false,
    profileGlyphBounds,
    attempts: selectedDigitResult.attempts.map((attempt) => ({
      variant: attempt.variant,
      failure: attempt.failure ?? null,
      quantity: attempt.quantity ?? null,
      confidence: attempt.confidence ?? 0,
      classifierConfidence: attempt.classifierConfidence ?? 0,
      margin: attempt.margin ?? 0,
      glyphBounds:
        attempt.classifications?.map((classification) => classification.glyph) ?? [],
      digitAlternatives:
        attempt.classifications?.map((classification) =>
          classification.alternatives.slice(0, 3)
        ) ?? [],
    })),
    artifactPaths: artifactPaths.map((artifactPath) => path.relative(repoRoot, artifactPath)),
  }

  return {
    ...legacy,
    quantity: combined.quantity,
    quantityConfidence: combined.confidence,
    quantitySource: combined.source,
    quantityDiagnostics: {
      ...legacy.quantityDiagnostics,
      legacyParsedValue: legacy.quantity,
      legacyConfidence: legacy.quantityConfidence,
      parserComparison,
      badgeProfile: badgePattern,
      profileDetectionConfidence: badgePattern?.profileConfidence ?? null,
      badgeLocalizationConfidence: legacy.quantityDiagnostics?.confidence ?? null,
      glyphSegmentationConfidence: selectedDigitResult.attempts
        .filter((attempt) => attempt.classifications?.length)
        .reduce(
          (best, attempt) =>
            Math.max(
              best,
              attempt.classifications.reduce(
                (total, classification) => total + classification.glyph.height,
                0
              ) /
                Math.max(1, attempt.classifications.length) /
                Math.max(1, attempt.variantData.height)
            ),
          0
        ),
      digitClassificationConfidence:
        selectedDigitResult.attempts
          .filter((attempt) => Number.isInteger(attempt.quantity))
          .sort((left, right) => (right.classifierConfidence ?? 0) - (left.classifierConfidence ?? 0))[0]
          ?.classifierConfidence ?? 0,
    },
  }
}

async function writeBadgeCrops(sharp, imagePath, badgesOutputDir, candidates) {
  for (const candidate of candidates) {
    if (!candidate.badgeBounds) continue

    const cropPath = path.join(badgesOutputDir, `${candidate.id}-badge.png`)

    await sharp(imagePath)
      .rotate()
      .extract({
        left: candidate.badgeBounds.x,
        top: candidate.badgeBounds.y,
        width: candidate.badgeBounds.width,
        height: candidate.badgeBounds.height,
      })
      .png()
      .toFile(cropPath)
  }
}

function quantityFixtureSlug(imagePath) {
  return `${path.basename(path.dirname(imagePath))}-${path.basename(imagePath, path.extname(imagePath))}`
    .replace(/[^a-z0-9_-]/gi, '-')
    .toLowerCase()
}

function createBadgeProfileOverlaySvg(width, height, candidates, profile) {
  const boxes = candidates
    .filter((candidate) => candidate.badgeBounds)
    .map((candidate) => {
      const bounds = candidate.badgeBounds
      const label = `${candidate.id} ${candidate.quantity ?? '?'}`

      return `
        <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="none" stroke="#f97316" stroke-width="4" />
        <rect x="${bounds.x}" y="${Math.max(0, bounds.y - 22)}" width="116" height="22" rx="5" fill="#f97316" />
        <text x="${bounds.x + 6}" y="${Math.max(16, bounds.y - 6)}" fill="#111827" font-family="Arial, sans-serif" font-size="14" font-weight="700">${label}</text>
      `
    })
    .join('')

  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="12" width="520" height="70" rx="8" fill="rgba(17,24,39,0.82)" />
      <text x="28" y="40" fill="#ffffff" font-family="Arial, sans-serif" font-size="18" font-weight="700">Badge profile: ${profile?.family ?? 'unknown'}</text>
      <text x="28" y="66" fill="#ffffff" font-family="Arial, sans-serif" font-size="15">confidence ${Math.round((profile?.profileConfidence ?? 0) * 100)}%, support ${profile?.sampleCount ?? 0}/${profile?.candidateCount ?? 0}, polarity ${profile?.polarity ?? 'unknown'}</text>
      ${boxes}
    </svg>
  `)
}

async function writeBadgeProfileDebug({
  sharp,
  imagePath,
  image,
  outputRoot,
  profile,
  candidates,
}) {
  if (!profile) return null

  const fixtureSlug = quantityFixtureSlug(imagePath)
  const outputDir = path.join(outputRoot, fixtureSlug)
  mkdirSync(outputDir, { recursive: true })

  const scoreReportPath = path.join(outputDir, 'badge-profile-report.json')
  const overlayPath = path.join(outputDir, 'selected-badge-overlay.png')

  writeFileSync(
    scoreReportPath,
    `${JSON.stringify(
      {
        selectedFamily: profile.family ?? 'unknown',
        familyScores: profile.familyScores ?? {},
        inferredNormalizedBadgeBounds: profile.relativeBounds ?? null,
        polarity: profile.polarity ?? 'unknown',
        confidence: profile.profileConfidence ?? profile.confidence ?? 0,
        supportingTiles: profile.sampleCount ?? 0,
        candidateCount: profile.candidateCount ?? candidates.length,
      },
      null,
      2
    )}\n`
  )

  await sharp(imagePath)
    .rotate()
    .composite([
      {
        input: createBadgeProfileOverlaySvg(
          image.original.width,
          image.original.height,
          candidates,
          profile
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(overlayPath)

  return {
    scoreReportPath,
    overlayPath,
  }
}

export async function runCardFrameDetection(imagePathArgument, options = {}) {
  const imagePath = resolveImagePath(imagePathArgument)

  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`)
  }

  const {
    outputDir,
    overlayOutputPath,
    cropsOutputDir,
    badgesOutputDir,
    reportOutputPath,
  } = getOutputPaths(imagePath, options.outputRoot)
  mkdirSync(outputDir, { recursive: true })
  rmSync(cropsOutputDir, { recursive: true, force: true })
  mkdirSync(cropsOutputDir, { recursive: true })
  rmSync(badgesOutputDir, { recursive: true, force: true })

  const sharp = await loadSharp()
  const image = await loadImage(sharp, imagePath)
  const selectedStrategy = resolveStrategy(options.strategy, imagePath)
  const digitalDetection =
    selectedStrategy === 'digital'
      ? detectDigitalCardTiles(image)
      : null
  const rawCandidates =
    selectedStrategy === 'digital'
      ? digitalDetection.candidates
      : detectPhysicalCardFrames(image)
  const globalBadgePattern =
    selectedStrategy === 'digital'
      ? await detectGlobalBadgePattern(sharp, imagePath, rawCandidates)
      : null
  const resolvedOutputRoot = options.outputRoot ?? DEFAULT_OUTPUT_ROOT
  const quantityOutputRoot =
    selectedStrategy === 'digital' &&
    path.normalize(resolvedOutputRoot).includes(path.normalize('deck-image-importer-validation'))
      ? path.join(repoRoot, 'debug-output', 'quantity-recognition-validation')
      : QUANTITY_OUTPUT_ROOT
  const primaryCandidates = selectedStrategy === 'digital'
    ? await Promise.all(
        rawCandidates.map(async (candidate) => {
          const quantityRead = await readDigitalQuantityBadge(
            sharp,
            imagePath,
            candidate,
            globalBadgePattern,
            quantityOutputRoot
          )

          return {
            ...candidate,
            quantity: quantityRead.quantity,
            quantityConfidence: quantityRead.quantityConfidence,
            quantitySource: quantityRead.quantitySource,
            quantityDiagnostics: quantityRead.quantityDiagnostics,
            badgeBounds: quantityRead.badgeBounds,
          }
        })
      )
    : rawCandidates.map((candidate) =>
        withQuantityPlaceholder(candidate, selectedStrategy)
      )
  const candidates =
    selectedStrategy === 'digital'
      ? primaryCandidates
      : primaryCandidates
  const cropQuality = summarizeCropQuality(candidates, selectedStrategy)
  const quantitySummary = summarizeQuantity(candidates)
  const shouldWriteBadgeCrops = selectedStrategy === 'digital' && candidates.length > 0

  await writeOverlay(sharp, imagePath, overlayOutputPath, image, candidates)
  await writeCrops(sharp, imagePath, cropsOutputDir, candidates)
  if (shouldWriteBadgeCrops) {
    mkdirSync(badgesOutputDir, { recursive: true })
    await writeBadgeCrops(sharp, imagePath, badgesOutputDir, candidates)
  }
  const badgeProfileDebug = shouldWriteBadgeCrops
    ? await writeBadgeProfileDebug({
        sharp,
        imagePath,
        image,
        outputRoot: quantityOutputRoot,
        profile: globalBadgePattern,
        candidates,
      })
    : null

  const report = {
    imagePath,
    strategy: selectedStrategy,
    cropQuality,
    quantitySummary,
    layoutDiagnostics: digitalDetection?.layoutDiagnostics ?? null,
    globalBadgePattern,
    candidates,
    overlayOutputPath,
    cropsOutputDir,
    badgesOutputDir: shouldWriteBadgeCrops ? badgesOutputDir : null,
    badgeProfileDebug,
  }

  writeFileSync(reportOutputPath, `${JSON.stringify(report, null, 2)}\n`)

  return {
    imagePath,
    strategy: selectedStrategy,
    candidateCount: candidates.length,
    cropQuality,
    quantitySummary,
    layoutDiagnostics: digitalDetection?.layoutDiagnostics ?? null,
    globalBadgePattern,
    candidates,
    overlayOutputPath,
    cropsOutputDir,
    badgesOutputDir: shouldWriteBadgeCrops ? badgesOutputDir : null,
    badgeProfileDebug,
    reportOutputPath,
  }
}

function printResult(result) {
  console.log('Card frame detection prototype')
  console.log(`Image: ${result.imagePath}`)
  console.log(`Strategy: ${result.strategy}`)
  console.log(`Candidates found: ${result.candidateCount}`)
  console.log(
    `Candidate size avg/min/max: ${result.cropQuality.average.width}x${result.cropQuality.average.height} / ${result.cropQuality.min.width}x${result.cropQuality.min.height} / ${result.cropQuality.max.width}x${result.cropQuality.max.height}`
  )
  console.log(`Estimated visible deck entries: ${result.cropQuality.estimatedVisibleDeckEntries ?? 'unknown'}`)
  console.log(`Estimated total quantity: ${result.quantitySummary.estimatedTotalQuantity ?? 'unknown'}`)
  console.log(`Unknown quantities: ${result.quantitySummary.unknownQuantityCount}`)
  console.log(`Debug overlay: ${result.overlayOutputPath}`)
  console.log(`Candidate crops: ${result.cropsOutputDir}`)
  console.log(`Badge crops: ${result.badgesOutputDir ?? 'not written'}`)
  console.log(`Report: ${result.reportOutputPath}`)

  if (result.candidateCount === 0) {
    console.log('')
    console.log('No card-like rectangles were found. Likely failure cases:')
    console.log('- low contrast card borders')
    console.log('- heavy perspective or glare')
    console.log('- overlapping stacks with weak visible edges')
    console.log('- images that need a dedicated physical-photo strategy')
  }

  console.log('')
  console.log('Prototype notes:')
  console.log('- Digital strategy uses foreground tile segmentation for repeated screenshot card entries.')
  console.log('- Physical strategy uses local grayscale normalization, Sobel edge detection, morphological closing, connected components, and card-aspect scoring.')
  console.log('- Does not assume fixed rows, columns, card count, or deck section ordering.')
  console.log('- Next pass should add contour-based rectangle fitting, perspective correction, and stronger scoring for physical photos.')
}

async function main() {
  if (!imagePathArgument) {
    printUsage()
    process.exitCode = 1
    return
  }

  const result = await runCardFrameDetection(imagePathArgument, {
    strategy: strategyArgument,
  })
  printResult(result)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
