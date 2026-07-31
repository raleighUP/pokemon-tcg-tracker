export type Deck = {
  id: number
  name: string
  decklist: string
  archetype?: string
  variant?: string
  comfort?: number
  importMetadata?: DeckImportMetadata
}

export type Match = {
  id: number
  eventName: string
  eventType?: string
  round: number
  format: string
  deck: string
  opponentDeck: string
  matchType: 'BO1' | 'BO3'
  games: string[]
  gameStarts: ('1st' | '2nd')[]
  diceRollWins?: boolean[]
  finalResult: string
  alternateOutcome?: AlternateRoundOutcome
  notes?: string
}

export type AlternateRoundOutcome = 'intentionalDraw' | 'noShow' | 'bye'

export type TournamentType =
  | 'online'
  | 'local'
  | 'league-challenge'
  | 'league-cup'
  | 'regional'
  | 'international'
  | 'worlds'

export type EventRecord = {
  id: number
  eventName: string
  eventType: string
  format: string
  deck: string
  playerCount?: number
  finalPlacement?: string
  championshipPoints?: string
  prizing?: string
}

export type CardEntry = {
  name: string
  quantity: number
}

export type DeckCardCategory = 'Pokemon' | 'Trainer' | 'Energy'

export type DeckCardLegalityStatus =
  | 'standard'
  | 'not_standard'
  | 'unknown'

export type CardSourceLanguage =
  | 'english'
  | 'japanese'
  | 'mixed'
  | 'unknown'

export type ExactPrintIdentity = {
  source: string
  sourceCardId: string
  setId: string
  collectorNumber: string
  language: CardSourceLanguage
  variant?: string
}

export type RecognizedCardIdentity = {
  observedReferenceId?: string
  observedLanguage?: CardSourceLanguage
  exactPrintReferenceId?: string
  englishEquivalentReferenceId?: string
  sourceLanguage?: CardSourceLanguage
  detectedName?: string
  englishName: string
  setCode: string
  cardNumber: string
  category: DeckCardCategory
  regulationMark?: string
}

export type DeckPrintMode = 'exact-print' | 'base-print'

export type PrintResolutionPolicy = 'exact' | 'base' | 'cheapest'

export type CardPrintReference = {
  id: string
  englishName: string
  setCode: string
  cardNumber: string
  regulationMark?: string
  category: DeckCardCategory
  rarity?: string
  sourceLanguage?: CardSourceLanguage
  localizedName?: string
  localizedSetCode?: string
  localizedCardNumber?: string
  imageUrl?: string
  exactPrintIdentity?: ExactPrintIdentity
  exactPrintKey?: string
  sourceCardId?: string
  sourceSetId?: string
  englishEquivalentReferenceId?: string
  mappingStatus?: 'resolved-print' | 'canonical-name-only' | 'unresolved'
  notes?: string[]
}

export type DeckImportMetadata = {
  selectedPrintMode?: DeckPrintMode
  recognizedPrints?: CardPrintReference[]
  basePrints?: CardPrintReference[]
}

export type CardReference = {
  id: string
  englishName: string
  category: DeckCardCategory
  setCode: string
  setName?: string
  cardNumber: string
  regulationMark?: string
  legalities?: {
    standard?: string
    expanded?: string
    unlimited?: string
  }
  imageSmall?: string
  imageLarge?: string
  source: 'pokemon-tcg-api'
  sourceCardId?: string
  sourceSetId?: string
  sourceUpdatedAt?: string
  syncedAt?: string
  language?: CardSourceLanguage
  exactPrintIdentity?: ExactPrintIdentity
  exactPrintKey?: string
  englishEquivalentReferenceId?: string
}

export type MultilingualCardReference = {
  id: string
  canonicalIdentity: {
    englishName: string
    category: DeckCardCategory
    tcglSetCode?: string
    cardNumber?: string
    regulationMark?: string
  }
  language: CardSourceLanguage
  localizedName: string
  englishName: string
  localizedSetCode?: string
  localizedSetName?: string
  tcglSetCode?: string
  cardNumber: string
  regulationMark?: string
  category: DeckCardCategory
  imageUrl?: string
  imagePath: string
  publicImagePath?: string
  source: 'tcgdex'
  languageEquivalenceGroupId: string
  mapping: {
    status: 'resolved-print' | 'canonical-name-only' | 'unresolved'
    confidence: number
    notes: string[]
  }
}

export type ExtractedDeckCard = {
  id: string
  quantity: number
  name: string
  setCode: string
  cardNumber: string
  regulationMark?: string
  category: DeckCardCategory
  confidence: number
  legalityStatus: DeckCardLegalityStatus
  canonicalCardId?: string
  englishName?: string
  recognizedPrint?: CardPrintReference | null
  basePrint?: CardPrintReference | null
  selectedPrintMode?: DeckPrintMode
  selectedPrint?: CardPrintReference | null
  printRecognitionConfidence?: number
  basePrintResolutionConfidence?: number
  quantityValidationWarning?: string
  notes?: string[]
}

export type AdvisorMetaDeck = {
  name: string
  share: number
}

export type AdvisorCandidateDeck = {
  name: string
  archetype: string
  customName?: string
  comfort: number
  owned?: boolean
  matchups: {
    [opponentDeckName: string]: number
  }
}

export type AdvisorMatchupSummary = {
  name: string
  winRate: number
  sampleSize: number
}

export type AdvisorResult = {
  deckName: string
  archetype: string
  fieldWinRate: number
  comfort: number
  adjustedScore: number
  comfortBonus: number
  bestMatchups: AdvisorMatchupSummary[]
  worstMatchups: AdvisorMatchupSummary[]
}
