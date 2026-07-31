import type { AlternateRoundOutcome, Match } from '@/types'

export type RoundResult = 'W' | 'L' | 'T'

export const ALTERNATE_OUTCOME_LABELS: Record<AlternateRoundOutcome, string> = {
  intentionalDraw: 'ID',
  noShow: 'No Show',
  bye: 'Bye',
}

export function getRoundResult(match: Match): RoundResult {
  if (match.alternateOutcome === 'intentionalDraw') return 'T'
  if (match.alternateOutcome === 'noShow' || match.alternateOutcome === 'bye') {
    return 'W'
  }
  const wins = match.games.filter((game) => game === 'W').length
  const losses = match.games.filter((game) => game === 'L').length
  if (wins > losses) return 'W'
  if (losses > wins) return 'L'
  return 'T'
}

export function getMatchDisplayResult(match: Match) {
  if (match.alternateOutcome) {
    return ALTERNATE_OUTCOME_LABELS[match.alternateOutcome]
  }
  const wins = match.games.filter((game) => game === 'W').length
  const losses = match.games.filter((game) => game === 'L').length
  const ties = match.games.filter((game) => game === 'T').length
  return `${wins}–${losses}${ties ? `–${ties}` : ''}`
}

export function getEventRecord(matches: Match[]) {
  const counts = matches.reduce(
    (record, match) => {
      const result = getRoundResult(match)
      if (result === 'W') record.wins++
      else if (result === 'L') record.losses++
      else record.draws++
      return record
    },
    { wins: 0, losses: 0, draws: 0 }
  )
  return {
    ...counts,
    label: `${counts.wins}–${counts.losses}${
      counts.draws ? `–${counts.draws}` : ''
    }`,
  }
}
