import type { CardReference } from '@/types'
import {
  findRepositoryCardBySetAndNumber,
  findRepositoryCardsByExactEnglishName,
  getInstalledCardReferenceManifest,
  getInstalledCardReferenceSource,
  loadRepositoryCardReferences,
  normalizeCardReferenceName,
  searchRepositoryCardsByNormalizedName,
} from './card-reference-repository'
import {
  getApiSetCodesForTcglSetCode,
  getPreferredTcglSetCode,
  normalizeSetCode,
} from './tcgl-set-code-aliases'

export const CURRENT_STANDARD_REGULATION_MARKS = ['H', 'I', 'J'] as const

export {
  getInstalledCardReferenceManifest,
  getInstalledCardReferenceSource,
  normalizeCardReferenceName,
}

export function loadCardReferences() {
  return loadRepositoryCardReferences()
}

export function isStandardLegalCardReference(card: CardReference) {
  const apiStandard = card.legalities?.standard?.toLowerCase()

  if (apiStandard === 'legal') return true
  if (apiStandard === 'banned' || apiStandard === 'not legal') return false

  if (!card.regulationMark) return false

  return CURRENT_STANDARD_REGULATION_MARKS.includes(
    card.regulationMark.toUpperCase() as typeof CURRENT_STANDARD_REGULATION_MARKS[number]
  )
}

export function findCardReferencesByExactEnglishName(
  englishName: string,
  options: Parameters<typeof findRepositoryCardsByExactEnglishName>[1] = {}
) {
  const cards = findRepositoryCardsByExactEnglishName(englishName, {
    ...options,
    standardOnly: false,
  })

  if (!options.standardOnly) return cards

  return cards.filter(isStandardLegalCardReference)
}

export function searchCardReferencesByNormalizedName(
  query: string,
  options: Parameters<typeof searchRepositoryCardsByNormalizedName>[1] = {}
) {
  const cards = searchRepositoryCardsByNormalizedName(query, {
    ...options,
    standardOnly: false,
  })

  if (!options.standardOnly) return cards

  return cards.filter(isStandardLegalCardReference)
}

export function findCardReferenceBySetAndNumber(
  setCode: string,
  cardNumber: string,
  options: Parameters<typeof findRepositoryCardBySetAndNumber>[2] = {}
) {
  const cards = findRepositoryCardBySetAndNumber(setCode, cardNumber, {
    ...options,
    standardOnly: false,
  })

  if (!options.standardOnly) return cards

  return cards.filter(isStandardLegalCardReference)
}

export function getCardReferenceTcglSetCode(card: CardReference) {
  return getPreferredTcglSetCode(card.setCode)
}

export { getApiSetCodesForTcglSetCode, normalizeSetCode }

// Compatibility facade: generated split cache is canonical, while this module
// preserves the historical Decklist Analyzer import path.
