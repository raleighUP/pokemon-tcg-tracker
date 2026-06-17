export type Deck = {
  id: number
  name: string
  decklist: string
  archetype?: string
  variant?: string
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
  notes?: string
}

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
