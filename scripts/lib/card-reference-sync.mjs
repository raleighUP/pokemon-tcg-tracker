import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const CARD_REFERENCE_SCHEMA_VERSION = 1
export const SOURCE_PROVIDER = 'pokemon-tcg-api'
export const DEFAULT_API_BASE_URL = 'https://api.pokemontcg.io/v2'
export const DEFAULT_REMOVAL_THRESHOLD = 0.01

const SUPPORTED_CATEGORIES = new Set(['Pokemon', 'Trainer', 'Energy'])

export function readJson(filePath, fallback = undefined) {
  if (!existsSync(filePath)) return fallback
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

export function stableJson(value) {
  return `${JSON.stringify(value, Object.keys(value).sort(), 2)}\n`
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

export function fingerprint(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex')
}

export function normalizeCardCategory(card) {
  const supertype = String(card.supertype ?? card.category ?? '').toLowerCase()

  if (supertype === 'pokemon' || supertype === 'pokémon') return 'Pokemon'
  if (supertype === 'trainer') return 'Trainer'
  if (supertype === 'energy') return 'Energy'

  return null
}

export function normalizeApiCard(card, syncedAt = new Date().toISOString()) {
  const category = normalizeCardCategory(card)

  if (!category) return null

  const setId = String(card.set?.id ?? card.sourceSetId ?? '').trim()
  const id = String(card.id ?? '').trim()
  const cardNumber = String(card.number ?? card.cardNumber ?? '').trim()

  if (!id || !setId || !cardNumber) return null

  const source = SOURCE_PROVIDER
  const language = String(card.language ?? 'english')
  const exactPrintKey = `${source}:${setId}:${cardNumber}:${language}:${id}`

  return {
    id,
    englishName: String(card.name ?? card.englishName ?? '').trim(),
    category,
    setCode: String(card.set?.ptcgoCode ?? card.setCode ?? setId).trim(),
    setName:
      typeof card.set?.name === 'string'
        ? card.set.name
        : typeof card.setName === 'string'
          ? card.setName
          : undefined,
    cardNumber,
    regulationMark:
      typeof card.regulationMark === 'string' ? card.regulationMark : undefined,
    legalities:
      card.legalities && typeof card.legalities === 'object'
        ? {
            standard: card.legalities.standard,
            expanded: card.legalities.expanded,
            unlimited: card.legalities.unlimited,
          }
        : undefined,
    imageSmall:
      typeof card.images?.small === 'string'
        ? card.images.small
        : typeof card.imageSmall === 'string'
          ? card.imageSmall
          : undefined,
    imageLarge:
      typeof card.images?.large === 'string'
        ? card.images.large
        : typeof card.imageLarge === 'string'
          ? card.imageLarge
          : undefined,
    source,
    sourceCardId: id,
    sourceSetId: setId,
    language,
    exactPrintKey,
    exactPrintIdentity: {
      source,
      sourceCardId: id,
      setId,
      collectorNumber: cardNumber,
      language,
    },
    englishEquivalentReferenceId:
      typeof card.englishEquivalentReferenceId === 'string'
        ? card.englishEquivalentReferenceId
        : id,
    sourceUpdatedAt:
      typeof card.updatedAt === 'string'
        ? card.updatedAt
        : typeof card.set?.updatedAt === 'string'
          ? card.set.updatedAt
          : undefined,
    syncedAt,
  }
}

export function normalizeApiSet(set) {
  return {
    id: String(set.id ?? '').trim(),
    name: String(set.name ?? '').trim(),
    printedTotal:
      Number.isFinite(Number(set.printedTotal)) ? Number(set.printedTotal) : undefined,
    total: Number.isFinite(Number(set.total)) ? Number(set.total) : undefined,
    releaseDate: typeof set.releaseDate === 'string' ? set.releaseDate : undefined,
    lastUpdated: typeof set.updatedAt === 'string' ? set.updatedAt : undefined,
    ptcgoCode: typeof set.ptcgoCode === 'string' ? set.ptcgoCode : undefined,
  }
}

export function groupCardsBySourceSet(cards) {
  const grouped = new Map()

  for (const card of cards) {
    const sourceSetId = String(card.sourceSetId ?? '').trim()
    if (!sourceSetId) continue
    const existing = grouped.get(sourceSetId) ?? []
    existing.push(card)
    grouped.set(sourceSetId, existing)
  }

  return grouped
}

export function buildIndexes(cards) {
  const cardNameIndex = {}
  const setNumberIndex = {}
  const multilingualNameIndex = {}

  for (const card of cards) {
    const normalizedName = String(card.englishName ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
    const setNumberKey = `${String(card.setCode).toLowerCase()}|${String(
      card.cardNumber
    ).toLowerCase()}`

    cardNameIndex[normalizedName] ??= []
    cardNameIndex[normalizedName].push(card.id)
    setNumberIndex[setNumberKey] ??= []
    setNumberIndex[setNumberKey].push(card.id)

    if (Array.isArray(card.localizedNames)) {
      for (const localizedName of card.localizedNames) {
        const key = String(localizedName)
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
        if (!key) continue
        multilingualNameIndex[key] ??= []
        multilingualNameIndex[key].push(card.id)
      }
    }
  }

  for (const index of [cardNameIndex, setNumberIndex, multilingualNameIndex]) {
    for (const key of Object.keys(index)) {
      index[key].sort()
    }
  }

  return { cardNameIndex, setNumberIndex, multilingualNameIndex }
}

export function createManifest({ sets, setCards, generatedAt }) {
  const manifestSets = sets
    .map((set) => {
      const cards = setCards.get(set.id) ?? []
      return {
        id: set.id,
        name: set.name,
        printedTotal: set.printedTotal,
        total: set.total,
        releaseDate: set.releaseDate,
        lastUpdated: set.lastUpdated,
        cardCount: cards.length,
        fingerprint: fingerprint(cards),
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id))

  const allCards = [...setCards.values()].flat()

  const versionPayload = {
    schemaVersion: CARD_REFERENCE_SCHEMA_VERSION,
    source: SOURCE_PROVIDER,
    totalSets: manifestSets.length,
    totalCards: allCards.length,
    sets: manifestSets.map((set) => ({
      id: set.id,
      cardCount: set.cardCount,
      fingerprint: set.fingerprint,
    })),
  }

  return {
    schemaVersion: CARD_REFERENCE_SCHEMA_VERSION,
    cacheVersion: fingerprint(versionPayload),
    generatedAt,
    source: SOURCE_PROVIDER,
    sourceUpdatedAt: manifestSets
      .map((set) => set.lastUpdated)
      .filter(Boolean)
      .sort()
      .at(-1),
    totalSets: manifestSets.length,
    totalCards: allCards.length,
    standardLegalCards: allCards.filter(
      (card) => String(card.legalities?.standard ?? '').toLowerCase() === 'legal'
    ).length,
    sets: manifestSets,
  }
}

export function validateCachePayload({
  manifest,
  setCards,
  previousManifest,
  allowRemovals = false,
  removalThreshold = DEFAULT_REMOVAL_THRESHOLD,
}) {
  const errors = []
  const knownSets = new Set(manifest.sets.map((set) => set.id))
  const exactPrintKeys = new Set()
  let totalCards = 0

  for (const [setId, cards] of setCards) {
    if (!knownSets.has(setId)) {
      errors.push(`Set file ${setId} is not present in manifest.`)
    }

    totalCards += cards.length

    for (const card of cards) {
      if (!card.id) errors.push(`Card in ${setId} is missing id.`)
      if (!card.sourceSetId || !knownSets.has(card.sourceSetId)) {
        errors.push(`Card ${card.id} references unknown source set ${card.sourceSetId}.`)
      }
      if (typeof card.cardNumber !== 'string') {
        errors.push(`Card ${card.id} has non-string collector number.`)
      }
      if (!SUPPORTED_CATEGORIES.has(card.category)) {
        errors.push(`Card ${card.id} has unsupported category ${card.category}.`)
      }
      for (const imageUrl of [card.imageSmall, card.imageLarge].filter(Boolean)) {
        try {
          new URL(imageUrl)
        } catch {
          errors.push(`Card ${card.id} has invalid image URL ${imageUrl}.`)
        }
      }

      const exactPrintKey =
        card.exactPrintKey ??
        `${card.source}:${card.sourceSetId}:${card.cardNumber}:${card.language ?? 'english'}:${card.id}`
      if (exactPrintKeys.has(exactPrintKey)) {
        errors.push(`Duplicate exact-print key ${exactPrintKey}.`)
      }
      exactPrintKeys.add(exactPrintKey)
    }
  }

  if (totalCards !== manifest.totalCards) {
    errors.push(`Manifest totalCards ${manifest.totalCards} does not match ${totalCards}.`)
  }

  if (previousManifest && !allowRemovals) {
    const previousTotal = Number(previousManifest.totalCards ?? 0)
    const removed = previousTotal - totalCards
    const allowed = Math.ceil(previousTotal * removalThreshold)

    if (removed > allowed) {
      errors.push(
        `Card count decreased by ${removed}, exceeding ${allowed} allowed by safety threshold.`
      )
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

async function fetchJsonWithRetry(url, options = {}, attempts = 4) {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options)
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`${response.status} ${response.statusText}`)
      }
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
      }
      return response.json()
    } catch (error) {
      lastError = error
      if (attempt === attempts) break
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)))
    }
  }

  throw lastError
}

