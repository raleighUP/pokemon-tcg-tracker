import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCardFrameDetection } from './prototype-card-frame-detection.mjs'
import {
  buildColorHistogram,
  buildDHash,
  buildEdgeVector,
  buildTemplateVector,
  createEmptyFutureFeatureMatching,
  scoreImageFeatures,
} from '../src/lib/deck-image-recognition/local-image-matcher-core.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const imagePathArgument = process.argv[2]
const defaultManifestPath = path.join(
  repoRoot,
  'data',
  'card-image-cache',
  'fixture-subset',
  'manifest.json'
)

function getOptionValue(name, fallback = null) {
  const index = process.argv.indexOf(name)

  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function printUsage() {
  console.log('Usage: node scripts/prototype-card-image-matching.mjs <crop-or-fixture-image> [--manifest path] [--top 10] [--detect]')
  console.log('')
  console.log('Examples:')
  console.log('  node scripts/prototype-card-image-matching.mjs debug-output/card-frame-detection/aob-digital/crops/candidate-001.png')
  console.log('  node scripts/prototype-card-image-matching.mjs test-data/deck-image-importer/aob/digital.png --detect')
}

function resolveRepoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value)
}

export async function loadSharp() {
  try {
    const sharpModule = await import('sharp')

    return sharpModule.default
  } catch {
    throw new Error(
      'Missing image processing dependency: sharp. Install with: npm install --save-dev sharp.'
    )
  }
}

