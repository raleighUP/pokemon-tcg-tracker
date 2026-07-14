import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.resolve(__dirname, '..', '..')
export const deckImageFixtureRoot = path.join(
  repoRoot,
  'test-data',
  'deck-image-importer'
)

export const supportedFixtureImageExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.jfif',
  '.webp',
])

export function readTextIfPresent(filePath) {
  if (!existsSync(filePath)) return ''

  return readFileSync(filePath, 'utf8')
}

export function readJsonIfPresent(filePath) {
  const text = readTextIfPresent(filePath)

  if (!text.trim()) return null

  return JSON.parse(text)
}

function inferSourceType(fileName) {
  const normalized = fileName.toLowerCase()

  if (normalized.startsWith('digital')) return 'digital'
  if (normalized.startsWith('physical')) return 'physical'

  return 'unknown'
}

function normalizeMetadataImages(metadata) {
  if (!Array.isArray(metadata?.images)) return []

  return metadata.images
    .filter((image) => typeof image?.file === 'string' && image.file.trim())
    .map((image) => ({
      file: image.file,
      sourceType: image.sourceType ?? inferSourceType(image.file),
      label: image.label ?? image.file,
      platform: image.platform ?? metadata?.platform ?? 'unknown',
      language: image.language ?? metadata?.language ?? 'unknown',
      badgeAnchor: image.badgeAnchor ?? metadata?.badgeAnchor ?? 'unknown',
      benchmarkGroup:
        image.benchmarkGroup ?? metadata?.benchmarkGroup ?? 'validation',
      notes: image.notes ?? null,
    }))
}

function discoverImageFiles(fixturePath, metadata) {
  const metadataImages = normalizeMetadataImages(metadata)
  const metadataByFile = new Map(
    metadataImages.map((image) => [image.file.toLowerCase(), image])
  )
  const images = []

  for (const entry of readdirSync(fixturePath, { withFileTypes: true })) {
    if (!entry.isFile()) continue

    const extension = path.extname(entry.name).toLowerCase()

    if (!supportedFixtureImageExtensions.has(extension)) continue

    const metadataImage = metadataByFile.get(entry.name.toLowerCase())

    images.push({
      file: entry.name,
      absolutePath: path.join(fixturePath, entry.name),
      sourceType: metadataImage?.sourceType ?? inferSourceType(entry.name),
      label: metadataImage?.label ?? entry.name,
      platform: metadataImage?.platform ?? metadata?.platform ?? 'unknown',
      language: metadataImage?.language ?? metadata?.language ?? 'unknown',
      badgeAnchor: metadataImage?.badgeAnchor ?? metadata?.badgeAnchor ?? 'unknown',
      benchmarkGroup:
        metadataImage?.benchmarkGroup ?? metadata?.benchmarkGroup ?? 'validation',
      notes: metadataImage?.notes ?? null,
    })
  }

  return images.sort((a, b) => a.file.localeCompare(b.file))
}

export function discoverDeckImageFixtures(root = deckImageFixtureRoot) {
  if (!existsSync(root)) return []

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const fixturePath = path.join(root, entry.name)
      const metadata = readJsonIfPresent(path.join(fixturePath, 'metadata.json'))
      const expectedPath = path.join(fixturePath, 'expected.txt')
      const expectedText = readTextIfPresent(expectedPath)

      return {
        fixture: entry.name,
        fixturePath,
        deckName: metadata?.deckName ?? entry.name,
        expectedPath,
        expectedText,
        expectedTotalCards: metadata?.expectedTotalCards ?? null,
        language: metadata?.language ?? 'unknown',
        sourceTypes: metadata?.sourceTypes ?? [],
        benchmarkGroup: metadata?.benchmarkGroup ?? 'validation',
        metadata,
        images: discoverImageFiles(fixturePath, metadata),
      }
    })
    .sort((a, b) => a.fixture.localeCompare(b.fixture))
}
