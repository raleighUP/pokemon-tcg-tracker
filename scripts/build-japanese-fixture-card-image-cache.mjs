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
const outputRoot = path.join(repoRoot, 'data', 'card-image-cache', 'japanese-fixture-subset')
const imageOutputDir = path.join(outputRoot, 'images')
const manifestPath = path.join(outputRoot, 'manifest.json')
const mappingPath = path.join(
  repoRoot,
  'test-data',
  'deck-image-importer',
  'japanese-reference-mapping.json'
)
const publicOutputRoot = path.join(
  repoRoot,
  'public',
  'card-image-cache',
  'japanese-fixture-subset'
)
const publicImageOutputDir = path.join(publicOutputRoot, 'images')
const publicManifestPath = path.join(publicOutputRoot, 'manifest.json')
const tcgdexBaseUrl = 'https://api.tcgdex.net/v2'

function loadJsonIfPresent(filePath, fallback) {
  if (!existsSync(filePath)) return fallback

  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function loadCardReferences() {
  if (!existsSync(referenceCachePath)) {
    throw new Error(`Card reference cache not found: ${referenceCachePath}`)
  }

  return JSON.parse(readFileSync(referenceCachePath, 'utf8'))
}

function normalizeCardNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(\d)/, '$1')
}

function cardMatchesSetAndNumber(card, row) {
  const apiSetCodes = getApiSetCodesForTcglSetCode(row.setCode)

  return (
    apiSetCodes.includes(normalizeSetCode(card.setCode)) &&
    normalizeCardNumber(card.cardNumber) === normalizeCardNumber(row.cardNumber)
  )
}

function findEnglishReferenceForRow(row, references) {
  const categoryMatches = references.filter((card) => card.category === row.category)

  if (row.setCode && row.cardNumber) {
    const exactPrint = categoryMatches.find((card) => cardMatchesSetAndNumber(card, row))

    if (exactPrint) return exactPrint
  }

  const normalizedName = normalizeDeckText(row.name)

  return categoryMatches.find(
    (card) => normalizeDeckText(card.englishName) === normalizedName
  )
}

