import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  discoverDeckImageFixtures,
  repoRoot,
} from './lib/deck-image-fixtures.mjs'
import {
  normalizeDeckText,
  parseTcglDecklist,
  tcglIdentityKey,
  tcglRowKey,
} from './lib/tcgl-decklist-parser.mjs'
import { runCardFrameDetection } from './prototype-card-frame-detection.mjs'
import {
  buildReferenceFeatureIndex,
  loadManifest,
  loadSharp,
  matchCandidate,
} from './prototype-card-image-matching.mjs'
import { DIGITAL_RECOGNITION_CONFIG } from '../src/lib/deck-recognition/digital-recognition-config.mjs'

const groupArgumentIndex = process.argv.indexOf('--group')
const REQUESTED_GROUP =
  groupArgumentIndex >= 0 ? process.argv[groupArgumentIndex + 1] : 'baseline'
const VALID_GROUPS = new Set(['baseline', 'validation', 'all'])
if (!VALID_GROUPS.has(REQUESTED_GROUP)) {
  throw new Error(`Unknown benchmark group "${REQUESTED_GROUP}".`)
}
const OUTPUT_ROOT = path.join(
  repoRoot,
  'debug-output',
  REQUESTED_GROUP === 'validation'
    ? 'deck-image-importer-validation'
    : REQUESTED_GROUP === 'all'
      ? 'deck-image-importer-combined'
      : 'deck-image-importer-evaluation'
)
const MANIFEST_PATH = path.join(
  repoRoot,
  'data',
  'card-image-cache',
  'fixture-subset',
  'manifest.json'
)
const JAPANESE_MANIFEST_PATH = path.join(
  repoRoot,
  'data',
  'card-image-cache',
  'japanese-fixture-subset',
  'manifest.json'
)
const LOW_CONFIDENCE_THRESHOLD =
  DIGITAL_RECOGNITION_CONFIG.minimumCardMatchConfidence
const CLOSE_MATCH_DELTA = 0.02
const TRAINER_ENERGY_CLOSE_MATCH_DELTA = 0.035
const SUSPICIOUS_QUANTITY_CONFIDENCE = 0.62
const CATEGORY_ORDER = ['Pokemon', 'Trainer', 'Energy']
const CARD_ASPECT_RATIO = 63 / 88

function candidateBounds(candidate) {
  return {
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    height: candidate.height,
  }
}

function safeFilePart(value) {
  return value.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
}

function clampBounds(bounds, imageWidth, imageHeight) {
  if (!bounds) return null

  const x = Math.max(0, Math.min(Math.round(bounds.x), imageWidth - 1))
  const y = Math.max(0, Math.min(Math.round(bounds.y), imageHeight - 1))
  const right = Math.max(
    x + 1,
    Math.min(imageWidth, Math.round(bounds.x + bounds.width))
  )
  const bottom = Math.max(
    y + 1,
    Math.min(imageHeight, Math.round(bounds.y + bounds.height))
  )

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  }
}

function insetBounds(bounds, xRatio, topRatio, bottomRatio) {
  return {
    x: bounds.x + bounds.width * xRatio,
    y: bounds.y + bounds.height * topRatio,
    width: bounds.width * (1 - xRatio * 2),
    height: bounds.height * (1 - topRatio - bottomRatio),
  }
}

function clipBadgeOverlap(bounds, badgeBounds) {
  if (!bounds || !badgeBounds) return bounds

  const boundsBottom = bounds.y + bounds.height
  const badgeBottom = badgeBounds.y + badgeBounds.height
  const horizontalOverlap = Math.max(
    0,
    Math.min(bounds.x + bounds.width, badgeBounds.x + badgeBounds.width) -
      Math.max(bounds.x, badgeBounds.x)
  )
  const verticalOverlap = Math.max(
    0,
    Math.min(boundsBottom, badgeBottom) - Math.max(bounds.y, badgeBounds.y)
  )
  const overlapsBadge =
    horizontalOverlap > bounds.width * 0.08 && verticalOverlap > bounds.height * 0.04

  if (!overlapsBadge) return bounds

  const clippedBottom = Math.max(
    bounds.y + bounds.height * 0.68,
    Math.min(boundsBottom, badgeBounds.y - bounds.height * 0.015)
  )

  return {
    ...bounds,
    height: clippedBottom - bounds.y,
  }
}

function aspectQuality(bounds) {
  if (!bounds) return 0

  const aspect = bounds.width / Math.max(1, bounds.height)
  return Math.max(0, 1 - Math.abs(aspect - CARD_ASPECT_RATIO) / 0.42)
}

async function writeMatchingCrop(sharp, sourceImagePath, outputPath, bounds) {
  await sharp(sourceImagePath)
    .rotate()
    .extract({
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
    })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(outputPath)
}

async function buildMatchingCropVariants(
  sharp,
  imagePath,
  candidate,
  candidateImagePath,
  outputDir,
  imageWidth,
  imageHeight
) {
  const variants = [
    {
      name: 'detected-crop',
      imagePath: candidateImagePath,
      bounds: candidateBounds(candidate),
      reason: 'Default detection crop with debug padding.',
      cropQualityScore: candidate.score ?? 0,
    },
  ]

  if (candidate.layoutSource !== 'repeated-grid') return variants

  mkdirSync(outputDir, { recursive: true })

  const specs = [
    {
      name: 'card-frame',
      bounds: candidate.cardFrameBounds ?? candidate.refinedBounds ?? candidateBounds(candidate),
      reason: 'Refined repeated-grid card-frame bounds.',
    },
    {
      name: 'card-frame-no-badge',
      bounds: clipBadgeOverlap(
        candidate.cardFrameBounds ?? candidate.refinedBounds ?? candidateBounds(candidate),
        candidate.badgeBounds
      ),
      reason: 'Refined card frame clipped above overlapping quantity badge.',
    },
    {
      name: 'card-frame-inset',
      bounds: insetBounds(
        candidate.cardFrameBounds ?? candidate.refinedBounds ?? candidateBounds(candidate),
        0.025,
        0.025,
        0.07
      ),
      reason: 'Small inset to remove pale margins and card shadow.',
    },
    {
      name: 'upper-card-dominant',
      bounds: {
        ...(candidate.cardFrameBounds ?? candidate.refinedBounds ?? candidateBounds(candidate)),
        height:
          (candidate.cardFrameBounds ?? candidate.refinedBounds ?? candidateBounds(candidate))
            .height * 0.78,
      },
      reason: 'Upper/name/art-dominant crop for overlapped portrait entries.',
    },
    {
      name: 'coarse-no-badge',
      bounds: clipBadgeOverlap(
        candidate.tileBounds ?? candidate.coarseBounds ?? candidateBounds(candidate),
        candidate.badgeBounds
      ),
      reason: 'Coarse tile bounds clipped above overlapping quantity badge.',
    },
  ]

  const seen = new Set()

  for (const spec of specs) {
    const bounds = clampBounds(spec.bounds, imageWidth, imageHeight)

    if (!bounds || bounds.width < 24 || bounds.height < 32) continue

    const key = [bounds.x, bounds.y, bounds.width, bounds.height].join(':')
    if (seen.has(key)) continue
    seen.add(key)

    const outputPath = path.join(
      outputDir,
      `${candidate.id}-${safeFilePart(spec.name)}.png`
    )
    await writeMatchingCrop(sharp, imagePath, outputPath, bounds)

    variants.push({
      name: spec.name,
      imagePath: outputPath,
      bounds,
      reason: spec.reason,
      cropQualityScore: Number(
        (((candidate.score ?? 0) * 0.7 + aspectQuality(bounds) * 0.3)).toFixed(4)
      ),
    })
  }

  return variants
}

function boundsIntersectionRatio(left, right) {
  if (!left || !right) return 0

  const leftRight = left.x + left.width
  const rightRight = right.x + right.width
  const leftBottom = left.y + left.height
  const rightBottom = right.y + right.height
  const xOverlap = Math.max(0, Math.min(leftRight, rightRight) - Math.max(left.x, right.x))
  const yOverlap = Math.max(0, Math.min(leftBottom, rightBottom) - Math.max(left.y, right.y))
  const intersection = xOverlap * yOverlap
  const smallerArea = Math.min(left.width * left.height, right.width * right.height)

  return smallerArea > 0 ? intersection / smallerArea : 0
}

function topMatches(matchResult, limit = 10) {
  return matchResult.matches.slice(0, limit).map((match) => ({
    card: displayCard({
      category: match.category,
      quantity: 1,
      name: match.name,
      setCode: match.setCode,
      cardNumber: match.cardNumber,
    }),
    category: match.category,
    language: match.language ?? 'english',
    localizedName: match.localizedName ?? null,
    localizedSetCode: match.localizedSetCode ?? null,
    localizedCardNumber: match.localizedCardNumber ?? null,
    canonicalEnglishName: match.englishName ?? match.name,
    printMappingStatus: match.mapping?.status ?? 'resolved-print',
    mappingConfidence: match.mapping?.confidence ?? null,
    confidence: match.confidence,
    score: match.score,
    scoreComponents: match.scoreComponents,
  }))
}

