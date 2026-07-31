import path from 'node:path'
import {
  deckImageFixtureRoot,
  discoverDeckImageFixtures,
  repoRoot,
} from './lib/deck-image-fixtures.mjs'
import { runCardFrameDetection } from './prototype-card-frame-detection.mjs'

const fixtures = discoverDeckImageFixtures()
const results = []

function strategyForSourceType(sourceType) {
  if (sourceType === 'digital') return 'digital'
  if (sourceType === 'physical') return 'physical'

  return 'auto'
}

function warningForResult(sourceType, candidateCount) {
  if (sourceType === 'digital' && candidateCount < 15) {
    return 'Suspiciously low digital candidate count; expected repeated deck-entry tiles.'
  }

  if (sourceType === 'physical' && candidateCount < 10) {
    return 'Suspiciously low physical candidate count; expected at least several visible card frames.'
  }

  return null
}

console.log(`Deck image fixture root: ${deckImageFixtureRoot}`)
console.log('')

for (const fixture of fixtures) {
  if (fixture.images.length === 0) {
    results.push({
      fixture: fixture.fixture,
      imageFile: null,
      sourceType: 'unknown',
      candidateCount: 0,
      cropQuality: null,
      quantitySummary: null,
      overlayOutputPath: null,
      cropsOutputDir: null,
      badgesOutputDir: null,
      reportOutputPath: null,
      error: 'No supported image files found.',
    })
    continue
  }

  for (const image of fixture.images) {
    const strategy = strategyForSourceType(image.sourceType)

    try {
      const result = await runCardFrameDetection(image.absolutePath, {
        strategy,
      })

      results.push({
        fixture: fixture.fixture,
        imageFile: image.file,
        sourceType: image.sourceType,
        strategy: result.strategy,
        candidateCount: result.candidateCount,
        cropQuality: result.cropQuality,
        quantitySummary: result.quantitySummary,
        overlayOutputPath: path.relative(repoRoot, result.overlayOutputPath),
        cropsOutputDir: path.relative(repoRoot, result.cropsOutputDir),
        badgesOutputDir: result.badgesOutputDir
          ? path.relative(repoRoot, result.badgesOutputDir)
          : null,
        reportOutputPath: path.relative(repoRoot, result.reportOutputPath),
        warning: warningForResult(image.sourceType, result.candidateCount),
        error: null,
      })
    } catch (error) {
      results.push({
        fixture: fixture.fixture,
        imageFile: image.file,
        sourceType: image.sourceType,
        strategy,
        candidateCount: 0,
        cropQuality: null,
        quantitySummary: null,
        overlayOutputPath: null,
        cropsOutputDir: null,
        badgesOutputDir: null,
        reportOutputPath: null,
        warning: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

for (const result of results) {
  console.log(`${result.fixture} / ${result.imageFile ?? 'no image'}`)
  console.log(`  Source type: ${result.sourceType}`)
  console.log(`  Strategy: ${result.strategy}`)
  console.log(`  Candidates: ${result.candidateCount}`)
  if (result.cropQuality) {
    console.log(
      `  Crop size avg/min/max: ${result.cropQuality.average.width}x${result.cropQuality.average.height} / ${result.cropQuality.min.width}x${result.cropQuality.min.height} / ${result.cropQuality.max.width}x${result.cropQuality.max.height}`
    )
    console.log(
      `  Suspicious crops: ${result.cropQuality.suspiciouslySmall.length} small, ${result.cropQuality.suspiciouslyLarge.length} large`
    )
    console.log(
      `  Estimated visible deck entries: ${result.cropQuality.estimatedVisibleDeckEntries ?? 'unknown'}`
    )
  }
  if (result.quantitySummary) {
    console.log(
      `  Estimated total quantity: ${result.quantitySummary.estimatedTotalQuantity ?? 'unknown'}`
    )
    console.log(
      `  Unknown quantities: ${result.quantitySummary.unknownQuantityCount}`
    )
  }
  console.log(`  Overlay: ${result.overlayOutputPath ?? 'not written'}`)
  console.log(`  Crops: ${result.cropsOutputDir ?? 'not written'}`)
  console.log(`  Badge crops: ${result.badgesOutputDir ?? 'not written'}`)
  console.log(`  Report: ${result.reportOutputPath ?? 'not written'}`)

  if (result.warning) {
    console.log(`  Warning: ${result.warning}`)
  }

  if (result.error) {
    console.log(`  Error: ${result.error}`)
  }

  console.log('')
}

const errors = results.filter((result) => result.error)
const warnings = results.filter((result) => result.warning)
const totalCandidates = results.reduce(
  (total, result) => total + result.candidateCount,
  0
)

console.log('Summary')
console.log(`  Images tested: ${results.filter((result) => result.imageFile).length}`)
console.log(`  Errors: ${errors.length}`)
console.log(`  Warnings: ${warnings.length}`)
console.log(`  Total candidates: ${totalCandidates}`)
console.log(
  `  Unknown quantities: ${results.reduce(
    (total, result) => total + (result.quantitySummary?.unknownQuantityCount ?? 0),
    0
  )}`
)

if (errors.length > 0) {
  process.exitCode = 1
}
