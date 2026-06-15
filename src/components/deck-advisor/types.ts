import { AdvisorCandidateDeck, AdvisorResult } from '@/types'

export type MetaInputMode = 'percent' | 'players'

export type CandidateSource = 'owned' | 'all'

export type AdvisorMetaDeckInput = {
  name: string
  share: number
}

export type NormalizedMetaDeck = AdvisorMetaDeckInput & {
  normalizedShare: number
}

export type MetaBreakdownDeck = {
  name: string
  enteredValue: number
  normalizedShare: number
  roundedPlayers: number
}

export type OwnedAdvisorCandidateDeck = AdvisorCandidateDeck & {
  id: number
}

export type DeckAdvisorResult = AdvisorResult & {
  fieldCoverage: number | null
  fieldCoverageLabel: string
  fieldCoverageSampleSize: number
}

export type MatchupTone = 'favored' | 'neutral' | 'unfavored'