function sourceCandidate(candidate, matchResult, decision, quantityRead) {
  return {
    candidateId: candidate.id,
    bounds: candidateBounds(candidate),
    quantity: candidate.quantity ?? 1,
    quantitySource: quantityRead.quantitySource,
    quantityConfidence: candidate.quantityConfidence,
    status: decision.status,
    reason: decision.reason,
    top5: topMatches(matchResult, 5),
    top10: topMatches(matchResult, 10),
  }
}

function displayCard(row) {
  if (!row) return 'extra candidate'

  return `${row.name} ${row.setCode} ${row.cardNumber}`.trim()
}

function normalizedIdentityKey(row) {
  if (!row) return null

  const normalizedName = row.name.toLowerCase().replace(/^basic\s+/, '')

  if (row.category === 'Energy' && /^[a-z]+ energy$/.test(normalizedName)) {
    return `energy|${normalizedName}`
  }

  return tcglIdentityKey(row)
}

function normalizedRowKey(row) {
  const identity = normalizedIdentityKey(row)

  return identity ? `${identity}|${row.quantity}` : null
}

function exactIdentityKey(row) {
  return row ? tcglIdentityKey(row) : null
}

function buildReferenceIdentityKeys(referenceIndex) {
  const keys = new Set()

  for (const { card } of referenceIndex) {
    const row = {
          category: card.category,
          quantity: 1,
          name: card.name,
          setCode: card.setCode,
          cardNumber: card.cardNumber,
        }
    const exactKey = exactIdentityKey(row)

    if (exactKey) keys.add(exactKey)
    if (isBasicEnergyCard(row)) {
      keys.add(`normalized:${normalizedIdentityKey(row)}`)
    }
  }

  return keys
}

function isReferenceMissing(expected, referenceIdentityKeys) {
  const key = exactIdentityKey(expected)

  if (!key || referenceIdentityKeys.has(key)) return false

  return !(
    isBasicEnergyCard(expected) &&
    referenceIdentityKeys.has(`normalized:${normalizedIdentityKey(expected)}`)
  )
}

function isBasicEnergyCard(card) {
  return (
    card.category === 'Energy' &&
    /^(?:basic\s+)?(?:grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy$/i.test(
      card.name.trim()
    )
  )
}

function quantityValidationWarning(card) {
  if ((card.quantity ?? 0) <= 4) return null
  if (isBasicEnergyCard(card)) return null

  if (card.category === 'Energy') {
    return 'Special Energy cards are normally limited to 4 copies.'
  }

  return `${card.category} cards are normally limited to 4 copies.`
}

function quantityUncertaintyWarning(candidate) {
  const quantity = candidate.quantity ?? 1
  const confidence = candidate.quantityConfidence ?? 0

  if (
    candidate.quantitySource === 'digital-badge' &&
    [4, 5].includes(quantity) &&
    confidence < SUSPICIOUS_QUANTITY_CONFIDENCE
  ) {
    return `Quantity ${quantity} read has low badge confidence (${Math.round(
      confidence * 100
    )}%); verify the visible badge.`
  }

  return null
}

function matchToCard(match, candidate, decision, quantityRead, matchResult) {
  const notes = []

  if (quantityRead.quantitySource === 'unknown') {
    notes.push('Quantity guessed from unreadable badge.')
  }

  if (decision.reason) {
    notes.push(decision.reason)
  }

  if (match.language === 'japanese') {
    notes.push(
      `Matched Japanese reference ${match.localizedName ?? match.name}; normalized to English TCGL output.`
    )
  }

  if (match.mapping?.status && match.mapping.status !== 'resolved-print') {
    notes.push(
      match.mapping.status === 'canonical-name-only'
        ? 'Japanese print matched, but exact English print mapping is unresolved.'
        : 'Japanese print mapping is unresolved.'
    )
  }

  const quantityWarning = quantityUncertaintyWarning(candidate)

  if (quantityWarning) {
    notes.push(quantityWarning)
  }

  const card = {
    id: `digital-${candidate.id}-${match.imageReferenceId}`,
    quantity: candidate.quantity ?? 1,
    name: match.name,
    setCode: match.setCode,
    cardNumber: match.cardNumber,
    category: match.category,
    confidence: match.confidence,
    sourceLanguage: match.language ?? 'english',
    localizedName: match.localizedName,
    localizedSetCode: match.localizedSetCode,
    localizedCardNumber: match.localizedCardNumber,
    languageEquivalenceGroupId: match.languageEquivalenceGroupId,
    printMappingStatus: match.mapping?.status ?? 'resolved-print',
    canonicalMappingConfidence: match.mapping?.confidence ?? 1,
    notes,
    bounds: candidateBounds(candidate),
    sourceCandidateIds: [candidate.id],
    sourceCandidates: [sourceCandidate(candidate, matchResult, decision, quantityRead)],
  }
  const warning = quantityValidationWarning(card)

  return {
    ...card,
    quantityValidationWarning: warning ?? undefined,
    notes: warning ? Array.from(new Set([...notes, warning])) : notes,
  }
}

function unresolvedCard(candidate, index, decision, quantityRead, matchResult, expected = null) {
  const notes = ['Manual review needed for this crop.']

  if (quantityRead.quantitySource === 'unknown') {
    notes.push('Quantity guessed from unreadable badge.')
  }

  if (decision.reason) {
    notes.push(decision.reason)
  }

  const quantityWarning = quantityUncertaintyWarning(candidate)

  if (quantityWarning) {
    notes.push(quantityWarning)
  }

  return {
    id: `unresolved-${candidate.id}`,
    quantity: candidate.quantity ?? 1,
    name: expected?.name ?? `Unresolved crop ${index + 1}`,
    setCode: expected?.setCode ?? '',
    cardNumber: expected?.cardNumber ?? '',
    category: expected?.category ?? 'Pokemon',
    confidence: 0,
    sourceLanguage: 'unknown',
    printMappingStatus: 'unresolved',
    canonicalMappingConfidence: 0,
    notes,
    bounds: candidateBounds(candidate),
    sourceCandidateIds: [candidate.id],
    sourceCandidates: [sourceCandidate(candidate, matchResult, decision, quantityRead)],
  }
}

function closeMatchDeltaFor(best) {
  if (!best) return CLOSE_MATCH_DELTA
  if (best.category === 'Trainer' || best.category === 'Energy') {
    return TRAINER_ENERGY_CLOSE_MATCH_DELTA
  }

  return CLOSE_MATCH_DELTA
}

function isCloseMatch(matches) {
  const best = matches[0]
  const challengers = matches.slice(1, 3)

  if (!best || challengers.length === 0) return false

  const delta = closeMatchDeltaFor(best)

  return challengers.some((match) => best.confidence - match.confidence <= delta)
}

function decisionForMatches(matches) {
  const best = matches[0]
  const runnerUp = matches[1]

  if (!best) {
    return {
      status: 'manual-review',
      resolution: 'unresolved',
      reason: 'No local image match found.',
      best,
      runnerUp,
      closeMatch: false,
    }
  }

  const closestChallenger = matches
    .slice(1, 3)
    .sort(
      (left, right) =>
        Math.abs(best.confidence - left.confidence) -
        Math.abs(best.confidence - right.confidence)
    )[0]
  const closeMatch = isCloseMatch(matches)

  if (best.confidence < LOW_CONFIDENCE_THRESHOLD) {
    return {
      status: 'low-confidence-candidate',
      resolution: 'recognized-review',
      reason: `Low confidence ${best.confidence}.`,
      best,
      runnerUp,
      closeMatch,
    }
  }

  if (closeMatch) {
    const closeDelta = Number(
      (best.confidence - (closestChallenger?.confidence ?? runnerUp.confidence)).toFixed(4)
    )

    return {
      status: 'low-confidence-candidate',
      resolution: 'recognized-review',
      reason: `Close top scores ${closeDelta}.`,
      best,
      runnerUp: closestChallenger ?? runnerUp,
      closeMatch,
    }
  }

  return {
    status: 'committed',
    resolution: 'recognized',
    reason: null,
    best,
    runnerUp,
    closeMatch,
  }
}

function decisionForCandidate(candidate, matches) {
  const decision = decisionForMatches(matches)

  if (
    candidate.layoutSource === 'repeated-grid' &&
    decision.status === 'low-confidence-candidate'
  ) {
    return {
      ...decision,
      resolution: 'unresolved',
      reason: `${decision.reason} Repeated-grid crop kept for manual review instead of committing a weak identity.`,
    }
  }

  return decision
}

function boundsOverlapArea(left, right) {
  if (!left || !right) return 0

  const xOverlap = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)
  )
  const yOverlap = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)
  )

  return xOverlap * yOverlap
}

