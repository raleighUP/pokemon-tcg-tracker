import path from 'node:path'
import {
  discoverDeckImageFixtures,
  repoRoot,
} from './lib/deck-image-fixtures.mjs'
import {
  parseTcglDecklist,
  tcglIdentityKey,
} from './lib/tcgl-decklist-parser.mjs'
import {
  buildReferenceFeatureIndex,
  loadManifest,
  loadSharp,
  matchCandidate,
  resolveCandidateImages,
} from './prototype-card-image-matching.mjs'

const LOW_CONFIDENCE_THRESHOLD = 0.68
const CLOSE_MATCH_DELTA = 0.02
const defaultManifestPath = path.join(
  repoRoot,
  'data',
  'card-image-cache',
  'fixture-subset',
  'manifest.json'
)

function displayCard(row) {
  if (!row) return 'extra candidate'

  return `${row.name} ${row.setCode} ${row.cardNumber}`.trim()
}

function normalizedIdentityKey(row) {
  if (!row) return null

  const normalizedName = row.name.toLowerCase().replace(/^basic\s+/, '')

  if (
    row.category === 'Energy' &&
    /^[a-z]+ energy$/.test(normalizedName)
  ) {
    return `energy|${normalizedName}`
  }

  return tcglIdentityKey(row)
}

function matchToRow(match) {
  return {
    category: match.category,
    quantity: 1,
    name: match.name,
    setCode: match.setCode,
    cardNumber: match.cardNumber,
  }
}

function isCloseMatch(matches) {
  const best = matches[0]
  const runnerUp = matches[1]

  if (!best || !runnerUp) return false

  return best.confidence - runnerUp.confidence <= CLOSE_MATCH_DELTA
}

function decisionForMatches(matches) {
  const best = matches[0]
  const runnerUp = matches[1]

  if (!best) {
    return {
      status: 'manual-review',
      reason: 'no match',
      best,
      runnerUp,
      closeMatch: false,
    }
  }

  const closeMatch = isCloseMatch(matches)

  if (best.confidence < LOW_CONFIDENCE_THRESHOLD) {
    return {
      status: 'manual-review',
      reason: `low confidence ${best.confidence}`,
      best,
      runnerUp,
      closeMatch,
    }
  }

  if (closeMatch) {
    return {
      status: 'manual-review',
      reason: `close top scores ${Number((best.confidence - runnerUp.confidence).toFixed(4))}`,
      best,
      runnerUp,
      closeMatch,
    }
  }

  return {
    status: 'committed',
    reason: null,
    best,
    runnerUp,
    closeMatch,
  }
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function summarizeConfusions(confusions) {
  return Array.from(confusions.entries())
    .map(([pair, count]) => ({ pair, count }))
    .sort((left, right) => right.count - left.count || left.pair.localeCompare(right.pair))
    .slice(0, 8)
}

async function evaluateDigitalFixture(fixture, image, sharp, referenceIndex) {
  const expectedRows = parseTcglDecklist(fixture.expectedText)
  const candidates = await resolveCandidateImages(image.absolutePath)
  const rows = []
  const confusions = new Map()
  let exactCardMatches = 0
  let wrongMatches = 0
  let manualReviewRows = 0

  for (const [index, candidate] of candidates.entries()) {
    const expected = expectedRows[index]
    const matchResult = await matchCandidate(sharp, candidate, referenceIndex, 5)
    const decision = decisionForMatches(matchResult.matches)
    const actualRow = decision.best ? matchToRow(decision.best) : null
    const expectedKey = normalizedIdentityKey(expected)
    const actualKey = normalizedIdentityKey(actualRow)
    const exact = Boolean(expectedKey && actualKey && expectedKey === actualKey)

    if (decision.status === 'manual-review') {
      manualReviewRows += 1
    } else if (exact) {
      exactCardMatches += 1
    } else {
      wrongMatches += 1
      increment(
        confusions,
        `${displayCard(expected)} -> ${displayCard(actualRow)}`
      )
    }

    rows.push({
      candidateId: candidate.id,
      expected: displayCard(expected),
      status: decision.status,
      exact,
      selected: decision.best ? displayCard(actualRow) : null,
      confidence: decision.best?.confidence ?? null,
      reason: decision.reason,
      closeMatch: decision.closeMatch,
      top5: matchResult.matches.map((match) => ({
        card: displayCard(matchToRow(match)),
        confidence: match.confidence,
      })),
    })
  }

  return {
    fixture: fixture.fixture,
    imageFile: image.file,
    expectedRows: expectedRows.length,
    candidateRows: candidates.length,
    exactCardMatches,
    wrongMatches,
    manualReviewRows,
    mostCommonConfusionPairs: summarizeConfusions(confusions),
    rows,
  }
}

async function main() {
  const sharp = await loadSharp()
  const manifest = loadManifest(defaultManifestPath)
  const referenceIndex = await buildReferenceFeatureIndex(sharp, manifest.cards)
  const results = []

  for (const fixture of discoverDeckImageFixtures()) {
    const digitalImages = fixture.images.filter(
      (image) => image.sourceType === 'digital'
    )

    for (const image of digitalImages) {
      results.push(
        await evaluateDigitalFixture(fixture, image, sharp, referenceIndex)
      )
    }
  }

  const totals = results.reduce(
    (summary, result) => ({
      exactCardMatches: summary.exactCardMatches + result.exactCardMatches,
      wrongMatches: summary.wrongMatches + result.wrongMatches,
      manualReviewRows: summary.manualReviewRows + result.manualReviewRows,
      candidateRows: summary.candidateRows + result.candidateRows,
    }),
    {
      exactCardMatches: 0,
      wrongMatches: 0,
      manualReviewRows: 0,
      candidateRows: 0,
    }
  )

  if (process.argv.includes('--summary')) {
    console.log(
      JSON.stringify(
        {
          totals,
          results: results.map((result) => ({
            fixture: result.fixture,
            imageFile: result.imageFile,
            expectedRows: result.expectedRows,
            candidateRows: result.candidateRows,
            exactCardMatches: result.exactCardMatches,
            wrongMatches: result.wrongMatches,
            manualReviewRows: result.manualReviewRows,
            mostCommonConfusionPairs: result.mostCommonConfusionPairs,
          })),
        },
        null,
        2
      )
    )
    return
  }

  console.log(JSON.stringify({ totals, results }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
