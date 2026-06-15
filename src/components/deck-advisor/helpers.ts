import { AdvisorResult } from '@/types'
import { MatchupTone } from './types'

export function getMatchupTone(winRate: number): MatchupTone {
  if (winRate > 55) {
    return 'favored'
  }

  if (winRate < 45) {
    return 'unfavored'
  }

  return 'neutral'
}

export function getFieldCoverageLabel(winRate: number | null) {
  if (winRate === null) {
    return 'Unknown'
  }

  if (winRate >= 55) {
    return 'Strong'
  }

  if (winRate >= 50) {
    return 'Stable'
  }

  if (winRate >= 45) {
    return 'Risky'
  }

  return 'Poor'
}

export function getRecommendationInsight(result: AdvisorResult) {
  const totalSampleSize = [
    ...result.bestMatchups,
    ...result.worstMatchups,
  ].reduce((total, matchup) => total + matchup.sampleSize, 0)

  if (totalSampleSize < 20) {
    return 'Good meta read, but limited matchup sample size'
  }

  if (result.fieldWinRate >= 55 && result.comfort <= 2) {
    return 'Good meta read, but low player experience'
  }

  if (result.adjustedScore >= 60) {
    return 'High confidence recommendation'
  }

  if (result.fieldWinRate >= 55) {
    return 'Strong matchup spread against the predicted field'
  }

  if (result.comfort >= 4 && result.adjustedScore >= 54) {
    return 'Strong comfort pick'
  }

  if (result.comfortBonus < 0) {
    return 'Strong deck, but comfort is lowering the score'
  }

  return 'Balanced option into the expected field'
}
