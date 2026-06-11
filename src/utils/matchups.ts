import matchupData from '../../data/limitless-matchups.json'

export type LimitlessMatchupRecord = {
  deckA: string
  deckB: string
  deckAWins: number
  deckBWins: number
  totalMatches: number
  deckAWinRate: number
  deckBWinRate: number
}

const matchups = matchupData as LimitlessMatchupRecord[]

export function getMatchupWinRate(
  candidateDeck: string,
  opponentDeck: string
): number {
  if (!candidateDeck || !opponentDeck) {
    return 50
  }

  const record = matchups.find((matchup) => {
    return (
      (matchup.deckA === candidateDeck &&
        matchup.deckB === opponentDeck) ||
      (matchup.deckA === opponentDeck &&
        matchup.deckB === candidateDeck)
    )
  })

  if (!record) {
    return 50
  }

  if (record.deckA === candidateDeck) {
    return record.deckAWinRate
  }

  return record.deckBWinRate
}

export function getMatchupSampleSize(
  candidateDeck: string,
  opponentDeck: string
): number {
  if (!candidateDeck || !opponentDeck) {
    return 0
  }

  const record = matchups.find((matchup) => {
    return (
      (matchup.deckA === candidateDeck &&
        matchup.deckB === opponentDeck) ||
      (matchup.deckA === opponentDeck &&
        matchup.deckB === candidateDeck)
    )
  })

  return record?.totalMatches ?? 0
}