function classifyMatchingFailure(candidate, report) {
  const categories = []
  const finalBounds = report.finalMatchingBounds ?? report.bounds
  const cardFrameBounds = report.refinedCardFrameBounds ?? candidate.cardFrameBounds
  const tileBounds = report.coarseTileBounds ?? candidate.tileBounds
  const scoreMargin = report.scoreMargin ?? 0

  if (report.referenceMissing) {
    categories.push('reference image missing')
  }

  if (
    cardFrameBounds &&
    tileBounds &&
    Math.abs(cardFrameBounds.y - tileBounds.y) > tileBounds.height * 0.22
  ) {
    categories.push('crop shifted vertically')
  }

  if (
    finalBounds &&
    cardFrameBounds &&
    (finalBounds.height > cardFrameBounds.height * 1.12 ||
      finalBounds.width > cardFrameBounds.width * 1.12)
  ) {
    categories.push('excessive pale background')
  }

  if (
    finalBounds &&
    candidate.badgeBounds &&
    boundsOverlapArea(finalBounds, candidate.badgeBounds) > finalBounds.width * finalBounds.height * 0.025
  ) {
    categories.push('badge contaminates matching crop')
  }

  if (report.status === 'low-confidence-candidate' || scoreMargin <= 0.035) {
    categories.push('low score margin')
  }

  if (
    report.selected &&
    report.expected &&
    report.selected !== report.expected &&
    !report.referenceMissing
  ) {
    categories.push(scoreMargin <= 0.035 ? 'visually similar card selected' : 'correct reference exists but scores poorly')
  }

  if (report.resolution === 'unresolved' && !report.referenceMissing && !report.selected) {
    categories.push('correct reference exists but scores poorly')
  }

  return categories.length > 0 ? Array.from(new Set(categories)) : ['no failure']
}

function mergeIdentityKey(card) {
  return [
    card.name.trim().toLowerCase(),
    card.setCode.trim().toLowerCase(),
    card.cardNumber.trim().toLowerCase(),
    card.category,
  ].join('|')
}

function mergeExactDuplicateCards(cards) {
  const merged = new Map()

  for (const card of cards) {
    const key = mergeIdentityKey(card)
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, {
        ...card,
        notes: card.notes ? [...card.notes] : [],
        sourceCandidateIds: [...(card.sourceCandidateIds ?? [])],
        sourceCandidates: [...(card.sourceCandidates ?? [])],
      })
      continue
    }

    const preferred = card.confidence > existing.confidence ? card : existing
    const notes = Array.from(new Set([...(existing.notes ?? []), ...(card.notes ?? [])]))
    const sourceCandidates = [...(existing.sourceCandidates ?? [])]
    const isNearDuplicate = sourceCandidates.some(
      (source) => boundsIntersectionRatio(source.bounds, card.bounds) >= 0.72
    )
    const nextSourceCandidates = [...sourceCandidates, ...(card.sourceCandidates ?? [])]
    const sourceCandidateIds = Array.from(
      new Set([...(existing.sourceCandidateIds ?? []), ...(card.sourceCandidateIds ?? [])])
    )

    if (isNearDuplicate) {
      notes.push(
        `Near-duplicate crop suppressed; quantity not summed from ${card.sourceCandidateIds?.join(', ') ?? card.id}.`
      )
    }

    merged.set(key, {
      ...preferred,
      id: existing.id,
      quantity: isNearDuplicate
        ? Math.max(existing.quantity, card.quantity)
        : existing.quantity + card.quantity,
      confidence: Math.max(existing.confidence, card.confidence),
      notes,
      sourceCandidateIds,
      sourceCandidates: nextSourceCandidates,
    })
  }

  return Array.from(merged.values())
}

function countCards(rows) {
  return rows.reduce((total, row) => total + row.quantity, 0)
}

function formatTcgl(cards) {
  return [
    ...CATEGORY_ORDER.map((category) => {
      const rows = cards.filter((card) => card.category === category && card.quantity > 0)
      const total = countCards(rows)
      const lines = rows.map((card) => {
        const suffix = [card.setCode, card.cardNumber]
          .map((value) => value.trim())
          .filter(Boolean)
          .join(' ')

        return `${card.quantity} ${card.name.trim()}${suffix ? ` ${suffix}` : ''}`
      })

      return [`${category}: ${total}`, ...lines].join('\n').trim()
    }),
    `Total Cards: ${countCards(cards)}`,
  ].join('\n\n')
}

function countExactRowMatches(expectedRows, actualRows) {
  const actualCounts = new Map()
  let matches = 0

  for (const row of actualRows) {
    const key = normalizedRowKey(row) ?? tcglRowKey(row)

    actualCounts.set(key, (actualCounts.get(key) ?? 0) + 1)
  }

  for (const row of expectedRows) {
    const key = normalizedRowKey(row) ?? tcglRowKey(row)
    const count = actualCounts.get(key) ?? 0

    if (count <= 0) continue

    matches += 1
    actualCounts.set(key, count - 1)
  }

  return matches
}

function countQuantityErrors(expectedRows, actualRows) {
  const actualByIdentity = new Map()

  for (const row of actualRows) {
    const key = normalizedIdentityKey(row)

    if (!key) continue

    actualByIdentity.set(key, row)
  }

  return expectedRows.filter((expected) => {
    const actual = actualByIdentity.get(normalizedIdentityKey(expected))

    return actual && actual.quantity !== expected.quantity
  }).length
}

function missedExpectedRows(expectedRows, candidateReports, finalCards) {
  const finalIdentityKeys = new Set(
    finalCards.map((card) => normalizedIdentityKey(card)).filter(Boolean)
  )

  return expectedRows
    .map((expected, index) => {
      const expectedIdentity = normalizedIdentityKey(expected)

      if (expectedIdentity && finalIdentityKeys.has(expectedIdentity)) {
        return null
      }

      const report = candidateReports.find(
        (candidateReport) =>
          candidateReport.expectedRow &&
          normalizedIdentityKey(candidateReport.expectedRow) === expectedIdentity
      )

      if (!report) {
        return {
          expectedRow: expected,
          expected: displayCard(expected),
          expectedIndex: index,
          status: 'never-cropped',
          unresolvedReason: 'No detected crop was aligned to this expected row.',
          top5: [],
        }
      }

      let status = 'cropped-but-rejected'
      if (report.referenceMissing) {
        status = 'cropped-reference-missing'
      } else if (report.selected && report.selected !== displayCard(expected)) {
        status = 'cropped-matched-incorrectly'
      } else if (report.status === 'low-confidence-candidate') {
        status = 'matched-with-low-confidence'
      }

      return {
        expectedRow: expected,
        expected: displayCard(expected),
        expectedIndex: index,
        status,
        candidateId: report.candidateId,
        recognizedRow: report.recognizedRow,
        quantityExpected: report.expectedQuantity,
        quantityRecognized: report.recognizedQuantity,
        quantityBadgeCropPath: report.quantityBadgeCropPath,
        unresolvedReason: report.unresolvedReason ?? report.reason,
        top5: report.top5,
      }
    })
    .filter(Boolean)
}

function mismatchReason(expected, report, finalCards, referenceIdentityKeys, candidateReports) {
  if (!report) return 'No detected crop was aligned to this expected row.'

  const expectedIdentity = normalizedIdentityKey(expected)
  const selectedIdentity = normalizedIdentityKey(report.recognizedRow)
  const finalCard = finalCards.find(
    (card) => normalizedIdentityKey(card) === expectedIdentity
  )

  if (report.referenceMissing) {
    return `Expected reference image is missing from fixture-subset cache for ${displayCard(expected)}.`
  }

  if (report.status === 'reference-missing') {
    return report.reason ?? 'Reference image missing; kept as unresolved for review.'
  }

  if (selectedIdentity && selectedIdentity !== expectedIdentity) {
    return `Top image match resolved to ${report.selected}; expected ${displayCard(expected)}.`
  }

  if (report.expectedQuantity !== report.recognizedQuantity) {
    return `Quantity mismatch: expected ${report.expectedQuantity}, parsed ${report.recognizedQuantity}.`
  }

  if (report.status === 'low-confidence-candidate') {
    return report.reason ?? 'Low-confidence candidate kept for manual review.'
  }

  if (!finalCard) {
    const mergedInto = candidateReports.find((candidateReport) =>
      (candidateReport.finalSourceCandidateIds ?? []).includes(report.candidateId)
    )

    return mergedInto
      ? `Candidate was merged into ${mergedInto.selected ?? mergedInto.candidateId}.`
      : 'Expected identity is not present in final merged review rows.'
  }

  if (!referenceIdentityKeys.has(exactIdentityKey(expected))) {
    return `Expected exact print ${displayCard(expected)} is missing from fixture-subset cache.`
  }

  return null
}

function inspectExpectedRows(expectedRows, candidateReports, finalCards, referenceIdentityKeys) {
  return expectedRows.map((expected, index) => {
    const report = candidateReports[index] ?? null
    const reason = mismatchReason(
      expected,
      report,
      finalCards,
      referenceIdentityKeys,
      candidateReports
    )

    return {
      expectedIndex: index,
      expectedRow: expected,
      expected: displayCard(expected),
      candidateId: report?.candidateId ?? null,
      cropPath: report?.cropPath ?? null,
      badgeCropPath: report?.quantityBadgeCropPath ?? null,
      parsedQuantity: report?.recognizedQuantity ?? null,
      expectedQuantity: expected.quantity,
      selectedBadgeZone: report?.quantityDiagnostics?.selectedBadgeZone ?? null,
      finalChosenMatch: report?.selected ?? null,
      recognizedRow: report?.recognizedRow ?? null,
      finalConfidence: report?.confidence ?? null,
      status: report?.status ?? 'missing-crop',
      resolution: report?.resolution ?? 'unresolved',
      referenceMissing: report?.referenceMissing ?? isReferenceMissing(expected, referenceIdentityKeys),
      top10: report?.top10 ?? report?.top5 ?? [],
      mismatchReason: reason,
      quantityDiagnostics: report?.quantityDiagnostics ?? null,
    }
  })
}

