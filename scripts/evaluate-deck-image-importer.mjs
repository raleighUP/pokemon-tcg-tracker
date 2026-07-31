import { existsSync } from 'node:fs'
import path from 'node:path'
import {
  discoverDeckImageFixtures,
  readTextIfPresent,
} from './lib/deck-image-fixtures.mjs'
import {
  parseTcglDecklist,
  tcglIdentityKey,
  tcglNameKey,
  tcglRowKey,
} from './lib/tcgl-decklist-parser.mjs'

function countCards(rows) {
  return rows.reduce((total, row) => total + row.quantity, 0)
}

function countMatches(expectedRows, actualRows, getKey) {
  const actualCounts = new Map()
  let matches = 0

  for (const row of actualRows) {
    const key = getKey(row)
    actualCounts.set(key, (actualCounts.get(key) ?? 0) + 1)
  }

  for (const row of expectedRows) {
    const key = getKey(row)
    const count = actualCounts.get(key) ?? 0

    if (count <= 0) continue

    matches += 1
    actualCounts.set(key, count - 1)
  }

  return matches
}

function compareRows(expectedRows, actualRows) {
  const exactRowMatches = countMatches(
    expectedRows,
    actualRows,
    tcglRowKey
  )
  const nameMatches = countMatches(
    expectedRows,
    actualRows,
    tcglNameKey
  )
  const quantityMatches = countMatches(
    expectedRows,
    actualRows,
    (row) => `${tcglIdentityKey(row)}|${row.quantity}`
  )
  const actualExactKeys = new Map()
  const missingRows = []
  const extraRows = []

  for (const row of actualRows) {
    const key = tcglRowKey(row)
    actualExactKeys.set(key, (actualExactKeys.get(key) ?? 0) + 1)
  }

  for (const row of expectedRows) {
    const key = tcglRowKey(row)
    const count = actualExactKeys.get(key) ?? 0

    if (count > 0) {
      actualExactKeys.set(key, count - 1)
    } else {
      missingRows.push(row)
    }
  }

  const expectedExactKeys = new Map()

  for (const row of expectedRows) {
    const key = tcglRowKey(row)
    expectedExactKeys.set(key, (expectedExactKeys.get(key) ?? 0) + 1)
  }

  for (const row of actualRows) {
    const key = tcglRowKey(row)
    const count = expectedExactKeys.get(key) ?? 0

    if (count > 0) {
      expectedExactKeys.set(key, count - 1)
    } else {
      extraRows.push(row)
    }
  }

  const expectedTotal = countCards(expectedRows)
  const actualTotal = countCards(actualRows)

  return {
    totalCardCountAccuracy:
      expectedTotal === 0 ? null : actualTotal / expectedTotal,
    totalCardCountMatch: expectedTotal === actualTotal,
    expectedTotal,
    actualTotal,
    exactRowMatches,
    nameMatches,
    quantityMatches,
    expectedRowCount: expectedRows.length,
    actualRowCount: actualRows.length,
    missingRows,
    extraRows,
  }
}

function evaluateFixture(fixture) {
  const fixturePath = fixture.fixturePath
  const mockRecognizedPath = path.join(fixturePath, 'mock-recognized.txt')
  const legacyMockPath = path.join(fixturePath, 'mock-extracted.txt')
  const mockPath = existsSync(mockRecognizedPath)
    ? mockRecognizedPath
    : legacyMockPath
  const expectedRows = parseTcglDecklist(fixture.expectedText)
  const actualRows = parseTcglDecklist(readTextIfPresent(mockPath))

  return {
    fixture: fixture.fixture,
    deckName: fixture.deckName,
    language: fixture.language,
    sourceTypes: fixture.sourceTypes,
    images: fixture.images.map((image) => ({
      file: image.file,
      sourceType: image.sourceType,
      label: image.label,
    })),
    hasDigitalImage: fixture.images.some((image) => image.sourceType === 'digital'),
    hasPhysicalImage: fixture.images.some((image) => image.sourceType === 'physical'),
    hasMockRecognizedText: existsSync(mockPath),
    ...compareRows(expectedRows, actualRows),
  }
}

const fixtures = discoverDeckImageFixtures()

if (fixtures.length === 0) {
  console.error('No deck image fixtures found.')
  process.exitCode = 1
} else {
  const results = fixtures.map(evaluateFixture)

  console.log(JSON.stringify({ results }, null, 2))
}
