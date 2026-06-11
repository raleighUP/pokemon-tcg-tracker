import matchupData from '../../data/limitless-matchups.json'
import majorMetaData from '../../data/limitless-major-meta.json'

type LimitlessMatchupRecord = {
  deckA: string
  deckB: string
}

type MajorMetaRecord = {
  archetype: string
}

const matchupRecords = matchupData as LimitlessMatchupRecord[]
const majorMetaRecords = majorMetaData as MajorMetaRecord[]

export function getArchetypeOptions(): string[] {
  const archetypes = new Set<string>()

  matchupRecords.forEach((record) => {
    if (record.deckA) archetypes.add(record.deckA)
    if (record.deckB) archetypes.add(record.deckB)
  })

  majorMetaRecords.forEach((record) => {
    if (record.archetype) archetypes.add(record.archetype)
  })

  return [...archetypes].sort((a, b) =>
    a.localeCompare(b)
  )
}