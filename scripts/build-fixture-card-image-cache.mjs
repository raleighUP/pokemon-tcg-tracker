import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import {
  discoverDeckImageFixtures,
  repoRoot,
} from './lib/deck-image-fixtures.mjs'
import {
  normalizeDeckText,
  parseTcglDecklist,
  tcglIdentityKey,
} from './lib/tcgl-decklist-parser.mjs'
import {
  getApiSetCodesForTcglSetCode,
  normalizeSetCode,
} from './lib/tcgl-set-code-aliases.mjs'

const referenceCachePath = path.join(repoRoot, 'data', 'card-reference-cache.json')
const outputRoot = path.join(repoRoot, 'data', 'card-image-cache', 'fixture-subset')
const imageOutputDir = path.join(outputRoot, 'images')
const manifestPath = path.join(outputRoot, 'manifest.json')
const publicOutputRoot = path.join(
  repoRoot,
  'public',
  'card-image-cache',
  'fixture-subset'
)
const publicImageOutputDir = path.join(publicOutputRoot, 'images')
const publicManifestPath = path.join(publicOutputRoot, 'manifest.json')

function loadCardReferences() {
  if (!existsSync(referenceCachePath)) {
    throw new Error(`Card reference cache not found: ${referenceCachePath}`)
  }

  return JSON.parse(readFileSync(referenceCachePath, 'utf8'))
}

function getUsableImageUrl(card) {
  const urls = [card.imageLarge, card.imageSmall].filter((url) => {
    if (typeof url !== 'string') return false

    try {
      return new URL(url).protocol === 'https:'
    } catch {
      return false
    }
  })

  return urls[0] ?? null
}

function normalizeCardNumber(value) {
  return String(value).trim().toLowerCase().replace(/^0+(\d)/, '$1')
}

function cardMatchesSetAndNumber(card, row) {
  const apiSetCodes = getApiSetCodesForTcglSetCode(row.setCode)

  return (
    apiSetCodes.includes(normalizeSetCode(card.setCode)) &&
    normalizeCardNumber(card.cardNumber) === normalizeCardNumber(row.cardNumber)
  )
}

function findReferenceForRow(row, references) {
  const categoryMatches = references.filter((card) => card.category === row.category)

  if (row.setCode && row.cardNumber) {
    const exactPrint = categoryMatches.find((card) =>
      cardMatchesSetAndNumber(card, row)
    )

    if (exactPrint) return exactPrint
  }

  const normalizedName = normalizeDeckText(row.name)

  return categoryMatches.find(
    (card) => normalizeDeckText(card.englishName) === normalizedName
  )
}

function collectFixtureRows() {
  const rowsByIdentity = new Map()
  const fixtures = discoverDeckImageFixtures()

  for (const fixture of fixtures) {
    const rows = parseTcglDecklist(fixture.expectedText)

    for (const row of rows) {
      const key = tcglIdentityKey(row)
      const existing = rowsByIdentity.get(key)

      rowsByIdentity.set(key, {
        ...row,
        fixtures: existing
          ? Array.from(new Set([...existing.fixtures, fixture.fixture]))
          : [fixture.fixture],
      })
    }
  }

  return Array.from(rowsByIdentity.values())
}

function getImageExtension(url) {
  const extension = path.extname(new URL(url).pathname).toLowerCase()

  return extension && extension.length <= 5 ? extension : '.png'
}

async function downloadImage(url, outputPath) {
  if (existsSync(outputPath)) {
    return { downloaded: false, outputPath }
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  writeFileSync(outputPath, Buffer.from(arrayBuffer))

  return { downloaded: true, outputPath }
}

async function buildFixtureCardImageCache() {
  const references = loadCardReferences()
  const fixtureRows = collectFixtureRows()
  const matched = []
  const unmatched = []

  mkdirSync(imageOutputDir, { recursive: true })
  mkdirSync(publicImageOutputDir, { recursive: true })

  for (const row of fixtureRows) {
    const reference = findReferenceForRow(row, references)

    if (!reference) {
      unmatched.push({
        row,
        reason: 'No matching card reference found.',
      })
      continue
    }

    const imageUrl = getUsableImageUrl(reference)

    if (!imageUrl) {
      unmatched.push({
        row,
        referenceId: reference.id,
        reason: 'No usable HTTPS image URL in reference cache.',
      })
      continue
    }

    const imageFile = `${reference.id}${getImageExtension(imageUrl)}`
    const imagePath = path.join(imageOutputDir, imageFile)
    const publicImagePath = path.join(publicImageOutputDir, imageFile)
    const downloadResult = await downloadImage(imageUrl, imagePath)
    copyFileSync(imagePath, publicImagePath)

    matched.push({
      fixtureRows: row.fixtures,
      quantity: row.quantity,
      expectedName: row.name,
      expectedSetCode: row.setCode,
      expectedCardNumber: row.cardNumber,
      expectedIdentityKey: tcglIdentityKey(row),
      name: row.name,
      setCode: row.setCode,
      cardNumber: row.cardNumber,
      referenceName: reference.englishName,
      referenceSetCode: reference.setCode,
      referenceCardNumber: reference.cardNumber,
      regulationMark: reference.regulationMark,
      legalities: reference.legalities,
      category: reference.category,
      id: reference.id,
      source: reference.source,
      imageUrl,
      imageFile,
      imagePath: path.relative(repoRoot, imagePath),
      publicImagePath: `/card-image-cache/fixture-subset/images/${imageFile}`,
      downloaded: downloadResult.downloaded,
    })
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: {
      expectedFixtureRoot: path.relative(
        repoRoot,
        path.join(repoRoot, 'test-data', 'deck-image-importer')
      ),
      referenceCachePath: path.relative(repoRoot, referenceCachePath),
    },
    architecture: {
      primaryPath: 'local-image-matching',
      aiVisionProviders: false,
      descriptors: [
        'perceptual-hash',
        'color-histogram',
        'template-image-similarity',
        'future-feature-matching-placeholder',
      ],
    },
    cards: matched,
    unmatched,
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(publicManifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log('Fixture card image cache')
  console.log(`  Fixture card rows: ${fixtureRows.length}`)
  console.log(`  Matched references: ${matched.length}`)
  console.log(`  Unmatched rows: ${unmatched.length}`)
  console.log(`  Images: ${path.relative(repoRoot, imageOutputDir)}`)
  console.log(`  Manifest: ${path.relative(repoRoot, manifestPath)}`)
  console.log(`  Public images: ${path.relative(repoRoot, publicImageOutputDir)}`)
  console.log(`  Public manifest: ${path.relative(repoRoot, publicManifestPath)}`)

  if (fixtureRows.length === 0) {
    console.log('')
    console.log('No fixture card rows were found. Fill the expected.txt decklists, then rerun this script.')
  }
}

buildFixtureCardImageCache().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
