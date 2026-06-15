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

type IndexedMatchupRecord = {
  winRate: number
  totalMatches: number
}

function getMatchupKey(candidateDeck: string, opponentDeck: string) {
  return `${candidateDeck}|||${opponentDeck}`
}

const matchupIndex = new Map<string, IndexedMatchupRecord>()

matchups.forEach((matchup) => {
  matchupIndex.set(getMatchupKey(matchup.deckA, matchup.deckB), {
    winRate: matchup.deckAWinRate,
    totalMatches: matchup.totalMatches,
  })

  matchupIndex.set(getMatchupKey(matchup.deckB, matchup.deckA), {
    winRate: matchup.deckBWinRate,
    totalMatches: matchup.totalMatches,
  })
})

export function getMatchupWinRate(
  candidateDeck: string,
  opponentDeck: string
): number {
  if (!candidateDeck || !opponentDeck) {
    return 50
  }

  const record = matchupIndex.get(
    getMatchupKey(candidateDeck, opponentDeck)
  )

  return record?.winRate ?? 50
}

export function getMatchupSampleSize(
  candidateDeck: string,
  opponentDeck: string
): number {
  if (!candidateDeck || !opponentDeck) {
    return 0
  }

  const record = matchupIndex.get(
    getMatchupKey(candidateDeck, opponentDeck)
  )

  return record?.totalMatches ?? 0
}
