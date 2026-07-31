export type CardReferenceManifestSet = {
  id: string
  name: string
  printedTotal?: number
  total?: number
  ptcgoCode?: string
  releaseDate?: string
  lastUpdated?: string
  cardCount: number
  fingerprint?: string
}

export type CardReferenceManifest = {
  schemaVersion: number
  cacheVersion: string
  generatedAt: string
  source: string
  sourceUpdatedAt?: string
  totalSets: number
  totalCards: number
  standardLegalCards?: number
  sets: CardReferenceManifestSet[]
}

export type CardReferenceCacheDiagnostics = {
  bundled?: CardReferenceManifest
  downloaded?: CardReferenceManifest
  active?: CardReferenceManifest
  updateAvailable: boolean
  source: 'bundled' | 'downloaded'
  lastError?: string
}

const SUPPORTED_SCHEMA_VERSION = 1
const STORAGE_PREFIX = 'top-cut.card-reference-cache.'
const MANIFEST_KEY = `${STORAGE_PREFIX}manifest`
const ACTIVE_VERSION_KEY = `${STORAGE_PREFIX}active-version`
const LAST_ERROR_KEY = `${STORAGE_PREFIX}last-error`
const INDEX_FILES = [
  'card-name-index.json',
  'set-number-index.json',
  'multilingual-name-index.json',
] as const
const DB_NAME = 'top-cut-card-reference-cache'
const DB_VERSION = 1
const STORE_NAME = 'files'

function isBrowserStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isIndexedDbAvailable() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function openCacheDb() {
  if (!isIndexedDbAvailable()) return Promise.resolve(undefined)

  return new Promise<IDBDatabase | undefined>((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onerror = () => resolve(undefined)
    request.onsuccess = () => resolve(request.result)
  })
}

async function readPersistedPayload(key: string) {
  const db = await openCacheDb()

  if (!db) return window.localStorage.getItem(key)

  return new Promise<string | null>((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(key)

    request.onerror = () => resolve(window.localStorage.getItem(key))
    request.onsuccess = () => {
      resolve(typeof request.result === 'string' ? request.result : null)
    }
  })
}

