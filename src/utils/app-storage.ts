import type { AdvisorCandidateDeck, Deck, EventRecord, Match } from '@/types'
import type {
  AdvisorMetaDeckInput,
  CandidateSource,
  MetaInputMode,
} from '@/components/deck-advisor/types'
import type { EventType } from '@/utils/tournament'
import { normalizeComfort } from '@/utils/comfort'

export const STORAGE_SCHEMA_VERSION = 1

export const STORAGE_KEYS = {
  decks: 'pokemon-decks',
  matches: 'pokemon-matches',
  events: 'pokemon-events',
  advisor: 'pokemon-advisor-data',
  introLastShown: 'top-cut-intro-last-shown',
  firstLaunchDismissed: 'top-cut-first-launch-dismissed',
} as const

type VersionedValue = {
  schemaVersion: number
  data: unknown
}

export type AppDataSnapshot = {
  decks: Deck[]
  matches: Match[]
  events: EventRecord[]
  advisor: StoredAdvisorData
  introLastShown: string | null
}

export type AppDataExport = {
  appName: 'Top Cut'
  exportFormatVersion: 1
  exportedAt: string
  data: {
    decks: VersionedValue
    matches: VersionedValue
    events: VersionedValue
    advisor: VersionedValue
    introSplash: {
      lastShownAt: string | null
    }
  }
}

type StorageMigrations = Partial<
  Record<number, (value: unknown) => unknown>
>

export type StoredAdvisorData = {
  eventType?: EventType
  playerCount?: string
  eventConfigured?: boolean
  metaInputMode?: MetaInputMode
  metaDecks?: AdvisorMetaDeckInput[]
  candidateDecks?: AdvisorCandidateDeck[]
  candidateSource?: CandidateSource
}

const writeBlockedKeys = new Set<string>()

const migrateLegacyPayload = (value: unknown) => value

// Each domain owns its migration chain. When schema version N + 1 is added,
// add an N migration to every affected chain before incrementing the version.
const deckMigrations: StorageMigrations = { 0: migrateLegacyPayload }
const matchMigrations: StorageMigrations = { 0: migrateLegacyPayload }
const eventMigrations: StorageMigrations = { 0: migrateLegacyPayload }
const advisorMigrations: StorageMigrations = { 0: migrateLegacyPayload }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isVersionedValue(value: unknown): value is VersionedValue {
  return (
    isRecord(value) &&
    typeof value.schemaVersion === 'number' &&
    'data' in value
  )
}

export function safeGetStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetStorageValue(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveStorageValue(key: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    window.localStorage.removeItem(key)
    writeBlockedKeys.delete(key)
    return true
  } catch {
    return false
  }
}

function readVersionedValue<T>(
  key: string,
  fallback: T,
  normalize: (value: unknown) => T,
  migrations: StorageMigrations
): T {
  const rawValue = safeGetStorageValue(key)

  if (rawValue === null) return fallback

  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(rawValue)
  } catch {
    // Preserve unreadable data and prevent persistence effects from replacing it.
    writeBlockedKeys.add(key)
    return fallback
  }

  const sourceVersion = isVersionedValue(parsedValue)
    ? parsedValue.schemaVersion
    : 0
  const sourceData = isVersionedValue(parsedValue)
    ? parsedValue.data
    : parsedValue

  if (sourceVersion > STORAGE_SCHEMA_VERSION) {
    writeBlockedKeys.add(key)
    return fallback
  }

  let migratedData = sourceData

  for (let version = sourceVersion; version < STORAGE_SCHEMA_VERSION; version++) {
    const migrate = migrations[version]

    if (!migrate) {
      writeBlockedKeys.add(key)
      return fallback
    }

    migratedData = migrate(migratedData)
  }

  const normalizedData = normalize(migratedData)

  if (sourceVersion !== STORAGE_SCHEMA_VERSION) {
    writeVersionedValue(key, normalizedData)
  }

  return normalizedData
}

