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
  finalResult: string
  notes?: string
  
}

export type CardEntry = {
  name: string
  quantity: number
}