function cropOverlapDiagnostics(candidateReport, candidateReports) {
  if (!candidateReport) return []

  return candidateReports
    .filter((report) => report.candidateId !== candidateReport.candidateId)
    .map((report) => ({
      candidateId: report.candidateId,
      expected: report.expected,
      selected: report.selected,
      overlapRatio: boundsIntersectionRatio(candidateReport.bounds, report.bounds),
    }))
    .filter((report) => report.overlapRatio > 0)
    .sort((left, right) => right.overlapRatio - left.overlapRatio)
}

function buildTargetedAobDiagnostics(expectedRows, candidateReports, finalCards, referenceIdentityKeys) {
  const expectedRowDiagnostics = inspectExpectedRows(
    expectedRows,
    candidateReports,
    finalCards,
    referenceIdentityKeys
  )
  const byExpectedName = (pattern) =>
    expectedRowDiagnostics.find((entry) => pattern.test(entry.expected))
  const meowth = byExpectedName(/^Meowth ex POR 62$/)
  const clefairy = byExpectedName(/^Lillie's Clefairy ex JTG 56$/)
  const telepathic = byExpectedName(/^Telepathic Psychic Energy POR 88$/)
  const watchtowerCandidates = candidateReports.filter((report) =>
    (report.top10 ?? []).some((match) => match.card === "Team Rocket's Watchtower DRI 180") ||
    report.selected === "Team Rocket's Watchtower DRI 180"
  )
  const meowthReport = candidateReports.find(
    (report) => report.candidateId === meowth?.candidateId
  )

  return {
    expectedRowDiagnostics,
    manualFailures: {
      meowthVsClefairy: {
        meowth,
        clefairy,
        cropIncludesWrongCardArea:
          meowth?.candidateId && meowth?.expectedIndex !== undefined
            ? meowth.expectedIndex !== Number(meowth.candidateId.replace(/\D/g, '')) - 1
            : null,
        adjacentCropOverlaps: cropOverlapDiagnostics(meowthReport, candidateReports),
        correctMeowthReferenceMissing: meowth?.referenceMissing ?? false,
        matchScoreIncorrectlyFavorsClefairy:
          (meowth?.top10 ?? []).findIndex((match) => match.card === "Lillie's Clefairy ex JTG 56") >= 0 &&
          (meowth?.top10 ?? [])[0]?.card !== 'Meowth ex POR 62',
        duplicateMergingCausedIssue: finalCards.some(
          (card) =>
            normalizedIdentityKey(card) === normalizedIdentityKey(meowth?.expectedRow) &&
            (card.sourceCandidateIds?.length ?? 0) > 1
        ),
      },
      teamRocketsWatchtower: {
        finalRows: finalCards.filter(
          (card) => displayCard(card) === "Team Rocket's Watchtower DRI 180"
        ),
        sourceCandidates: watchtowerCandidates.map((report) => ({
          candidateId: report.candidateId,
          expected: report.expected,
          cropPath: report.cropPath,
          badgeCropPath: report.quantityBadgeCropPath,
          selected: report.selected,
          status: report.status,
          confidence: report.confidence,
          reason: report.reason,
          top10: report.top10,
        })),
        note:
          watchtowerCandidates.length > 0
            ? "Watchtower appears only as a low-ranked alternative unless listed in finalRows."
            : 'No candidate produced Team Rocket\'s Watchtower in the top 10.',
      },
      telepathicPsychicEnergy: {
        ...telepathic,
        diagnosis: telepathic?.referenceMissing
          ? 'Cropped but kept unresolved because the expected reference image is missing from fixture-subset cache.'
          : telepathic?.status === 'missing-crop'
            ? 'Not cropped.'
            : telepathic?.status === 'low-confidence-candidate'
              ? 'Matched with low confidence.'
              : telepathic?.finalChosenMatch && telepathic.finalChosenMatch !== telepathic.expected
                ? 'Cropped but matched incorrectly.'
                : 'Detected.',
      },
    },
  }
}

function lowConfidenceQuantityBadges(candidateReports) {
  return candidateReports
    .filter((report) => {
      const confidence = report.quantityConfidence ?? 0

      return (
        report.quantitySource === 'unknown' ||
        confidence < 0.56 ||
        Boolean(report.quantityDiagnostics?.failureReason)
      )
    })
    .map((report) => ({
      candidateId: report.candidateId,
      cropPath: report.cropPath,
      badgeCropPath: report.quantityBadgeCropPath,
      currentParsedQuantity: report.recognizedQuantity,
      confidence: report.quantityConfidence ?? 0,
      reasonRejected:
        report.quantityDiagnostics?.failureReason ??
        report.reason ??
        'Quantity confidence below primary threshold.',
      expectedQuantity: report.expectedQuantity,
      expected: report.expected,
      selectedBadgeZone: report.quantityDiagnostics?.selectedBadgeZone ?? null,
      globalBadgePattern: report.quantityDiagnostics?.globalBadgePattern ?? null,
      globalBadgePatternApplied:
        report.quantityDiagnostics?.globalBadgePatternApplied ?? false,
      rejectedBadgeZones: report.quantityDiagnostics?.rejectedBadgeZones ?? [],
    }))
}

function quantityRecognitionMetrics(candidateReports) {
  const withExpected = candidateReports.filter(
    (report) => typeof report.expectedQuantity === 'number'
  )
  const exact = withExpected.filter(
    (report) => report.recognizedQuantity === report.expectedQuantity
  ).length
  const oneDigit = withExpected.filter((report) => report.expectedQuantity <= 9)
  const twoDigit = withExpected.filter((report) => report.expectedQuantity >= 10)
  const exactFor = (reports) =>
    reports.filter((report) => report.recognizedQuantity === report.expectedQuantity).length

  return {
    quantityExactMatches: exact,
    quantityErrors: withExpected.length - exact,
    quantityUncertainRows: withExpected.filter((report) =>
      report.quantitySource === 'unknown' ||
      report.quantityDiagnostics?.parserComparison?.disagreement ||
      (report.quantityConfidence ?? 0) < 0.62
    ).length,
    badgeLocalizationFailures: withExpected.filter(
      (report) => !report.quantityDiagnostics?.badgeFound
    ).length,
    glyphSegmentationFailures: withExpected.filter(
      (report) => report.quantityDiagnostics?.parserComparison?.failure === 'glyph-segmentation-failed'
    ).length,
    classifierFailures: withExpected.filter(
      (report) => report.quantityDiagnostics?.parserComparison?.failure === 'classifier-failed'
    ).length,
    parserDisagreements: withExpected.filter(
      (report) => report.quantityDiagnostics?.parserComparison?.disagreement
    ).length,
    oneDigit: {
      exact: exactFor(oneDigit),
      total: oneDigit.length,
      accuracy: oneDigit.length ? (exactFor(oneDigit) / oneDigit.length) * 100 : 0,
    },
    twoDigit: {
      exact: exactFor(twoDigit),
      total: twoDigit.length,
      accuracy: twoDigit.length ? (exactFor(twoDigit) / twoDigit.length) * 100 : 0,
    },
  }
}

function japaneseRecognitionMetrics(candidateReports, isJapaneseFixture) {
  if (!isJapaneseFixture) return null

  const japaneseMatches = candidateReports.filter(
    (report) => report.selectedReference?.language === 'japanese'
  )
  const canonicalNameMatches = candidateReports.filter((report) => {
    const expectedName = normalizeDeckText(report.expectedRow?.name ?? '')
    const selectedName = normalizeDeckText(
      report.selectedReference?.canonicalEnglishName ??
        report.recognizedRow?.name ??
        ''
    )

    return expectedName && selectedName && expectedName === selectedName
  })
  const resolvedPrintMappings = japaneseMatches.filter(
    (report) => report.selectedReference?.printMappingStatus === 'resolved-print'
  )
  const unresolvedPrintMappings = japaneseMatches.filter(
    (report) => report.selectedReference?.printMappingStatus !== 'resolved-print'
  )

  return {
    japaneseIdentityMatches: japaneseMatches.length,
    englishCanonicalNameMatches: canonicalNameMatches.length,
    resolvedPrintMappings: resolvedPrintMappings.length,
    unresolvedPrintMappings: unresolvedPrintMappings.length,
    missingJapaneseReferenceImages: candidateReports.filter(
      (report) =>
        report.referenceMissing &&
        (report.expectedRow?.category === 'Pokemon' ||
          report.expectedRow?.category === 'Trainer' ||
          report.expectedRow?.category === 'Energy')
    ).length,
    finalEnglishTcglRows: candidateReports.map((report) => report.recognizedRow).filter(Boolean),
  }
}

function summarizeMatchingFailureCategories(candidateReports) {
  const counts = new Map()

  for (const report of candidateReports) {
    for (const category of report.failureCategories ?? []) {
      if (category === 'no failure') continue
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category))
}

function buildPtcglCandidateMatchingDiagnostics(candidateReports) {
  return {
    failureCategories: summarizeMatchingFailureCategories(candidateReports),
    candidates: candidateReports.map((report) => ({
      candidateId: report.candidateId,
      coarseTileBounds: report.coarseTileBounds,
      refinedCardFrameBounds: report.refinedCardFrameBounds,
      finalMatchingBounds: report.finalMatchingBounds,
      matchingCropPath: report.matchingCropPath,
      expectedRow: report.expectedRow,
      expected: report.expected,
      selectedReference: report.selectedReference,
      matcherSelectedReference: report.matcherSelectedReference,
      top10: report.top10,
      scoreMargin: report.scoreMargin,
      cropQualityScore: report.cropQualityScore,
      status: report.status,
      resolution: report.resolution,
      reason:
        report.unresolvedReason ??
        report.reason ??
        (report.exactCardMatch ? 'Matched expected row.' : 'No specific reason recorded.'),
      failureCategories: report.failureCategories ?? [],
      matchingVariant: report.matchingVariant,
      matchingVariants: report.matchingVariants,
    })),
  }
}

function summarizeResultTable(results) {
  const rows = [
    '| Deck | Entries | Review rows | Est. total | Expected | Qty exact | Qty errors | Qty uncertain | Wrong matches | Unresolved | Exact row % | Output |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ]

  for (const result of results) {
    rows.push(
      [
        result.deckName,
        result.detectedEntries,
        result.finalReviewRows,
        result.estimatedTotalCards,
        result.expectedTotalCards,
        result.quantityRecognition.quantityExactMatches,
        result.quantityErrors,
        result.quantityRecognition.quantityUncertainRows,
        result.wrongCardMatches,
        result.unresolvedRows,
        `${result.exactRowMatchPercent.toFixed(1)}%`,
        result.finalTcglOutputPath,
      ].join(' | ').replace(/^/, '| ').replace(/$/, ' |')
    )
  }

  return rows.join('\n')
}

function summarizeGeneralizationGroup(results, keyForResult) {
  const groups = new Map()
  for (const result of results) {
    const key = keyForResult(result) || 'unknown'
    const group = groups.get(key) ?? {
      group: key,
      fixtureCount: 0,
      candidateCount: 0,
      quantityMatches: 0,
      quantityErrors: 0,
      exactRowMatches: 0,
      expectedRowCount: 0,
      wrongCardMatches: 0,
    }
    group.fixtureCount += 1
    group.candidateCount += result.detectedEntries
    group.quantityMatches += result.quantityRecognition.quantityExactMatches
    group.quantityErrors += result.quantityRecognition.quantityErrors
    group.exactRowMatches += result.exactRowMatches
    group.expectedRowCount += result.expectedRowCount
    group.wrongCardMatches += result.wrongCardMatches
    groups.set(key, group)
  }
  return Array.from(groups.values()).map((group) => ({
    ...group,
    quantityAccuracy:
      group.expectedRowCount ? (group.quantityMatches / group.expectedRowCount) * 100 : 0,
    exactRowAccuracy:
      group.expectedRowCount ? (group.exactRowMatches / group.expectedRowCount) * 100 : 0,
  }))
}

function summarizeGeneralizationMarkdown(generalization) {
  const sections = []
  const addGroup = (title, groups) => {
    sections.push(`## ${title}`)
    sections.push('')
    sections.push('| Group | Fixtures | Candidates | Quantity accuracy | Exact-row accuracy | Wrong identities |')
    sections.push('| --- | ---: | ---: | ---: | ---: | ---: |')
    for (const group of groups) {
      sections.push(
        `| ${group.group} | ${group.fixtureCount} | ${group.candidateCount} | ${group.quantityAccuracy.toFixed(1)}% | ${group.exactRowAccuracy.toFixed(1)}% | ${group.wrongCardMatches} |`
      )
    }
    sections.push('')
  }
  addGroup('By platform', generalization.byPlatform)
  addGroup('By image dimensions', generalization.byImageDimensions)
  addGroup('By orientation', generalization.byOrientation)
  addGroup('By badge anchor', generalization.byBadgeAnchor)
  addGroup('By source language', generalization.bySourceLanguage)
  const digits = generalization.byExpectedDigitCount
  sections.push('## By expected digit count')
  sections.push('')
  sections.push('| Digits | Exact | Total | Accuracy |')
  sections.push('| --- | ---: | ---: | ---: |')
  sections.push(`| One | ${digits.oneDigit.exact} | ${digits.oneDigit.total} | ${digits.oneDigit.accuracy.toFixed(1)}% |`)
  sections.push(`| Two | ${digits.twoDigit.exact} | ${digits.twoDigit.total} | ${digits.twoDigit.accuracy.toFixed(1)}% |`)
  return sections.join('\n')
}

function summarizeJapaneseRecognitionMarkdown(results) {
  const japaneseResults = results.filter((result) => result.japaneseRecognition)

  if (japaneseResults.length === 0) return ''

  const lines = [
    '## Japanese recognition',
    '',
    '| Deck | Selected badge family | Japanese visual matches | English canonical matches | Resolved print mappings | Unresolved print mappings | Missing Japanese references | Final total |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ]

  for (const result of japaneseResults) {
    const metrics = result.japaneseRecognition

    lines.push(
      `| ${result.deckName} | ${result.selectedBadgeFamily ?? 'unknown'} | ${metrics.japaneseIdentityMatches} | ${metrics.englishCanonicalNameMatches} | ${metrics.resolvedPrintMappings} | ${metrics.unresolvedPrintMappings} | ${metrics.missingJapaneseReferenceImages} | ${result.estimatedTotalCards} |`
    )
  }

  return `${lines.join('\n')}\n`
}

function summarizeBenchmarkGroupsMarkdown(groups, failureClusters) {
  const lines = [
    '## Benchmark groups',
    '',
    '| Group | Fixtures | Candidates | Represented | Wrong identities | Quantity accuracy | Exact-row accuracy |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ]
  for (const [name, group] of Object.entries(groups)) {
    const quantityAccuracy =
      group?.quantityAccuracy == null ? 'n/a' : `${group.quantityAccuracy.toFixed(1)}%`
    const exactRowAccuracy =
      group?.exactRowAccuracy == null ? 'n/a' : `${group.exactRowAccuracy.toFixed(1)}%`
    lines.push(
      `| ${name} | ${group?.fixtureCount ?? 0} | ${group?.detectedEntries ?? 0} | ${group?.representedCandidateCount ?? 0} | ${group?.wrongCardMatches ?? 0} | ${quantityAccuracy} | ${exactRowAccuracy} |`
    )
  }
  lines.push('', '## Validation failure clusters', '')
  if (failureClusters.length === 0) {
    lines.push('No validation failures were observed (or no validation fixtures were present).')
  } else {
    lines.push('| Cause | Count |', '| --- | ---: |')
    for (const cluster of failureClusters) lines.push(`| ${cluster.cause} | ${cluster.count} |`)
  }
  return lines.join('\n')
}

async function evaluateFixture(
  fixture,
  image,
  outputFixtureId,
  sharp,
  referenceIndex,
  referenceIdentityKeys,
  japaneseReferenceStatus = null
) {
  const imageMetadata = await sharp(image.absolutePath).metadata()
  const imageWidth = imageMetadata.width ?? 0
  const imageHeight = imageMetadata.height ?? 0
  const expectedRows = parseTcglDecklist(fixture.expectedText)
  const isJapaneseFixture =
    image.language === 'japanese' || fixture.language === 'japanese'
  const expectedTotalCards = countCards(expectedRows)
  const detection = await runCardFrameDetection(image.absolutePath, {
    strategy: 'digital',
    outputRoot: OUTPUT_ROOT,
  })
  const cards = []
  const candidateReports = []
  let wrongCardMatches = 0
  let unresolvedRows = 0

  for (const [index, candidate] of detection.candidates.entries()) {
    const candidateImagePath = path.join(detection.cropsOutputDir, `${candidate.id}.png`)
    const matchingCropsOutputDir = path.join(
      path.dirname(detection.cropsOutputDir),
      'matching-crops'
    )
    const matchingCropVariants = await buildMatchingCropVariants(
      sharp,
      image.absolutePath,
      candidate,
      candidateImagePath,
      matchingCropsOutputDir,
      imageWidth,
      imageHeight
    )
    const matchResult = await matchCandidate(
      sharp,
      {
        id: candidate.id,
        imagePath: candidateImagePath,
        matchingCropVariants,
      },
      referenceIndex,
      10
    )
    const decision = decisionForCandidate(candidate, matchResult.matches)
    const expected = expectedRows[index]
    const referenceMissing = isReferenceMissing(expected, referenceIdentityKeys)
    const finalDecision =
      referenceMissing
        ? {
            ...decision,
            status: 'reference-missing',
            resolution: 'unresolved',
            best: null,
            reason: `Expected fixture row ${displayCard(expected)} has no local reference image in fixture-subset cache.`,
          }
        : decision
    const quantityRead = {
      quantitySource: candidate.quantitySource,
    }
    const selectedRow = finalDecision.best
      ? {
          category: finalDecision.best.category,
          quantity: candidate.quantity ?? 1,
          name: finalDecision.best.name,
          setCode: finalDecision.best.setCode,
          cardNumber: finalDecision.best.cardNumber,
        }
      : null
    const exactCardMatch =
      finalDecision.best &&
      normalizedIdentityKey(expected) === normalizedIdentityKey(selectedRow)

    if (finalDecision.resolution === 'unresolved') {
      unresolvedRows += 1
      cards.push(
        unresolvedCard(
          candidate,
          index,
          finalDecision,
          quantityRead,
          matchResult,
          referenceMissing ? expected : null
        )
      )
    } else if (finalDecision.best) {
      cards.push(matchToCard(finalDecision.best, candidate, finalDecision, quantityRead, matchResult))

      if (!exactCardMatch) {
        wrongCardMatches += 1
      }
    }

    const candidateReport = {
      candidateId: candidate.id,
      cropPath: path.relative(repoRoot, candidateImagePath),
      matchingCropPath: matchResult.cropImagePath,
      matchingVariant: matchResult.matchingVariant ?? null,
      matchingVariants: matchResult.variantResults ?? [],
      expected: displayCard(expected),
      expectedRow: expected ?? null,
      selected: finalDecision.best ? displayCard(selectedRow) : null,
      selectedReference: finalDecision.best
        ? {
            name: finalDecision.best.name,
            englishName: finalDecision.best.englishName ?? finalDecision.best.name,
            localizedName: finalDecision.best.localizedName ?? null,
            setCode: finalDecision.best.setCode,
            cardNumber: finalDecision.best.cardNumber,
            localizedSetCode: finalDecision.best.localizedSetCode ?? null,
            localizedCardNumber: finalDecision.best.localizedCardNumber ?? null,
            category: finalDecision.best.category,
            language: finalDecision.best.language ?? 'english',
            canonicalEnglishName: finalDecision.best.englishName ?? finalDecision.best.name,
            languageEquivalenceGroupId: finalDecision.best.languageEquivalenceGroupId ?? null,
            printMappingStatus: finalDecision.best.mapping?.status ?? 'resolved-print',
            mappingConfidence: finalDecision.best.mapping?.confidence ?? null,
            confidence: finalDecision.best.confidence,
            score: finalDecision.best.score,
          }
        : null,
      matcherSelectedReference: decision.best
        ? {
            name: decision.best.name,
            englishName: decision.best.englishName ?? decision.best.name,
            localizedName: decision.best.localizedName ?? null,
            setCode: decision.best.setCode,
            cardNumber: decision.best.cardNumber,
            localizedSetCode: decision.best.localizedSetCode ?? null,
            localizedCardNumber: decision.best.localizedCardNumber ?? null,
            category: decision.best.category,
            language: decision.best.language ?? 'english',
            canonicalEnglishName: decision.best.englishName ?? decision.best.name,
            languageEquivalenceGroupId: decision.best.languageEquivalenceGroupId ?? null,
            printMappingStatus: decision.best.mapping?.status ?? 'resolved-print',
            mappingConfidence: decision.best.mapping?.confidence ?? null,
            confidence: decision.best.confidence,
            score: decision.best.score,
          }
        : null,
      recognizedRow: selectedRow,
      status: finalDecision.status,
      resolution: finalDecision.resolution,
      exactCardMatch: Boolean(exactCardMatch),
      quantity: candidate.quantity ?? 1,
      recognizedQuantity: candidate.quantity ?? 1,
      expectedQuantity: expected?.quantity ?? null,
      quantitySource: candidate.quantitySource,
      quantityConfidence: candidate.quantityConfidence,
      quantityDiagnostics: candidate.quantityDiagnostics ?? null,
      quantityBadgeCropPath: candidate.badgeBounds
        ? path.relative(
            repoRoot,
            path.join(detection.badgesOutputDir, `${candidate.id}-badge.png`)
          )
        : null,
      reason: finalDecision.reason,
      unresolvedReason:
        finalDecision.resolution === 'unresolved' ? finalDecision.reason : null,
      bounds: candidateBounds(candidate),
      coarseTileBounds: candidate.tileBounds ?? candidate.coarseBounds ?? null,
      refinedCardFrameBounds: candidate.cardFrameBounds ?? candidate.refinedBounds ?? null,
      finalMatchingBounds: matchResult.matchingVariant?.bounds ?? candidateBounds(candidate),
      badgeBounds: candidate.badgeBounds ?? null,
      cropQualityScore: candidate.score ?? null,
      refinementConfidence: candidate.refinementConfidence ?? null,
      refinementReason: candidate.refinementReason ?? null,
      referenceMissing,
      confidence: finalDecision.best?.confidence ?? 0,
      scoreMargin: matchResult.scoreMargin,
      top5: topMatches(matchResult, 5),
      top10: topMatches(matchResult, 10),
    }
    candidateReports.push({
      ...candidateReport,
      failureCategories: classifyMatchingFailure(candidate, candidateReport),
    })
  }

  const finalCards = mergeExactDuplicateCards(cards)
  const representedCandidateCount = new Set(
    finalCards.flatMap((card) => card.sourceCandidateIds ?? [])
  ).size
  const finalTcgl = formatTcgl(finalCards)
  const finalRows = parseTcglDecklist(finalTcgl)
  const exactRowMatches = countExactRowMatches(expectedRows, finalRows)
  const exactRowMatchPercent =
    expectedRows.length === 0 ? 0 : (exactRowMatches / expectedRows.length) * 100
  const quantityErrors = countQuantityErrors(expectedRows, finalRows)
  const deckOutputDir = path.join(OUTPUT_ROOT, outputFixtureId)
  const finalTcglOutputPath = path.join(deckOutputDir, 'final.tcgl.txt')
  const deckReportPath = path.join(deckOutputDir, 'report.json')
  const targetedAobDiagnosticsPath = path.join(deckOutputDir, 'aob-targeted-failures.json')

  mkdirSync(deckOutputDir, { recursive: true })
  writeFileSync(finalTcglOutputPath, `${finalTcgl}\n`)

  const targetedAobDiagnostics =
    fixture.fixture === 'aob'
      ? buildTargetedAobDiagnostics(
          expectedRows,
          candidateReports,
          finalCards,
          referenceIdentityKeys
        )
      : null

  const result = {
    fixture: outputFixtureId,
    fixtureDeck: fixture.fixture,
    benchmarkGroup: image.benchmarkGroup ?? fixture.benchmarkGroup ?? 'validation',
    fixtureNotes: image.notes ?? fixture.metadata?.notes ?? null,
    deckName: fixture.deckName,
    imageFile: image.file,
    platform: image.platform ?? 'unknown',
    sourceLanguage: image.language ?? fixture.language ?? 'unknown',
    imageDimensions: { width: imageWidth, height: imageHeight },
    orientation:
      imageWidth === imageHeight ? 'square' : imageWidth > imageHeight ? 'landscape' : 'portrait',
    badgeAnchor:
      image.badgeAnchor ?? detection.globalBadgePattern?.zone ?? 'unknown',
    detectedEntries: detection.candidateCount,
    finalReviewRows: finalCards.length,
    representedCandidateCount,
    estimatedTotalCards: countCards(finalCards),
    expectedTotalCards,
    quantityErrors,
    wrongCardMatches,
    unresolvedRows,
    exactRowMatches,
    expectedRowCount: expectedRows.length,
    exactRowMatchPercent,
    finalTcglOutputPath: path.relative(repoRoot, finalTcglOutputPath),
    detectionReportPath: path.relative(repoRoot, detection.reportOutputPath),
    deckReportPath: path.relative(repoRoot, deckReportPath),
    globalBadgePattern: detection.globalBadgePattern ?? null,
    selectedBadgeFamily: detection.globalBadgePattern?.family ?? 'unknown',
    badgeProfileDebug: detection.badgeProfileDebug
      ? {
          scoreReportPath: path.relative(repoRoot, detection.badgeProfileDebug.scoreReportPath),
          overlayPath: path.relative(repoRoot, detection.badgeProfileDebug.overlayPath),
        }
      : null,
    finalReviewRowsDetailed: finalCards.map((card) => ({
      category: card.category,
      quantity: card.quantity,
      name: card.name,
      setCode: card.setCode,
      cardNumber: card.cardNumber,
      confidence: card.confidence,
      sourceLanguage: card.sourceLanguage ?? 'english',
      localizedName: card.localizedName ?? null,
      localizedSetCode: card.localizedSetCode ?? null,
      localizedCardNumber: card.localizedCardNumber ?? null,
      printMappingStatus: card.printMappingStatus ?? 'resolved-print',
      canonicalMappingConfidence: card.canonicalMappingConfidence ?? null,
      notes: card.notes ?? [],
      sourceCandidateIds: card.sourceCandidateIds ?? [],
      sourceCandidates: card.sourceCandidates ?? [],
    })),
    lowConfidenceQuantityBadges: lowConfidenceQuantityBadges(candidateReports),
    missedExpectedRows: missedExpectedRows(expectedRows, candidateReports, finalCards),
    repeatedGridMatchingDiagnostics: candidateReports.some(
      (report) => report.coarseTileBounds || report.refinedCardFrameBounds
    )
      ? buildPtcglCandidateMatchingDiagnostics(candidateReports)
      : undefined,
    expectedRowDiagnostics: targetedAobDiagnostics?.expectedRowDiagnostics ?? undefined,
    targetedAobDiagnosticsPath: targetedAobDiagnostics
      ? path.relative(repoRoot, targetedAobDiagnosticsPath)
      : undefined,
    candidateReports,
  }
  result.quantityRecognition = quantityRecognitionMetrics(candidateReports)
  result.japaneseRecognition = japaneseRecognitionMetrics(
    candidateReports,
    isJapaneseFixture
  )
  result.japaneseReferenceStatus = isJapaneseFixture ? japaneseReferenceStatus : null
  result.quantityRecognition.selectedBadgeFamily = result.selectedBadgeFamily
  result.quantityRecognition.badgeProfileConfidence =
    detection.globalBadgePattern?.profileConfidence ?? detection.globalBadgePattern?.confidence ?? null
  result.quantityRecognition.badgeProfileSupportingTiles =
    detection.globalBadgePattern?.sampleCount ?? null
  result.validationDiagnostics = {
    cropFailures: Math.abs(detection.candidateCount - expectedRows.length),
    missingReferenceImages: candidateReports.filter((report) => report.referenceMissing).length,
    templateMismatches: candidateReports.filter((report) => {
      const parser = report.quantityDiagnostics?.parserComparison
      return (
        typeof report.expectedQuantity === 'number' &&
        parser?.quantity &&
        parser.quantity !== report.expectedQuantity
      )
    }).length,
    cardSimilarityMismatches: candidateReports.filter(
      (report) => !report.referenceMissing && !report.exactCardMatch
    ).length,
    platformStyleClassification: {
      platform: image.platform ?? 'unknown',
      badgeAnchor: image.badgeAnchor ?? detection.globalBadgePattern?.zone ?? 'unknown',
      detectedBadgeZone: detection.globalBadgePattern?.zone ?? 'unknown',
      orientation:
        imageWidth === imageHeight
          ? 'square'
          : imageWidth > imageHeight
            ? 'landscape'
            : 'portrait',
      imageDimensions: { width: imageWidth, height: imageHeight },
      sourceLanguage: image.language ?? fixture.language ?? 'unknown',
    },
  }

  writeFileSync(deckReportPath, `${JSON.stringify(result, null, 2)}\n`)
  if (targetedAobDiagnostics) {
    writeFileSync(
      targetedAobDiagnosticsPath,
      `${JSON.stringify(targetedAobDiagnostics, null, 2)}\n`
    )
  }

  return result
}

function classifyValidationFailures(results) {
  const causes = [
    'unfamiliar badge location',
    'unfamiliar badge font',
    'unfamiliar badge shape',
    'clipped badge',
    'tile crop issue',
    'image scaling issue',
    'card reference missing',
    'multilingual reference missing',
    'card similarity mismatch',
    'unknown platform/layout',
  ]
  const clusters = new Map(causes.map((cause) => [cause, []]))
  const add = (cause, entry) => {
    const entries = clusters.get(cause) ?? []
    entries.push(entry)
    clusters.set(cause, entries)
  }

  for (const result of results) {
    const base = {
      fixture: result.fixture,
      imageFile: result.imageFile,
      platform: result.platform,
      orientation: result.orientation,
    }
    if (result.detectedEntries !== result.expectedRowCount) {
      add('tile crop issue', {
        ...base,
        detail: `Detected ${result.detectedEntries} entries for ${result.expectedRowCount} expected rows.`,
      })
    }
    if (Math.min(result.imageDimensions.width, result.imageDimensions.height) < 600) {
      add('image scaling issue', {
        ...base,
        detail: `Short image edge is ${Math.min(result.imageDimensions.width, result.imageDimensions.height)}px.`,
      })
    }
    if (result.platform === 'unknown') {
      add('unknown platform/layout', { ...base, detail: 'Platform metadata is unknown.' })
    }
    for (const report of result.candidateReports) {
      const entry = { ...base, candidateId: report.candidateId, expected: report.expected }
      const parser = report.quantityDiagnostics?.parserComparison
      if (!report.quantityDiagnostics?.badgeFound) {
        add('unfamiliar badge location', entry)
      } else if (parser?.failure === 'glyph-segmentation-failed') {
        add('clipped badge', entry)
      } else if (parser?.failure === 'classifier-failed') {
        add('unfamiliar badge shape', entry)
      } else if (
        typeof report.expectedQuantity === 'number' &&
        report.recognizedQuantity !== report.expectedQuantity &&
        parser?.quantity
      ) {
        add('unfamiliar badge font', entry)
      }
      if (report.referenceMissing) {
        add(
          result.sourceLanguage !== 'english'
            ? 'multilingual reference missing'
            : 'card reference missing',
          entry
        )
      } else if (!report.exactCardMatch && report.resolution !== 'unresolved') {
        add('card similarity mismatch', entry)
      }
    }
  }

  return Array.from(clusters.entries())
    .map(([cause, entries]) => ({ cause, count: entries.length, entries }))
    .sort((left, right) => right.count - left.count || left.cause.localeCompare(right.cause))
}

function committedBaselineSummary() {
  const baselinePath = path.join(
    repoRoot,
    'test-data',
    'deck-image-importer',
    'baselines',
    'digital-baseline.json'
  )
  if (!existsSync(baselinePath)) return null
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  return {
    source: path.relative(repoRoot, baselinePath),
    fixtureCount: baseline.fixtureCount,
    detectedEntries: baseline.metrics.candidateCount,
    representedCandidateCount: baseline.metrics.representedCandidateCount,
    wrongCardMatches: baseline.metrics.cardIdentityErrors,
    quantityExactMatches: baseline.metrics.quantityMatches,
    quantityErrors: baseline.metrics.quantityErrors,
    exactRowMatches: baseline.metrics.exactRowMatches,
    expectedRowCount: baseline.metrics.expectedRowCount,
    quantityAccuracy: baseline.metrics.quantityAccuracy * 100,
    exactRowAccuracy: baseline.metrics.exactRowAccuracy * 100,
  }
}

function loadOptionalManifest(manifestPath) {
  if (!existsSync(manifestPath)) {
    return {
      generatedAt: null,
      cards: [],
      unmatched: [],
      missing: true,
      manifestPath,
    }
  }

  return loadManifest(manifestPath)
}

function groupMetrics(results, totals) {
  return {
    fixtureCount: results.length,
    detectedEntries: totals.detectedEntries,
    representedCandidateCount: totals.representedCandidateCount,
    wrongCardMatches: totals.wrongCardMatches,
    quantityExactMatches: totals.quantityExactMatches,
    quantityErrors: totals.quantityErrors,
    exactRowMatches: totals.exactRowMatches,
    expectedRowCount: totals.expectedRowCount,
    quantityAccuracy:
      totals.expectedRowCount === 0
        ? null
        : (totals.quantityExactMatches / totals.expectedRowCount) * 100,
    exactRowAccuracy:
      totals.expectedRowCount === 0
        ? null
        : (totals.exactRowMatches / totals.expectedRowCount) * 100,
  }
}

async function main() {
  mkdirSync(OUTPUT_ROOT, { recursive: true })

  const sharp = await loadSharp()
  const manifest = loadManifest(MANIFEST_PATH)
  const japaneseManifest = loadOptionalManifest(JAPANESE_MANIFEST_PATH)
  const referenceIndex = await buildReferenceFeatureIndex(sharp, manifest.cards)
  const japaneseReferenceIndex =
    japaneseManifest.cards.length > 0
      ? await buildReferenceFeatureIndex(sharp, japaneseManifest.cards)
      : []
  const referenceIdentityKeys = buildReferenceIdentityKeys(referenceIndex)
  const japaneseReferenceIdentityKeys =
    japaneseReferenceIndex.length > 0
      ? buildReferenceIdentityKeys([...referenceIndex, ...japaneseReferenceIndex])
      : referenceIdentityKeys
  const japaneseReferenceStatus = {
    manifestPath: path.relative(repoRoot, JAPANESE_MANIFEST_PATH),
    available: !japaneseManifest.missing,
    referenceCount: japaneseManifest.cards.length,
    missingMappings: japaneseManifest.unmatched?.length ?? 0,
  }
  const results = []

  for (const fixture of discoverDeckImageFixtures()) {
    const digitalImages = fixture.images.filter((image) => {
      if (image.sourceType !== 'digital') return false
      const benchmarkGroup = image.benchmarkGroup ?? fixture.benchmarkGroup ?? 'validation'
      return REQUESTED_GROUP === 'all' || benchmarkGroup === REQUESTED_GROUP
    })

    for (const image of digitalImages) {
      const imageSlug = path.basename(image.file, path.extname(image.file))
        .replace(/[^a-z0-9_-]/gi, '-')
        .toLowerCase()
      const outputFixtureId =
        digitalImages.length === 1 ? fixture.fixture : `${fixture.fixture}-${imageSlug}`
      const isJapaneseImage =
        image.language === 'japanese' || fixture.language === 'japanese'
      const activeReferenceIndex =
        isJapaneseImage && japaneseReferenceIndex.length > 0
          ? [...japaneseReferenceIndex, ...referenceIndex]
          : referenceIndex
      const activeReferenceIdentityKeys =
        isJapaneseImage && japaneseReferenceIndex.length > 0
          ? japaneseReferenceIdentityKeys
          : referenceIdentityKeys

      results.push(
        await evaluateFixture(
          fixture,
          image,
          outputFixtureId,
          sharp,
          activeReferenceIndex,
          activeReferenceIdentityKeys,
          isJapaneseImage ? japaneseReferenceStatus : null
        )
      )
    }
  }

  const totals = results.reduce(
    (summary, result) => ({
      detectedEntries: summary.detectedEntries + result.detectedEntries,
      finalReviewRows: summary.finalReviewRows + result.finalReviewRows,
      representedCandidateCount:
        summary.representedCandidateCount + result.representedCandidateCount,
      estimatedTotalCards: summary.estimatedTotalCards + result.estimatedTotalCards,
      expectedTotalCards: summary.expectedTotalCards + result.expectedTotalCards,
      quantityErrors: summary.quantityErrors + result.quantityErrors,
      wrongCardMatches: summary.wrongCardMatches + result.wrongCardMatches,
      unresolvedRows: summary.unresolvedRows + result.unresolvedRows,
      exactRowMatches: summary.exactRowMatches + result.exactRowMatches,
      expectedRowCount: summary.expectedRowCount + result.expectedRowCount,
      quantityExactMatches:
        summary.quantityExactMatches + result.quantityRecognition.quantityExactMatches,
      quantityUncertainRows:
        summary.quantityUncertainRows + result.quantityRecognition.quantityUncertainRows,
      badgeLocalizationFailures:
        summary.badgeLocalizationFailures + result.quantityRecognition.badgeLocalizationFailures,
      glyphSegmentationFailures:
        summary.glyphSegmentationFailures + result.quantityRecognition.glyphSegmentationFailures,
      classifierFailures:
        summary.classifierFailures + result.quantityRecognition.classifierFailures,
      parserDisagreements:
        summary.parserDisagreements + result.quantityRecognition.parserDisagreements,
      oneDigitExact: summary.oneDigitExact + result.quantityRecognition.oneDigit.exact,
      oneDigitTotal: summary.oneDigitTotal + result.quantityRecognition.oneDigit.total,
      twoDigitExact: summary.twoDigitExact + result.quantityRecognition.twoDigit.exact,
      twoDigitTotal: summary.twoDigitTotal + result.quantityRecognition.twoDigit.total,
    }),
    {
      detectedEntries: 0,
      finalReviewRows: 0,
      representedCandidateCount: 0,
      estimatedTotalCards: 0,
      expectedTotalCards: 0,
      quantityErrors: 0,
      wrongCardMatches: 0,
      unresolvedRows: 0,
      exactRowMatches: 0,
      expectedRowCount: 0,
      quantityExactMatches: 0,
      quantityUncertainRows: 0,
      badgeLocalizationFailures: 0,
      glyphSegmentationFailures: 0,
      classifierFailures: 0,
      parserDisagreements: 0,
      oneDigitExact: 0,
      oneDigitTotal: 0,
      twoDigitExact: 0,
      twoDigitTotal: 0,
    }
  )
  const currentGroupMetrics = groupMetrics(results, totals)
  const baselineMetrics =
    REQUESTED_GROUP === 'baseline'
      ? currentGroupMetrics
      : committedBaselineSummary()
  const validationMetrics =
    REQUESTED_GROUP === 'validation'
      ? currentGroupMetrics
      : {
          fixtureCount: 0,
          detectedEntries: 0,
          representedCandidateCount: 0,
          wrongCardMatches: 0,
          quantityExactMatches: 0,
          quantityErrors: 0,
          exactRowMatches: 0,
          expectedRowCount: 0,
          quantityAccuracy: null,
          exactRowAccuracy: null,
        }
  const combinedExpectedRows =
    (baselineMetrics?.expectedRowCount ?? 0) + validationMetrics.expectedRowCount
  const combinedQuantityMatches =
    (baselineMetrics?.quantityExactMatches ?? 0) + validationMetrics.quantityExactMatches
  const combinedExactRows =
    (baselineMetrics?.exactRowMatches ?? 0) + validationMetrics.exactRowMatches
  const summary = {
    generatedAt: new Date().toISOString(),
    outputRoot: path.relative(repoRoot, OUTPUT_ROOT),
    recognitionConfig: DIGITAL_RECOGNITION_CONFIG,
    totals: {
      ...totals,
      oneDigitAccuracy:
        totals.oneDigitTotal === 0 ? 0 : (totals.oneDigitExact / totals.oneDigitTotal) * 100,
      twoDigitAccuracy:
        totals.twoDigitTotal === 0 ? 0 : (totals.twoDigitExact / totals.twoDigitTotal) * 100,
      exactRowMatchPercent:
        totals.expectedRowCount === 0
          ? 0
          : (totals.exactRowMatches / totals.expectedRowCount) * 100,
    },
    results,
    benchmarkGroups: {
      baseline: baselineMetrics,
      validation: validationMetrics,
      combined: {
        informationalOnly: true,
        fixtureCount:
          (baselineMetrics?.fixtureCount ?? 0) + validationMetrics.fixtureCount,
        detectedEntries:
          (baselineMetrics?.detectedEntries ?? 0) + validationMetrics.detectedEntries,
        representedCandidateCount:
          (baselineMetrics?.representedCandidateCount ?? 0) +
          validationMetrics.representedCandidateCount,
        wrongCardMatches:
          (baselineMetrics?.wrongCardMatches ?? 0) + validationMetrics.wrongCardMatches,
        quantityExactMatches: combinedQuantityMatches,
        quantityErrors:
          (baselineMetrics?.quantityErrors ?? 0) + validationMetrics.quantityErrors,
        exactRowMatches: combinedExactRows,
        expectedRowCount: combinedExpectedRows,
        quantityAccuracy:
          combinedExpectedRows === 0
            ? null
            : (combinedQuantityMatches / combinedExpectedRows) * 100,
        exactRowAccuracy:
          combinedExpectedRows === 0
            ? null
            : (combinedExactRows / combinedExpectedRows) * 100,
      },
    },
    validationFailureClusters:
      REQUESTED_GROUP === 'validation' ? classifyValidationFailures(results) : [],
    generalization: {
      byPlatform: summarizeGeneralizationGroup(results, (result) => result.platform),
      byImageDimensions: summarizeGeneralizationGroup(
        results,
        (result) => `${result.imageDimensions.width}x${result.imageDimensions.height}`
      ),
      byOrientation: summarizeGeneralizationGroup(results, (result) => result.orientation),
      byBadgeAnchor: summarizeGeneralizationGroup(results, (result) => result.badgeAnchor),
      bySourceLanguage: summarizeGeneralizationGroup(
        results,
        (result) => result.sourceLanguage
      ),
      byExpectedDigitCount: {
        oneDigit: {
          exact: totals.oneDigitExact,
          total: totals.oneDigitTotal,
          accuracy:
            totals.oneDigitTotal === 0
              ? 0
              : (totals.oneDigitExact / totals.oneDigitTotal) * 100,
        },
        twoDigit: {
          exact: totals.twoDigitExact,
          total: totals.twoDigitTotal,
          accuracy:
            totals.twoDigitTotal === 0
              ? 0
              : (totals.twoDigitExact / totals.twoDigitTotal) * 100,
        },
      },
    },
  }
  const summaryTable = summarizeResultTable(results)
  const generalizationTable = summarizeGeneralizationMarkdown(summary.generalization)
  const benchmarkGroupsTable = summarizeBenchmarkGroupsMarkdown(
    summary.benchmarkGroups,
    summary.validationFailureClusters
  )
  const japaneseRecognitionTable = summarizeJapaneseRecognitionMarkdown(results)

  writeFileSync(path.join(OUTPUT_ROOT, 'report.json'), `${JSON.stringify(summary, null, 2)}\n`)
  writeFileSync(
    path.join(OUTPUT_ROOT, 'summary.md'),
    `${summaryTable}\n\n${benchmarkGroupsTable}\n\n${japaneseRecognitionTable ? `${japaneseRecognitionTable}\n` : ''}${generalizationTable}\n`
  )

  console.log(summaryTable)
  console.log('')
  console.log(`Report: ${path.relative(repoRoot, path.join(OUTPUT_ROOT, 'report.json'))}`)
  console.log(`Summary: ${path.relative(repoRoot, path.join(OUTPUT_ROOT, 'summary.md'))}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
