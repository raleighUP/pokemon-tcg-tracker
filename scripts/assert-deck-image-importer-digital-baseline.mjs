import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = path.join(
  repoRoot,
  'test-data',
  'deck-image-importer',
  'baselines',
  'digital-baseline.json'
)
const reportPath = path.join(
  repoRoot,
  'debug-output',
  'deck-image-importer-browser',
  'report.json'
)

function readJson(filePath, label) {
  if (!existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`)
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`
}

const baseline = readJson(baselinePath, 'Digital benchmark baseline')
const report = readJson(reportPath, 'Digital evaluator report')
const thresholds = baseline.regressionThresholds
const failures = []
const fixtureResults = Array.isArray(report.results) ? report.results : []
const totals = fixtureResults.reduce((summary, result) => ({
  detectedEntries: summary.detectedEntries + result.expectedRows,
  representedCandidateCount: summary.representedCandidateCount + result.expectedRows,
  wrongCardMatches: summary.wrongCardMatches + result.wrongIdentities,
  falseExtraRows: summary.falseExtraRows + result.falseExtraRows,
  quantityReviewRows: summary.quantityReviewRows + result.quantityReviewRows,
  quantityExactMatches: summary.quantityExactMatches + result.quantityCorrectRows,
  exactRowMatches: summary.exactRowMatches + result.exactRows,
  expectedRowCount: summary.expectedRowCount + result.expectedRows,
}), {
  detectedEntries: 0,
  representedCandidateCount: 0,
  wrongCardMatches: 0,
  falseExtraRows: 0,
  quantityReviewRows: 0,
  quantityExactMatches: 0,
  exactRowMatches: 0,
  expectedRowCount: 0,
})
const quantityAccuracy =
  totals.expectedRowCount > 0
    ? totals.quantityExactMatches / totals.expectedRowCount
    : 0
const exactRowAccuracy =
  totals.expectedRowCount > 0
    ? totals.exactRowMatches / totals.expectedRowCount
    : 0

if (fixtureResults.length !== baseline.fixtureCount) {
  failures.push(`fixture count ${fixtureResults.length} != ${baseline.fixtureCount}`)
}
if ((totals.wrongCardMatches ?? Infinity) > thresholds.maximumCardIdentityErrors) {
  failures.push(
    `wrong identities ${totals.wrongCardMatches} > ${thresholds.maximumCardIdentityErrors}`
  )
}
if ((totals.falseExtraRows ?? Infinity) > thresholds.maximumFalseExtraRows) {
  failures.push(
    `false extra rows ${totals.falseExtraRows} > ${thresholds.maximumFalseExtraRows}`
  )
}
if ((totals.quantityReviewRows ?? Infinity) > thresholds.maximumQuantityReviewRows) {
  failures.push(
    `quantity review rows ${totals.quantityReviewRows} > ${thresholds.maximumQuantityReviewRows}`
  )
}
if ((totals.representedCandidateCount ?? 0) < thresholds.minimumRepresentedCandidates) {
  failures.push(
    `represented candidates ${totals.representedCandidateCount} < ${thresholds.minimumRepresentedCandidates}`
  )
}
if (quantityAccuracy < thresholds.minimumQuantityAccuracy) {
  failures.push(
    `quantity accuracy ${percent(quantityAccuracy)} < ${percent(thresholds.minimumQuantityAccuracy)}`
  )
}
if (exactRowAccuracy < thresholds.minimumExactRowAccuracy) {
  failures.push(
    `exact-row accuracy ${percent(exactRowAccuracy)} < ${percent(thresholds.minimumExactRowAccuracy)}`
  )
}

for (const fixtureName of baseline.perfectTotalFixtures) {
  const result = fixtureResults.find((fixture) => fixture.fixture === fixtureName)
  if (!result) {
    failures.push(`perfect-total fixture missing: ${fixtureName}`)
    continue
  }
  const difference = Math.abs(result.recognizedTotal - result.expectedTotal)
  if (difference > thresholds.perfectFixtureTotalTolerance) {
    failures.push(
      `${fixtureName} total ${result.recognizedTotal} != ${result.expectedTotal}`
    )
  }
}

if (failures.length > 0) {
  console.error('Digital Deck Picture Importer regression check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('Digital Deck Picture Importer regression check passed.')
  console.log(`Fixtures: ${fixtureResults.length}`)
  console.log(`Candidates represented: ${totals.representedCandidateCount}/${totals.detectedEntries}`)
  console.log(`Wrong identities: ${totals.wrongCardMatches}`)
  console.log(`False extra rows: ${totals.falseExtraRows}`)
  console.log(`Quantity review rows: ${totals.quantityReviewRows}`)
  console.log(`Quantity accuracy: ${percent(quantityAccuracy)}`)
  console.log(`Exact-row accuracy: ${percent(exactRowAccuracy)}`)
}