function writeVersionedValue<T>(key: string, data: T): boolean {
  if (writeBlockedKeys.has(key)) return false

  return safeSetStorageValue(
    key,
    JSON.stringify({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      data,
    })
  )
}

function normalizeDeck(value: unknown): Deck | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    typeof value.name !== 'string' ||
    typeof value.decklist !== 'string'
  ) {
    return null
  }

  return {
    id: value.id,
    name: value.name,
    decklist: value.decklist,
    archetype: typeof value.archetype === 'string' ? value.archetype : undefined,
    variant: typeof value.variant === 'string' ? value.variant : undefined,
    comfort: normalizeComfort(value.comfort),
    importMetadata: isRecord(value.importMetadata)
      ? {
          selectedPrintMode:
            value.importMetadata.selectedPrintMode === 'base-print'
              ? 'base-print'
              : 'exact-print',
          recognizedPrints: Array.isArray(value.importMetadata.recognizedPrints)
            ? value.importMetadata.recognizedPrints
            : [],
          basePrints: Array.isArray(value.importMetadata.basePrints)
            ? value.importMetadata.basePrints
            : [],
        }
      : undefined,
  }
}

function normalizeMatch(value: unknown): Match | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    typeof value.eventName !== 'string' ||
    typeof value.round !== 'number' ||
    typeof value.format !== 'string' ||
    typeof value.deck !== 'string' ||
    typeof value.opponentDeck !== 'string' ||
    (value.matchType !== 'BO1' && value.matchType !== 'BO3') ||
    !Array.isArray(value.games)
  ) {
    return null
  }

  return {
    id: value.id,
    eventName: value.eventName,
    eventType: typeof value.eventType === 'string' ? value.eventType : undefined,
    round: value.round,
    format: value.format,
    deck: value.deck,
    opponentDeck: value.opponentDeck,
    matchType: value.matchType,
    games: value.games.filter(
      (game): game is string => game === 'W' || game === 'L' || game === 'T'
    ),
    gameStarts: Array.isArray(value.gameStarts)
      ? value.gameStarts.filter(
          (start): start is '1st' | '2nd' => start === '1st' || start === '2nd'
        )
      : [],
    diceRollWins: Array.isArray(value.diceRollWins)
      ? value.diceRollWins.filter(
          (diceRollWin): diceRollWin is boolean =>
            typeof diceRollWin === 'boolean'
        )
      : undefined,
    finalResult: typeof value.finalResult === 'string' ? value.finalResult : '',
    alternateOutcome:
      value.alternateOutcome === 'intentionalDraw' ||
      value.alternateOutcome === 'noShow' ||
      value.alternateOutcome === 'bye'
        ? value.alternateOutcome
        : undefined,
    notes: typeof value.notes === 'string' ? value.notes : undefined,
  }
}

function normalizeEvent(value: unknown): EventRecord | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    typeof value.eventName !== 'string' ||
    typeof value.eventType !== 'string' ||
    typeof value.format !== 'string' ||
    typeof value.deck !== 'string'
  ) {
    return null
  }

  return {
    id: value.id,
    eventName: value.eventName,
    eventType: value.eventType,
    format: value.format,
    deck: value.deck,
    playerCount:
      typeof value.playerCount === 'number' ? value.playerCount : undefined,
    finalPlacement:
      typeof value.finalPlacement === 'string'
        ? value.finalPlacement
        : undefined,
    championshipPoints:
      typeof value.championshipPoints === 'string'
        ? value.championshipPoints
        : undefined,
    prizing: typeof value.prizing === 'string' ? value.prizing : undefined,
  }
}

function normalizeCollection<T>(
  value: unknown,
  normalizeItem: (item: unknown) => T | null
): T[] {
  if (!Array.isArray(value)) return []

  return value
    .map(normalizeItem)
    .filter((item): item is T => item !== null)
}