function collectJapaneseFixtureRows() {
  const rowsByIdentity = new Map()

  for (const fixture of discoverDeckImageFixtures()) {
    const hasJapaneseDigitalImage = fixture.images.some(
      (image) => image.sourceType === 'digital' && image.language === 'japanese'
    )

    if (fixture.language !== 'japanese' && !hasJapaneseDigitalImage) continue

    for (const row of parseTcglDecklist(fixture.expectedText)) {
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

async function fetchJson(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`TCGdex request failed: ${response.status} ${response.statusText} ${url}`)
  }

  return response.json()
}

async function fetchTcgdexCard(language, id) {
  return fetchJson(`${tcgdexBaseUrl}/${language}/cards/${encodeURIComponent(id)}`)
}

async function downloadImage(url, outputPath) {
  if (existsSync(outputPath)) {
    return { downloaded: false, outputPath }
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status} ${response.statusText}`)
  }

  writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()))

  return { downloaded: true, outputPath }
}

function resolveMapping(row, mappingConfig) {
  const key = tcglIdentityKey(row)
  const byRowKey = mappingConfig.rows?.[key]
  const byName = mappingConfig.names?.[normalizeDeckText(row.name)]

  return byRowKey ?? byName ?? null
}

function tcgdexImageUrl(card, quality = 'high') {
  if (typeof card.image !== 'string') return null

  return `${card.image}/${quality}.png`
}

function normalizeTcgdexCard({
  row,
  englishReference,
  japaneseCard,
  mapping,
  imageUrl,
  imageFile,
  imagePath,
  downloaded,
}) {
  const mappingStatus =
    mapping?.tcglSetCode && mapping?.tcglCardNumber
      ? 'resolved-print'
      : mapping?.tcgdexId
        ? 'canonical-name-only'
        : 'unresolved'

  return {
    fixtureRows: row.fixtures,
    quantity: row.quantity,
    id: `ja:${japaneseCard.id}`,
    language: 'japanese',
    localizedName: japaneseCard.name ?? mapping?.localizedName ?? '',
    englishName: englishReference?.englishName ?? row.name,
    name: englishReference?.englishName ?? row.name,
    localizedSetCode: japaneseCard.set?.id ?? mapping?.localizedSetCode,
    localizedSetName: japaneseCard.set?.name ?? mapping?.localizedSetName,
    setCode: mapping?.tcglSetCode ?? row.setCode,
    tcglSetCode: mapping?.tcglSetCode ?? row.setCode,
    cardNumber: mapping?.tcglCardNumber ?? row.cardNumber,
    localizedCardNumber: japaneseCard.localId ?? japaneseCard.localID ?? '',
    regulationMark: englishReference?.regulationMark,
    legalities: englishReference?.legalities,
    category: row.category,
    source: 'tcgdex',
    imageUrl,
    imageFile,
    imagePath: path.relative(repoRoot, imagePath),
    publicImagePath: `/card-image-cache/japanese-fixture-subset/images/${imageFile}`,
    downloaded,
    canonicalIdentity: {
      englishName: englishReference?.englishName ?? row.name,
      category: row.category,
      tcglSetCode: mapping?.tcglSetCode ?? row.setCode,
      cardNumber: mapping?.tcglCardNumber ?? row.cardNumber,
      regulationMark: englishReference?.regulationMark,
    },
    languageEquivalenceGroupId:
      mapping?.languageEquivalenceGroupId ??
      `canonical:${normalizeDeckText(row.name)}|${row.category}`,
    mapping: {
      status: mappingStatus,
      confidence: mapping?.confidence ?? (mappingStatus === 'resolved-print' ? 0.9 : 0.55),
      notes: [
        ...(mapping?.notes ?? []),
        ...(mappingStatus === 'canonical-name-only'
          ? ['Japanese visual reference is linked to the English card name, but print mapping is unresolved.']
          : []),
      ],
    },
  }
}

async function buildJapaneseFixtureCardImageCache() {
  const references = loadCardReferences()
  const mappingConfig = loadJsonIfPresent(mappingPath, { rows: {}, names: {} })
  const fixtureRows = collectJapaneseFixtureRows()
  const matched = []
  const unmatched = []

  mkdirSync(imageOutputDir, { recursive: true })
  mkdirSync(publicImageOutputDir, { recursive: true })

  for (const row of fixtureRows) {
    const englishReference = findEnglishReferenceForRow(row, references)
    const mapping = resolveMapping(row, mappingConfig)

    if (!mapping?.tcgdexId) {
      unmatched.push({
        row,
        englishReferenceId: englishReference?.id ?? null,
        reason: 'No Japanese TCGdex mapping configured for this expected row.',
      })
      continue
    }

    const japaneseCard = await fetchTcgdexCard('ja', mapping.tcgdexId)
    const imageUrl = mapping.imageUrl ?? tcgdexImageUrl(japaneseCard)

    if (!imageUrl) {
      unmatched.push({
        row,
        tcgdexId: mapping.tcgdexId,
        reason: 'TCGdex card did not provide an image URL.',
      })
      continue
    }

    const imageFile = `${mapping.tcgdexId.replace(/[^a-z0-9_-]/gi, '-')}${getImageExtension(imageUrl)}`
    const imagePath = path.join(imageOutputDir, imageFile)
    const publicImagePath = path.join(publicImageOutputDir, imageFile)
    const downloadResult = await downloadImage(imageUrl, imagePath)
    copyFileSync(imagePath, publicImagePath)

    matched.push(
      normalizeTcgdexCard({
        row,
        englishReference,
        japaneseCard,
        mapping,
        imageUrl,
        imageFile,
        imagePath,
        downloaded: downloadResult.downloaded,
      })
    )
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: {
      provider: 'tcgdex',
      apiBaseUrl: tcgdexBaseUrl,
      sourceLanguage: 'japanese',
      expectedFixtureRoot: path.relative(
        repoRoot,
        path.join(repoRoot, 'test-data', 'deck-image-importer')
      ),
      mappingPath: path.relative(repoRoot, mappingPath),
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
      normalization: 'japanese-visual-reference-to-english-canonical-tcgl-row',
    },
    cards: matched,
    unmatched,
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(publicManifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log('Japanese fixture card image cache')
  console.log(`  Japanese fixture card rows: ${fixtureRows.length}`)
  console.log(`  Matched Japanese references: ${matched.length}`)
  console.log(`  Missing mappings/images: ${unmatched.length}`)
  console.log(`  Images: ${path.relative(repoRoot, imageOutputDir)}`)
  console.log(`  Manifest: ${path.relative(repoRoot, manifestPath)}`)
  console.log(`  Public images: ${path.relative(repoRoot, publicImageOutputDir)}`)
  console.log(`  Public manifest: ${path.relative(repoRoot, publicManifestPath)}`)
}

buildJapaneseFixtureCardImageCache().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