export function loadManifest(manifestPath) {
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Card image cache manifest not found: ${manifestPath}. Run scripts/build-fixture-card-image-cache.mjs first.`
    )
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const cards = Array.isArray(manifest.cards) ? manifest.cards : []

  return {
    ...manifest,
    cards: cards
      .map((card) => ({
        ...card,
        absoluteImagePath: resolveRepoPath(card.imagePath),
      }))
      .filter((card) => existsSync(card.absoluteImagePath)),
  }
}

async function getRawPixels(sharp, imagePath, width, height, options = {}) {
  let image = sharp(imagePath).rotate()
  const metadata = await image.metadata()

  if (options.region) {
    const sourceWidth = metadata.width ?? 0
    const sourceHeight = metadata.height ?? 0
    const left = Math.max(0, Math.round(sourceWidth * options.region.x))
    const top = Math.max(0, Math.round(sourceHeight * options.region.y))
    const extractWidth = Math.max(
      1,
      Math.min(sourceWidth - left, Math.round(sourceWidth * options.region.width))
    )
    const extractHeight = Math.max(
      1,
      Math.min(sourceHeight - top, Math.round(sourceHeight * options.region.height))
    )

    image = image.extract({
      left,
      top,
      width: extractWidth,
      height: extractHeight,
    })
  }

  image = image
    .resize({
      width,
      height,
      fit: options.fit ?? 'fill',
      background: '#ffffff',
    })
    .flatten({ background: '#ffffff' })
    .ensureAlpha()
    .raw()

  const { data } = await image.toBuffer({ resolveWithObject: true })

  return data
}

async function extractImageFeatures(sharp, imagePath) {
  const hashPixels = await getRawPixels(sharp, imagePath, 9, 8)
  const histogramPixels = await getRawPixels(sharp, imagePath, 64, 88, {
    fit: 'cover',
  })
  const templatePixels = await getRawPixels(sharp, imagePath, 32, 44, {
    fit: 'fill',
  })
  const artPixels = await getRawPixels(sharp, imagePath, 32, 24, {
    fit: 'fill',
    region: { x: 0.08, y: 0.13, width: 0.84, height: 0.34 },
  })
  const titlePixels = await getRawPixels(sharp, imagePath, 32, 8, {
    fit: 'fill',
    region: { x: 0.08, y: 0.02, width: 0.84, height: 0.1 },
  })
  const lowerPixels = await getRawPixels(sharp, imagePath, 32, 18, {
    fit: 'fill',
    region: { x: 0.08, y: 0.48, width: 0.84, height: 0.3 },
  })
  const edgePixels = await getRawPixels(sharp, imagePath, 24, 32, {
    fit: 'fill',
  })

  return {
    perceptualHash: buildDHash(hashPixels),
    colorHistogram: buildColorHistogram(histogramPixels),
    templateVector: buildTemplateVector(templatePixels),
    artTemplateVector: buildTemplateVector(artPixels),
    titleTemplateVector: buildTemplateVector(titlePixels),
    lowerTemplateVector: buildTemplateVector(lowerPixels),
    edgeVector: buildEdgeVector(edgePixels, 24, 32),
    futureFeatureMatching: createEmptyFutureFeatureMatching(),
  }
}

function shouldDetectCandidates(imagePath) {
  if (hasFlag('--detect')) return true

  const relativePath = path.relative(repoRoot, imagePath).replaceAll('\\', '/')
  const fileName = path.basename(imagePath).toLowerCase()

  return (
    relativePath.startsWith('test-data/deck-image-importer/') ||
    fileName.startsWith('digital') ||
    fileName.startsWith('physical')
  )
}

export async function resolveCandidateImages(imagePath) {
  if (!shouldDetectCandidates(imagePath)) {
    return [
      {
        id: path.basename(imagePath, path.extname(imagePath)),
        imagePath,
      },
    ]
  }

  const strategy = path.basename(imagePath).toLowerCase().startsWith('digital')
    ? 'digital'
    : 'auto'
  const detectionResult = await runCardFrameDetection(imagePath, { strategy })

  return detectionResult.candidates.map((candidate) => ({
    id: candidate.id,
    imagePath: path.join(detectionResult.cropsOutputDir, `${candidate.id}.png`),
  }))
}

export async function buildReferenceFeatureIndex(sharp, cards) {
  const index = []

  for (const card of cards) {
    index.push({
      card,
      features: await extractImageFeatures(sharp, card.absoluteImagePath),
    })
  }

  return index
}

async function scoreCandidateImage(sharp, imagePath, referenceIndex, topLimit) {
  const candidateFeatures = await extractImageFeatures(sharp, imagePath)

  return referenceIndex
    .map(({ card, features }) => {
      const scoredMatch = scoreImageFeatures(candidateFeatures, features)

      return {
        name: card.name ?? card.englishName,
        englishName: card.englishName ?? card.name,
        localizedName: card.localizedName,
        setCode: card.tcglSetCode ?? card.setCode,
        cardNumber: card.cardNumber,
        localizedSetCode: card.localizedSetCode,
        localizedSetName: card.localizedSetName,
        localizedCardNumber: card.localizedCardNumber,
        category: card.category,
        language: card.language ?? 'english',
        source: card.source,
        canonicalIdentity: card.canonicalIdentity,
        languageEquivalenceGroupId: card.languageEquivalenceGroupId,
        mapping: card.mapping,
        score: scoredMatch.score,
        confidence: scoredMatch.confidence,
        imageReferenceId: card.id,
        imageUrl: card.imageUrl,
        localImagePath: card.imagePath,
        scoreComponents: scoredMatch.components,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topLimit)
}

function scoreMargin(matches) {
  const best = matches[0]
  const runnerUp = matches[1]

  return best && runnerUp ? Number((best.confidence - runnerUp.confidence).toFixed(4)) : null
}

function shouldUseVariant(variant, fallback) {
  const variantBest = variant.matches[0]
  const fallbackBest = fallback.matches[0]

  if (!variantBest || !fallbackBest) return Boolean(variantBest)
  if (variant === fallback) return true

  const confidenceGain = variantBest.confidence - fallbackBest.confidence
  const variantMargin = variant.scoreMargin ?? 0
  const fallbackMargin = fallback.scoreMargin ?? 0

  return (
    confidenceGain >= 0.022 &&
    variantMargin >= Math.max(0.018, fallbackMargin + 0.006)
  )
}

export async function matchCandidate(sharp, candidate, referenceIndex, topLimit) {
  const variants =
    Array.isArray(candidate.matchingCropVariants) &&
    candidate.matchingCropVariants.length > 0
      ? candidate.matchingCropVariants
      : [
          {
            name: 'detected-crop',
            imagePath: candidate.imagePath,
            bounds: candidate.matchingBounds ?? null,
            reason: 'Default detected crop.',
          },
        ]
  const variantResults = []

  for (const variant of variants) {
    const matches = await scoreCandidateImage(
      sharp,
      variant.imagePath,
      referenceIndex,
      topLimit
    )

    variantResults.push({
      name: variant.name,
      cropImagePath: path.relative(repoRoot, variant.imagePath),
      bounds: variant.bounds ?? null,
      reason: variant.reason ?? null,
      matches,
      scoreMargin: scoreMargin(matches),
    })
  }

  const fallback = variantResults[0]
  const strongest = [...variantResults].sort((left, right) => {
    const bestDifference =
      (right.matches[0]?.confidence ?? 0) - (left.matches[0]?.confidence ?? 0)

    return bestDifference || (right.scoreMargin ?? 0) - (left.scoreMargin ?? 0)
  })[0] ?? fallback
  const selected = shouldUseVariant(strongest, fallback) ? strongest : fallback

  return {
    candidateId: candidate.id,
    cropImagePath: selected.cropImagePath,
    matches: selected.matches,
    scoreMargin: selected.scoreMargin,
    matchingVariant: {
      name: selected.name,
      cropImagePath: selected.cropImagePath,
      bounds: selected.bounds,
      reason: selected.reason,
      selectedStrongestVariant: selected === strongest,
    },
    variantResults: variantResults.map((variant) => ({
      name: variant.name,
      cropImagePath: variant.cropImagePath,
      bounds: variant.bounds,
      reason: variant.reason,
      scoreMargin: variant.scoreMargin,
      top3: variant.matches.slice(0, 3).map((match) => ({
        name: match.name,
        setCode: match.setCode,
        cardNumber: match.cardNumber,
        category: match.category,
        confidence: match.confidence,
        score: match.score,
      })),
    })),
  }
}

async function main() {
  if (!imagePathArgument) {
    printUsage()
    process.exitCode = 1
    return
  }

  const imagePath = resolveRepoPath(imagePathArgument)
  const manifestPath = resolveRepoPath(
    getOptionValue('--manifest', defaultManifestPath)
  )
  const topLimit = Math.max(1, Number(getOptionValue('--top', '10')) || 10)

  if (!existsSync(imagePath)) {
    throw new Error(`Input image not found: ${imagePath}`)
  }

  const sharp = await loadSharp()
  const manifest = loadManifest(manifestPath)

  if (manifest.cards.length === 0) {
    throw new Error(
      `No cached fixture card images found in ${manifestPath}. Fill expected.txt files and run scripts/build-fixture-card-image-cache.mjs.`
    )
  }

  const candidates = await resolveCandidateImages(imagePath)
  const referenceIndex = await buildReferenceFeatureIndex(sharp, manifest.cards)
  const results = []

  for (const candidate of candidates) {
    results.push(await matchCandidate(sharp, candidate, referenceIndex, topLimit))
  }

  console.log(JSON.stringify({
    inputImagePath: path.relative(repoRoot, imagePath),
    manifestPath: path.relative(repoRoot, manifestPath),
    referenceCount: manifest.cards.length,
    candidateCount: candidates.length,
    architecture: manifest.architecture ?? {
      primaryPath: 'local-image-matching',
      aiVisionProviders: false,
    },
    results,
  }, null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
