export type Deck = {
  id: number
  name: string
  decklist: string
}

export type Match = {
  id: number
  eventName: string
  round: number
  format: string
  deck: string
  opponentDeck: string
  matchType: 'BO1' | 'BO3'
  games: string[]
  gameStarts: ('1st' | '2nd')[]
  finalResult: string
  notes?: string
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

export type AdvisorResult = {
  deckName: string
  archetype: string
  fieldWinRate: number
  comfort: number
  adjustedScore: number
}