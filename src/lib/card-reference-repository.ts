import bundledCardReferenceCache from '../../data/card-reference-cache.json'
import type { CardReference, DeckCardCategory } from '@/types'
import {
  CardReferenceManifest,
  getDownloadedCardReferenceManifest,
  loadDownloadedCardReferenceRecords,
  loadDownloadedCardReferenceRecordsAsync,
} from './card-reference-cache-update'
import {
  getApiSetCodesForTcglSetCode,
  normalizeSetCode,
} from './tcgl-set-code-aliases'

type CardReferenceSearchOptions = {
  category?: DeckCardCategory
  standardOnly?: boolean
}

export type InstalledCardReferenceSource = 'downloaded' | 'bundled' | 'legacy'

export type CardReferenceRepositorySnapshot = {
  source: InstalledCardReferenceSource
  manifest?: CardReferenceManifest
  cards: CardReference[]
}

const bundledReferences = bundledCardReferenceCache as CardReference[]

let repositorySnapshot: CardReferenceRepositorySnapshot | null = null

function normalizeCardReferenceName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function createBundledManifest(): CardReferenceManifest {
  return {
    schemaVersion: 1,
    cacheVersion: 'bundled-legacy',
    generatedAt: '1970-01-01T00:00:00.000Z',
    source: 'pokemon-tcg-api',
    totalSets: new Set(
      bundledReferences.map((card) => card.sourceSetId ?? card.id.split('-')[0])
    ).size,
    totalCards: bundledReferences.length,
    sets: [],
  }
}

function normalizeReference(card: CardReference): CardReference {
  const sourceSetId = card.sourceSetId ?? card.id.split('-')[0] ?? card.setCode

  return {
    ...card,
    source: card.source ?? 'pokemon-tcg-api',
    sourceCardId: card.sourceCardId ?? card.id,
    sourceSetId,
    exactPrintKey:
      card.exactPrintKey ??
      `${card.source ?? 'pokemon-tcg-api'}:${sourceSetId}:${card.cardNumber}:english:${card.id}`,
    language: card.language ?? 'english',
  }
}

function loadRepositorySnapshot(): CardReferenceRepositorySnapshot {
  const downloadedManifest = getDownloadedCardReferenceManifest()
  const downloadedReferences =
    loadDownloadedCardReferenceRecords<CardReference>()

  if (
    downloadedManifest &&
    downloadedReferences &&
    downloadedReferences.length === downloadedManifest.totalCards
  ) {
    return {
      source: 'downloaded',
      manifest: downloadedManifest,
      cards: downloadedReferences.map(normalizeReference),
    }
  }

  return {
    source: 'bundled',
    manifest: createBundledManifest(),
    cards: bundledReferences.map(normalizeReference),
  }
}

export function resetCardReferenceRepositoryForTests() {
  repositorySnapshot = null
}

export function getCardReferenceRepositorySnapshot() {
  repositorySnapshot ??= loadRepositorySnapshot()
  return repositorySnapshot
}

export async function initializeCardReferenceRepository() {
  const downloadedManifest = getDownloadedCardReferenceManifest()
  const downloadedReferences =
    await loadDownloadedCardReferenceRecordsAsync<CardReference>()

  if (
    downloadedManifest &&
    downloadedReferences &&
    downloadedReferences.length === downloadedManifest.totalCards
  ) {
    repositorySnapshot = {
      source: 'downloaded',
      manifest: downloadedManifest,
      cards: downloadedReferences.map(normalizeReference),
    }
    return repositorySnapshot
  }

  repositorySnapshot = loadRepositorySnapshot()
  return repositorySnapshot
}

export function getInstalledCardReferenceSource() {
  return getCardReferenceRepositorySnapshot().source
}

export function getInstalledCardReferenceManifest() {
  return getCardReferenceRepositorySnapshot().manifest
}

export function loadRepositoryCardReferences() {
  return getCardReferenceRepositorySnapshot().cards
}

export function getCardReferenceById(cardId: string) {
  return loadRepositoryCardReferences().find((card) => card.id === cardId)
}

function filterCardReferences(
  cards: CardReference[],
  options: CardReferenceSearchOptions = {}
) {
  return cards.filter((card) => {
    if (options.category && card.category !== options.category) {
      return false
    }

    if (options.standardOnly) {
      const apiStandard = card.legalities?.standard?.toLowerCase()
      if (apiStandard !== 'legal') return false
    }

    return true
  })
}

export function findRepositoryCardsByExactEnglishName(
  englishName: string,
  options: CardReferenceSearchOptions = {}
) {
  const normalizedTarget = englishName.trim().toLowerCase()

  return filterCardReferences(
    loadRepositoryCardReferences().filter(
      (card) => card.englishName.trim().toLowerCase() === normalizedTarget
    ),
    options
  )
}

export function searchRepositoryCardsByNormalizedName(
  query: string,
  options: CardReferenceSearchOptions = {}
) {
  const normalizedQuery = normalizeCardReferenceName(query)

  if (!normalizedQuery) return []

  return filterCardReferences(
    loadRepositoryCardReferences().filter((card) =>
      normalizeCardReferenceName(card.englishName).includes(normalizedQuery)
    ),
    options
  )
}

export function findRepositoryCardBySetAndNumber(
  setCode: string,
  cardNumber: string,
  options: CardReferenceSearchOptions = {}
) {
  const apiSetCodes = getApiSetCodesForTcglSetCode(setCode)
  const normalizedCardNumber = cardNumber.trim().toLowerCase()

  return filterCardReferences(
    loadRepositoryCardReferences().filter(
      (card) =>
        apiSetCodes.includes(normalizeSetCode(card.setCode)) &&
        card.cardNumber.trim().toLowerCase() === normalizedCardNumber
    ),
    options
  )
}

export function resolveEnglishEquivalent(card: CardReference) {
  return getCardReferenceById(card.englishEquivalentReferenceId ?? card.id)
}

export { normalizeCardReferenceName }
