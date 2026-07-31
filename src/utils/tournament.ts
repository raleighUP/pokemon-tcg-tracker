import type { TournamentType } from '@/types'

export type EventType = 'challenge' | 'cup' | 'regional'
export const TOURNAMENT_TYPE_OPTIONS: ReadonlyArray<{
  value: TournamentType
  label: string
}> = [
  { value: 'online', label: 'Online' },
  { value: 'local', label: 'Local' },
  { value: 'league-challenge', label: 'League Challenge' },
  { value: 'league-cup', label: 'League Cup' },
  { value: 'regional', label: 'Regional' },
  { value: 'international', label: 'International Championships' },
  { value: 'worlds', label: 'World Championships' },
]

export function getTournamentTypeLabel(value: string) {
  return TOURNAMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label
    ?? value
}

export type TournamentStructure = {
  eventType: EventType

  playerCount: number

  swissRounds: number

  topCutSize: number

  topCutLabel: string

  singleEliminationRounds?: number

  totalEventLength?: number

  phaseOneRounds?: number

  phaseTwoRounds?: number

  phaseTwoThreshold?: number

  totalSwissRounds?: number
}

function getChallengeStructure(
  playerCount: number
): TournamentStructure {
  let swissRounds = Math.ceil(Math.log2(playerCount))

  if (playerCount >= 13 && playerCount <= 16) {
    swissRounds = 5
  }

  if (playerCount > 200) {
    swissRounds += 1
  }

  let topCutSize = 0

  if (playerCount >= 9 && playerCount <= 20) {
    topCutSize = 4
  } else if (playerCount >= 21) {
    topCutSize = 8
  }

  return {
    eventType: 'challenge',
    playerCount,
    swissRounds,
    topCutSize,
    topCutLabel:
      topCutSize === 0 ? 'No Top Cut' : `Top ${topCutSize}`,
  }
}

function getCupStructure(
  playerCount: number
): TournamentStructure {
  if (playerCount <= 8) {
    return {
      eventType: 'cup',
      playerCount,
      swissRounds: 3,
      singleEliminationRounds: 0,
      totalEventLength: 3,
      topCutSize: 0,
      topCutLabel: 'No Top Cut',
    }
  }

  if (playerCount <= 12) {
    return {
      eventType: 'cup',
      playerCount,
      swissRounds: 4,
      singleEliminationRounds: 2,
      totalEventLength: 6,
      topCutSize: 4,
      topCutLabel: 'Top 4',
    }
  }

  if (playerCount <= 20) {
    return {
      eventType: 'cup',
      playerCount,
      swissRounds: 5,
      singleEliminationRounds: 2,
      totalEventLength: 7,
      topCutSize: 4,
      topCutLabel: 'Top 4',
    }
  }

  if (playerCount <= 32) {
    return {
      eventType: 'cup',
      playerCount,
      swissRounds: 5,
      singleEliminationRounds: 3,
      totalEventLength: 8,
      topCutSize: 8,
      topCutLabel: 'Top 8',
    }
  }

  if (playerCount <= 64) {
    return {
      eventType: 'cup',
      playerCount,
      swissRounds: 6,
      singleEliminationRounds: 3,
      totalEventLength: 9,
      topCutSize: 8,
      topCutLabel: 'Top 8',
    }
  }

  if (playerCount <= 128) {
    return {
      eventType: 'cup',
      playerCount,
      swissRounds: 7,
      singleEliminationRounds: 3,
      totalEventLength: 10,
      topCutSize: 8,
      topCutLabel: 'Top 8',
    }
  }

  if (playerCount <= 226) {
    return {
      eventType: 'cup',
      playerCount,
      swissRounds: 8,
      singleEliminationRounds: 3,
      totalEventLength: 11,
      topCutSize: 8,
      topCutLabel: 'Top 8',
    }
  }

  if (playerCount <= 409) {
    return {
      eventType: 'cup',
      playerCount,
      swissRounds: 9,
      singleEliminationRounds: 3,
      totalEventLength: 12,
      topCutSize: 8,
      topCutLabel: 'Top 8',
    }
  }

  return {
    eventType: 'cup',
    playerCount,
    swissRounds: 10,
    singleEliminationRounds: 3,
    totalEventLength: 13,
    topCutSize: 8,
    topCutLabel: 'Top 8',
  }
}

function getRegionalStructure(
  playerCount: number
): TournamentStructure {
  if (playerCount <= 8) {
    return {
      eventType: 'regional',
      playerCount,
      swissRounds: 3,
      totalSwissRounds: 3,
      topCutSize: 0,
      topCutLabel: 'No Top Cut',
    }
  }

  if (playerCount <= 16) {
    return {
      eventType: 'regional',
      playerCount,
      swissRounds: 4,
      totalSwissRounds: 4,
      topCutSize: 2,
      topCutLabel: 'Top 2',
    }
  }

  if (playerCount <= 32) {
    return {
      eventType: 'regional',
      playerCount,
      swissRounds: 6,
      totalSwissRounds: 6,
      topCutSize: 4,
      topCutLabel: 'Top 4',
    }
  }

  if (playerCount <= 64) {
    return {
      eventType: 'regional',
      playerCount,
      swissRounds: 7,
      totalSwissRounds: 7,
      topCutSize: 6,
      topCutLabel: 'Top 6',
    }
  }

  if (playerCount <= 128) {
    return {
      eventType: 'regional',
      playerCount,
      phaseOneRounds: 7,
      phaseTwoRounds: 2,
      phaseTwoThreshold: 13,
      totalSwissRounds: 9,
      swissRounds: 9,
      topCutSize: 8,
      topCutLabel: 'Top 8',
    }
  }

  if (playerCount <= 256) {
    return {
      eventType: 'regional',
      playerCount,
      phaseOneRounds: 8,
      phaseTwoRounds: 2,
      phaseTwoThreshold: 16,
      totalSwissRounds: 10,
      swissRounds: 10,
      topCutSize: 8,
      topCutLabel: 'Top 8',
    }
  }

  if (playerCount <= 512) {
    return {
      eventType: 'regional',
      playerCount,
      phaseOneRounds: 8,
      phaseTwoRounds: 3,
      phaseTwoThreshold: 16,
      totalSwissRounds: 11,
      swissRounds: 11,
      topCutSize: 8,
      topCutLabel: 'Top 8',
    }
  }

  if (playerCount <= 1024) {
    return {
      eventType: 'regional',
      playerCount,
      phaseOneRounds: 8,
      phaseTwoRounds: 4,
      phaseTwoThreshold: 16,
      totalSwissRounds: 12,
      swissRounds: 12,
      topCutSize: 8,
      topCutLabel: 'Top 8',
    }
  }

  return {
    eventType: 'regional',
    playerCount,
    phaseOneRounds: 8,
    phaseTwoRounds: 5,
    phaseTwoThreshold: 16,
    totalSwissRounds: 13,
    swissRounds: 13,
    topCutSize: 8,
    topCutLabel: 'Top 8',
  }
}

export function getTournamentStructure(
  eventType: EventType,
  playerCount: number
): TournamentStructure {
  if (!playerCount || playerCount <= 0) {
    return {
      eventType,
      playerCount: 0,
      swissRounds: 0,
      topCutSize: 0,
      topCutLabel: 'N/A',
    }
  }

  switch (eventType) {
    case 'challenge':
      return getChallengeStructure(playerCount)

    case 'cup':
      return getCupStructure(playerCount)

    case 'regional':
      return getRegionalStructure(playerCount)

    default:
      return getChallengeStructure(playerCount)
  }
}