function normalizeAdvisorData(value: unknown): StoredAdvisorData {
  if (!isRecord(value)) return {}

  const metaDecks = Array.isArray(value.metaDecks)
    ? value.metaDecks
        .map((metaDeck) => {
          if (!isRecord(metaDeck)) return null

          const share = Number(metaDeck.share)

          return {
            name: typeof metaDeck.name === 'string' ? metaDeck.name : '',
            share: Number.isFinite(share) ? Math.max(0, share) : 0,
          }
        })
        .filter((metaDeck): metaDeck is AdvisorMetaDeckInput => metaDeck !== null)
    : undefined

  const candidateDecks = Array.isArray(value.candidateDecks)
    ? value.candidateDecks.filter(isRecord).map((candidate) => ({
        name: typeof candidate.name === 'string' ? candidate.name : '',
        archetype:
          typeof candidate.archetype === 'string' ? candidate.archetype : '',
        comfort: Math.min(5, Math.max(1, Number(candidate.comfort) || 3)),
        owned: candidate.owned === true,
        matchups: {},
      }))
    : undefined

  return {
    eventType:
      value.eventType === 'challenge' ||
      value.eventType === 'cup' ||
      value.eventType === 'regional'
        ? value.eventType
        : undefined,
    playerCount:
      typeof value.playerCount === 'string' ? value.playerCount : undefined,
    eventConfigured:
      typeof value.eventConfigured === 'boolean'
        ? value.eventConfigured
        : undefined,
    metaInputMode:
      value.metaInputMode === 'percent' || value.metaInputMode === 'players'
        ? value.metaInputMode
        : undefined,
    metaDecks: metaDecks?.length ? metaDecks : undefined,
    candidateDecks,
    candidateSource:
      value.candidateSource === 'owned' || value.candidateSource === 'all'
        ? value.candidateSource
        : undefined,
  }
}

export function readAppStorage() {
  return {
    decks: readVersionedValue(
      STORAGE_KEYS.decks,
      [],
      (value) => normalizeCollection(value, normalizeDeck),
      deckMigrations
    ),
    matches: readVersionedValue(
      STORAGE_KEYS.matches,
      [],
      (value) => normalizeCollection(value, normalizeMatch),
      matchMigrations
    ),
    events: readVersionedValue(
      STORAGE_KEYS.events,
      [],
      (value) => normalizeCollection(value, normalizeEvent),
      eventMigrations
    ),
  }
}

export function writeDecks(decks: Deck[]) {
  return writeVersionedValue(STORAGE_KEYS.decks, decks)
}

export function writeMatches(matches: Match[]) {
  return writeVersionedValue(STORAGE_KEYS.matches, matches)
}

export function writeEvents(events: EventRecord[]) {
  return writeVersionedValue(STORAGE_KEYS.events, events)
}

export function readAdvisorData() {
  return readVersionedValue(
    STORAGE_KEYS.advisor,
    {},
    normalizeAdvisorData,
    advisorMigrations
  )
}

export function writeAdvisorData(data: StoredAdvisorData) {
  return writeVersionedValue(STORAGE_KEYS.advisor, data)
}

function toJsonValue(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value))
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => jsonValuesEqual(item, right[index]))
    )
  }

  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left).sort()
    const rightKeys = Object.keys(right).sort()

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) =>
          key === rightKeys[index] &&
          jsonValuesEqual(left[key], right[key])
      )
    )
  }

  return false
}

function readCurrentVersionedExportValue(
  value: unknown,
  label: string
): unknown {
  if (!isVersionedValue(value)) {
    throw new Error(`${label} is missing its schema version.`)
  }

  if (value.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    throw new Error(
      `${label} uses unsupported schema version ${value.schemaVersion}.`
    )
  }

  return value.data
}

function validateCanonicalValue<T>(
  value: unknown,
  normalize: (input: unknown) => T,
  label: string
): T {
  const normalized = normalize(value)

  if (!jsonValuesEqual(toJsonValue(value), toJsonValue(normalized))) {
    throw new Error(`${label} contains invalid or unsupported data.`)
  }

  return normalized
}