async function writePersistedPayload(key: string, payload: string) {
  const db = await openCacheDb()

  if (!db) {
    window.localStorage.setItem(key, payload)
    return
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const request = transaction.objectStore(STORE_NAME).put(payload, key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

function parseManifest(value: string | null): CardReferenceManifest | undefined {
  if (!value) return undefined

  try {
    const manifest = JSON.parse(value) as CardReferenceManifest

    if (
      manifest.schemaVersion !== SUPPORTED_SCHEMA_VERSION ||
      typeof manifest.cacheVersion !== 'string' ||
      manifest.cacheVersion.length === 0 ||
      !Array.isArray(manifest.sets)
    ) {
      return undefined
    }

    return manifest
  } catch {
    return undefined
  }
}

function isNewerManifest(
  candidate?: CardReferenceManifest,
  current?: CardReferenceManifest
) {
  if (!candidate) return false
  if (!current) return true
  if (candidate.schemaVersion !== current.schemaVersion) return false
  if (candidate.cacheVersion === current.cacheVersion) return false

  return Date.parse(candidate.generatedAt) > Date.parse(current.generatedAt)
}

async function fetchManifest(manifestUrl: string) {
  const response = await fetch(manifestUrl, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Manifest request failed: ${response.status} ${response.statusText}`)
  }

  const manifest = (await response.json()) as CardReferenceManifest

  if (manifest.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(`Unsupported card reference schema ${manifest.schemaVersion}`)
  }

  if (!Array.isArray(manifest.sets)) {
    throw new Error('Remote card reference manifest is missing sets.')
  }

  return manifest
}

async function fetchText(url: string) {
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Cache file request failed: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

function joinRemotePath(remoteRootUrl: string, relativePath: string) {
  return new URL(relativePath, remoteRootUrl.endsWith('/') ? remoteRootUrl : `${remoteRootUrl}/`).toString()
}

export function getDownloadedCardReferenceManifest() {
  if (!isBrowserStorageAvailable()) return undefined

  return parseManifest(window.localStorage.getItem(MANIFEST_KEY))
}

export function loadDownloadedCardReferenceRecords<TCard>() {
  if (!isBrowserStorageAvailable()) return undefined

  const manifest = getDownloadedCardReferenceManifest()
  if (!manifest) return undefined
  const activeVersion = window.localStorage.getItem(ACTIVE_VERSION_KEY)
  if (activeVersion !== manifest.cacheVersion) return undefined

  const cards: TCard[] = []

  try {
    for (const set of manifest.sets) {
      const payload = window.localStorage.getItem(
        `${STORAGE_PREFIX}${manifest.cacheVersion}.set.${set.id}`
      )
      if (!payload) return undefined
      const setCards = JSON.parse(payload) as TCard[]
      if (!Array.isArray(setCards)) return undefined
      cards.push(...setCards)
    }
  } catch {
    return undefined
  }

  return cards
}

export async function loadDownloadedCardReferenceRecordsAsync<TCard>() {
  if (!isBrowserStorageAvailable()) return undefined

  const manifest = getDownloadedCardReferenceManifest()
  if (!manifest) return undefined
  const activeVersion = window.localStorage.getItem(ACTIVE_VERSION_KEY)
  if (activeVersion !== manifest.cacheVersion) return undefined

  const cards: TCard[] = []

  try {
    for (const set of manifest.sets) {
      const payload = await readPersistedPayload(
        `${STORAGE_PREFIX}${manifest.cacheVersion}.set.${set.id}`
      )
      if (!payload) return undefined
      const setCards = JSON.parse(payload) as TCard[]
      if (!Array.isArray(setCards)) return undefined
      cards.push(...setCards)
    }
  } catch {
    return undefined
  }

  return cards
}

export function getCardReferenceCacheDiagnostics(
  bundled?: CardReferenceManifest
): CardReferenceCacheDiagnostics {
  const downloaded = getDownloadedCardReferenceManifest()
  const active = isNewerManifest(downloaded, bundled) ? downloaded : bundled
  const lastError = isBrowserStorageAvailable()
    ? window.localStorage.getItem(LAST_ERROR_KEY) ?? undefined
    : undefined

  return {
    bundled,
    downloaded,
    active,
    updateAvailable: isNewerManifest(downloaded, bundled),
    source: active === downloaded ? 'downloaded' : 'bundled',
    lastError,
  }
}

export async function checkForCardReferenceCacheUpdate({
  remoteManifestUrl,
  bundledManifest,
}: {
  remoteManifestUrl: string
  bundledManifest?: CardReferenceManifest
}) {
  if (!isBrowserStorageAvailable()) {
    return getCardReferenceCacheDiagnostics(bundledManifest)
  }

  try {
    await fetchManifest(remoteManifestUrl)
    window.localStorage.removeItem(LAST_ERROR_KEY)
  } catch (error) {
    window.localStorage.setItem(
      LAST_ERROR_KEY,
      error instanceof Error ? error.message : String(error)
    )
  }

  return getCardReferenceCacheDiagnostics(bundledManifest)
}

export async function downloadCardReferenceCacheUpdate({
  remoteRootUrl,
  bundledManifest,
}: {
  remoteRootUrl: string
  bundledManifest?: CardReferenceManifest
}) {
  if (!isBrowserStorageAvailable()) {
    return getCardReferenceCacheDiagnostics(bundledManifest)
  }

  try {
    const remoteManifest = await fetchManifest(
      joinRemotePath(remoteRootUrl, 'card-reference-manifest.json')
    )
    const currentManifest = getDownloadedCardReferenceManifest() ?? bundledManifest

    if (!isNewerManifest(remoteManifest, currentManifest)) {
      window.localStorage.removeItem(LAST_ERROR_KEY)
      return getCardReferenceCacheDiagnostics(bundledManifest)
    }

    const activeVersion = window.localStorage.getItem(ACTIVE_VERSION_KEY)
    const stagedPrefix = `${STORAGE_PREFIX}staged.${remoteManifest.cacheVersion}.`

    for (const set of remoteManifest.sets) {
      const currentSet = currentManifest?.sets.find(
        (candidate) =>
          candidate.id === set.id &&
          candidate.fingerprint === set.fingerprint &&
          candidate.cardCount === set.cardCount
      )
      const activePayload =
        activeVersion && currentSet
          ? await readPersistedPayload(
              `${STORAGE_PREFIX}${activeVersion}.set.${set.id}`
            )
          : undefined
      const setPayload =
        activePayload ??
        (await fetchText(joinRemotePath(remoteRootUrl, `sets/${set.id}.json`)))
      JSON.parse(setPayload)
      await writePersistedPayload(`${stagedPrefix}set.${set.id}`, setPayload)
    }

    for (const indexFile of INDEX_FILES) {
      const indexPayload = await fetchText(joinRemotePath(remoteRootUrl, `indexes/${indexFile}`))
      JSON.parse(indexPayload)
      await writePersistedPayload(`${stagedPrefix}index.${indexFile}`, indexPayload)
    }

    let stagedCardCount = 0

    for (const set of remoteManifest.sets) {
      const payload = await readPersistedPayload(`${stagedPrefix}set.${set.id}`)
      if (!payload) {
        throw new Error(`Downloaded card reference cache is missing set ${set.id}.`)
      }
      const setCards = JSON.parse(payload) as unknown[]
      stagedCardCount += Array.isArray(setCards) ? setCards.length : 0
    }

    if (stagedCardCount !== remoteManifest.totalCards) {
      throw new Error(
        `Downloaded card reference cache has ${stagedCardCount} cards; expected ${remoteManifest.totalCards}.`
      )
    }

    for (const indexFile of INDEX_FILES) {
      if (!(await readPersistedPayload(`${stagedPrefix}index.${indexFile}`))) {
        throw new Error(`Downloaded card reference cache is missing ${indexFile}.`)
      }
    }

    for (const set of remoteManifest.sets) {
      const payload = await readPersistedPayload(`${stagedPrefix}set.${set.id}`)
      if (!payload) continue
      await writePersistedPayload(
        `${STORAGE_PREFIX}${remoteManifest.cacheVersion}.set.${set.id}`,
        payload
      )
    }

    for (const indexFile of INDEX_FILES) {
      const payload = await readPersistedPayload(`${stagedPrefix}index.${indexFile}`)
      if (!payload) continue
      await writePersistedPayload(
        `${STORAGE_PREFIX}${remoteManifest.cacheVersion}.index.${indexFile}`,
        payload
      )
    }

    window.localStorage.setItem(ACTIVE_VERSION_KEY, remoteManifest.cacheVersion)
    window.localStorage.setItem(MANIFEST_KEY, JSON.stringify(remoteManifest))
    window.localStorage.removeItem(LAST_ERROR_KEY)
  } catch (error) {
    window.localStorage.setItem(
      LAST_ERROR_KEY,
      error instanceof Error ? error.message : String(error)
    )
  }

  return getCardReferenceCacheDiagnostics(bundledManifest)
}