export async function fetchAllSets({ apiBaseUrl, headers }) {
  const url = new URL(`${apiBaseUrl}/sets`)
  url.searchParams.set(
    'select',
    ['id', 'name', 'ptcgoCode', 'printedTotal', 'total', 'releaseDate', 'updatedAt'].join(',')
  )
  const payload = await fetchJsonWithRetry(url, { headers })

  if (!Array.isArray(payload.data)) {
    throw new Error('Unexpected Pokemon TCG API set payload.')
  }

  return payload.data.map(normalizeApiSet).filter((set) => set.id)
}

export async function fetchCardsForSet({ apiBaseUrl, headers, setId, syncedAt }) {
  const cards = []
  let page = 1
  const pageSize = 250
  let totalCount = Number.POSITIVE_INFINITY

  while (cards.length < totalCount) {
    const url = new URL(`${apiBaseUrl}/cards`)
    url.searchParams.set('q', `set.id:${setId}`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('pageSize', String(pageSize))
    url.searchParams.set(
      'select',
      [
        'id',
        'name',
        'supertype',
        'set',
        'number',
        'regulationMark',
        'legalities',
        'images',
        'updatedAt',
      ].join(',')
    )

    const payload = await fetchJsonWithRetry(url, { headers })
    if (!Array.isArray(payload.data)) {
      throw new Error(`Unexpected Pokemon TCG API card payload for ${setId}.`)
    }

    totalCount = Number(payload.totalCount ?? payload.data.length)

    for (const apiCard of payload.data) {
      const card = normalizeApiCard(apiCard, syncedAt)
      if (card) cards.push(card)
    }

    if (payload.data.length === 0) break
    page += 1
  }

  return cards.sort((a, b) =>
    `${a.englishName}|${a.cardNumber}|${a.id}`.localeCompare(
      `${b.englishName}|${b.cardNumber}|${b.id}`
    )
  )
}

export function loadExistingPublicCache(cacheRoot) {
  const manifestPath = path.join(cacheRoot, 'card-reference-manifest.json')
  const manifest = readJson(manifestPath)
  const setCards = new Map()

  if (!manifest) return { manifest: undefined, setCards }

  for (const set of manifest.sets ?? []) {
    const setPath = path.join(cacheRoot, 'sets', `${set.id}.json`)
    const cards = readJson(setPath, [])
    setCards.set(set.id, Array.isArray(cards) ? cards : [])
  }

  return { manifest, setCards }
}

export function createCacheFromLegacyCards(cards, syncedAt = new Date().toISOString()) {
  const normalizedCards = cards
    .map((card) =>
      normalizeApiCard(
        {
          ...card,
          supertype: card.category,
          name: card.englishName,
          number: card.cardNumber,
          set: {
            id: card.sourceSetId ?? card.id.split('-')[0],
            name: card.setName,
            ptcgoCode: card.setCode,
            updatedAt: card.sourceUpdatedAt,
          },
          images: {
            small: card.imageSmall,
            large: card.imageLarge,
          },
        },
        syncedAt
      )
    )
    .filter(Boolean)

  const setCards = groupCardsBySourceSet(normalizedCards)
  const sets = [...setCards.entries()]
    .map(([setId, setCardsForSet]) => ({
      id: setId,
      name: setCardsForSet[0]?.setName ?? setId,
      printedTotal: undefined,
      total: undefined,
      releaseDate: undefined,
      lastUpdated: setCardsForSet
        .map((card) => card.sourceUpdatedAt)
        .filter(Boolean)
        .sort()
        .at(-1),
      cardCount: setCardsForSet.length,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  return { sets, setCards }
}

export function writeCacheAtomically({
  cacheRoot,
  legacyCachePath,
  manifest,
  setCards,
  writeLegacy = true,
}) {
  const parent = path.dirname(cacheRoot)
  mkdirSync(parent, { recursive: true })
  const stagingRoot = mkdtempSync(path.join(tmpdir(), 'card-reference-cache-'))
  const stagedCacheRoot = path.join(stagingRoot, 'card-reference')

  try {
    mkdirSync(path.join(stagedCacheRoot, 'sets'), { recursive: true })
    mkdirSync(path.join(stagedCacheRoot, 'indexes'), { recursive: true })

    const allCards = [...setCards.values()]
      .flat()
      .sort((a, b) =>
        `${a.englishName}|${a.setCode}|${a.cardNumber}|${a.id}`.localeCompare(
          `${b.englishName}|${b.setCode}|${b.cardNumber}|${b.id}`
        )
      )

    for (const [setId, cards] of setCards) {
      writeFileSync(
        path.join(stagedCacheRoot, 'sets', `${setId}.json`),
        `${JSON.stringify(cards, null, 2)}\n`
      )
    }

    const indexes = buildIndexes(allCards)
    writeFileSync(
      path.join(stagedCacheRoot, 'indexes', 'card-name-index.json'),
      `${JSON.stringify(indexes.cardNameIndex, null, 2)}\n`
    )
    writeFileSync(
      path.join(stagedCacheRoot, 'indexes', 'set-number-index.json'),
      `${JSON.stringify(indexes.setNumberIndex, null, 2)}\n`
    )
    writeFileSync(
      path.join(stagedCacheRoot, 'indexes', 'multilingual-name-index.json'),
      `${JSON.stringify(indexes.multilingualNameIndex, null, 2)}\n`
    )
    writeFileSync(
      path.join(stagedCacheRoot, 'card-reference-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`
    )

    if (existsSync(cacheRoot)) {
      rmSync(cacheRoot, { recursive: true, force: true })
    }
    renameSync(stagedCacheRoot, cacheRoot)

    if (writeLegacy && legacyCachePath) {
      mkdirSync(path.dirname(legacyCachePath), { recursive: true })
      writeFileSync(legacyCachePath, `${JSON.stringify(allCards, null, 2)}\n`)
    }
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true })
  }
}

export function copyCacheSnapshot(sourceRoot, destinationRoot) {
  if (!existsSync(sourceRoot)) return false
  rmSync(destinationRoot, { recursive: true, force: true })
  cpSync(sourceRoot, destinationRoot, { recursive: true })
  return true
}

export function determineChangedSets({ upstreamSets, existingManifest, forceSetIds = [] }) {
  const existingSets = new Map((existingManifest?.sets ?? []).map((set) => [set.id, set]))
  const forced = new Set(forceSetIds)
  const changed = []
  const unchanged = []

  for (const set of upstreamSets) {
    const existing = existingSets.get(set.id)
    const reason = !existing
      ? 'new-set'
      : forced.has(set.id)
        ? 'forced'
        : existing.total !== set.total
          ? 'set-total-changed'
          : existing.printedTotal !== set.printedTotal
            ? 'printed-total-changed'
            : existing.releaseDate !== set.releaseDate
              ? 'release-date-changed'
              : existing.lastUpdated !== set.lastUpdated
                ? 'source-updated'
                : null

    if (reason) changed.push({ set, reason })
    else unchanged.push(set)
  }

  return { changed, unchanged }
}

export async function syncCardReferenceCache({
  cacheRoot,
  legacyCachePath,
  legacyInputPath,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  full = false,
  dryRun = false,
  forceSetIds = [],
  fromLocal = false,
  allowRemovals = false,
  removalThreshold = DEFAULT_REMOVAL_THRESHOLD,
  writeLegacy = true,
  now = new Date(),
} = {}) {
  const generatedAt = now.toISOString()
  const existing = loadExistingPublicCache(cacheRoot)
  const headers = {}

  if (process.env.POKEMON_TCG_API_KEY) {
    headers['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY
  }

  let sets
  let setCards
  let changed = []
  let unchanged = []

  if (fromLocal) {
    const legacyCards = readJson(legacyInputPath, [])
    const localCache = createCacheFromLegacyCards(legacyCards, generatedAt)
    sets = localCache.sets
    setCards = localCache.setCards
    changed = sets.map((set) => ({ set, reason: 'local-bootstrap' }))
  } else {
    sets = await fetchAllSets({ apiBaseUrl, headers })
    const changes = determineChangedSets({
      upstreamSets: sets,
      existingManifest: full ? undefined : existing.manifest,
      forceSetIds,
    })
    changed = full ? sets.map((set) => ({ set, reason: 'full-rebuild' })) : changes.changed
    unchanged = full ? [] : changes.unchanged
    setCards = new Map()

    for (const set of unchanged) {
      const cards = existing.setCards.get(set.id)
      if (cards) setCards.set(set.id, cards)
      else changed.push({ set, reason: 'missing-local-set-file' })
    }

    if (!full && changed.length === 0 && existing.manifest) {
      return {
        mode: 'incremental',
        dryRun,
        changedSets: [],
        unchangedSets: unchanged.length,
        totalSets: existing.manifest.totalSets,
        totalCards: existing.manifest.totalCards,
        outputRoot: cacheRoot,
        legacyCachePath: writeLegacy ? legacyCachePath : undefined,
        noChanges: true,
      }
    }

    for (const { set } of changed) {
      setCards.set(
        set.id,
        await fetchCardsForSet({ apiBaseUrl, headers, setId: set.id, syncedAt: generatedAt })
      )
    }
  }

  const manifest = createManifest({ sets, setCards, generatedAt })
  const validation = validateCachePayload({
    manifest,
    setCards,
    previousManifest: existing.manifest,
    allowRemovals,
    removalThreshold,
  })

  if (!validation.ok) {
    const error = new Error(`Card reference cache validation failed:\n${validation.errors.join('\n')}`)
    error.validation = validation
    throw error
  }

  const report = {
    mode: fromLocal ? 'local-bootstrap' : full ? 'full' : 'incremental',
    dryRun,
    changedSets: changed.map(({ set, reason }) => ({
      id: set.id,
      name: set.name,
      reason,
      cardCount: setCards.get(set.id)?.length ?? 0,
    })),
    unchangedSets: unchanged.length,
    totalSets: manifest.totalSets,
    totalCards: manifest.totalCards,
    outputRoot: cacheRoot,
    legacyCachePath: writeLegacy ? legacyCachePath : undefined,
  }

  if (!dryRun) {
    writeCacheAtomically({
      cacheRoot,
      legacyCachePath,
      manifest,
      setCards,
      writeLegacy,
    })
  }

  return report
}