export function createAppDataExport(): AppDataExport {
  const storedData = readAppStorage()
  const advisor = readAdvisorData()

  return {
    appName: 'Top Cut',
    exportFormatVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      decks: {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        data: storedData.decks,
      },
      matches: {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        data: storedData.matches,
      },
      events: {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        data: storedData.events,
      },
      advisor: {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        data: advisor,
      },
      introSplash: {
        lastShownAt: safeGetStorageValue(STORAGE_KEYS.introLastShown),
      },
    },
  }
}

export function parseAppDataExport(serialized: string): AppDataSnapshot {
  let parsed: unknown

  try {
    parsed = JSON.parse(serialized)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }

  if (
    !isRecord(parsed) ||
    parsed.appName !== 'Top Cut' ||
    parsed.exportFormatVersion !== 1 ||
    typeof parsed.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(parsed.exportedAt)) ||
    !isRecord(parsed.data)
  ) {
    throw new Error('This is not a supported Top Cut data export.')
  }

  const decksValue = readCurrentVersionedExportValue(
    parsed.data.decks,
    'Deck data'
  )
  const matchesValue = readCurrentVersionedExportValue(
    parsed.data.matches,
    'Match data'
  )
  const eventsValue = readCurrentVersionedExportValue(
    parsed.data.events,
    'Event data'
  )
  const advisorValue = readCurrentVersionedExportValue(
    parsed.data.advisor,
    'Advisor data'
  )

  if (!isRecord(parsed.data.introSplash)) {
    throw new Error('Intro splash metadata is invalid.')
  }

  const introLastShown = parsed.data.introSplash.lastShownAt

  if (
    introLastShown !== null &&
    (typeof introLastShown !== 'string' ||
      !Number.isFinite(Number(introLastShown)))
  ) {
    throw new Error('Intro splash metadata is invalid.')
  }

  return {
    decks: validateCanonicalValue(
      decksValue,
      (value) => normalizeCollection(value, normalizeDeck),
      'Deck data'
    ),
    matches: validateCanonicalValue(
      matchesValue,
      (value) => normalizeCollection(value, normalizeMatch),
      'Match data'
    ),
    events: validateCanonicalValue(
      eventsValue,
      (value) => normalizeCollection(value, normalizeEvent),
      'Event data'
    ),
    advisor: validateCanonicalValue(
      advisorValue,
      normalizeAdvisorData,
      'Advisor data'
    ),
    introLastShown,
  }
}

function serializeVersionedValue(data: unknown) {
  return JSON.stringify({
    schemaVersion: STORAGE_SCHEMA_VERSION,
    data,
  })
}

export function replaceAppStorage(snapshot: AppDataSnapshot): boolean {
  const replacements = new Map<string, string | null>([
    [STORAGE_KEYS.decks, serializeVersionedValue(snapshot.decks)],
    [STORAGE_KEYS.matches, serializeVersionedValue(snapshot.matches)],
    [STORAGE_KEYS.events, serializeVersionedValue(snapshot.events)],
    [STORAGE_KEYS.advisor, serializeVersionedValue(snapshot.advisor)],
    [STORAGE_KEYS.introLastShown, snapshot.introLastShown],
  ])
  const previousValues = new Map(
    Array.from(replacements.keys(), (key) => [
      key,
      safeGetStorageValue(key),
    ])
  )

  for (const [key, value] of replacements) {
    const succeeded =
      value === null
        ? safeRemoveStorageValue(key)
        : safeSetStorageValue(key, value)

    if (!succeeded) {
      for (const [rollbackKey, rollbackValue] of previousValues) {
        if (rollbackValue === null) {
          safeRemoveStorageValue(rollbackKey)
        } else {
          safeSetStorageValue(rollbackKey, rollbackValue)
        }
      }

      return false
    }
  }

  replacements.forEach((_, key) => writeBlockedKeys.delete(key))
  return true
}

export function clearAppStorage(): boolean {
  const results = Object.values(STORAGE_KEYS).map((key) =>
    safeRemoveStorageValue(key)
  )

  return results.every(Boolean)
}
