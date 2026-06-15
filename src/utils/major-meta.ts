import majorMetaData from '../../data/limitless-major-meta.json'

type MajorMetaRecord = {
  archetype: string
  share: number
  weightedShare?: number
}

type MajorMetaDatabase = {
  sourceLabel?: string
  sources?: {
    name: string
  }[]
  meta: MajorMetaRecord[]
}

function getMajorMetaRecords() {
  if (Array.isArray(majorMetaData)) {
    return majorMetaData as MajorMetaRecord[]
  }

  return (majorMetaData as MajorMetaDatabase).meta
}

const majorMeta = getMajorMetaRecords()

export function getSuggestedMeta(limit = 5) {
  return majorMeta
    .slice()
    .sort(
      (a, b) =>
        (b.weightedShare ?? b.share) -
        (a.weightedShare ?? a.share)
    )
    .slice(0, limit)
    .map((record) => ({
      name: record.archetype,
      share: Number(
        (record.weightedShare ?? record.share).toFixed(1)
      ),
    }))
}

export function getSuggestedMetaSourceLabel() {
  if (Array.isArray(majorMetaData)) {
    const sourceIds = new Set(
      majorMetaData
        .map((record) => record.sourceTournamentId)
        .filter(Boolean)
    )

    if (sourceIds.size > 1) {
      return `${sourceIds.size} major Limitless events, user-editable`
    }

    return 'Suggested Meta from major Limitless event data, user-editable'
  }

  const database = majorMetaData as MajorMetaDatabase

  if (database.sourceLabel) {
    return `${database.sourceLabel}, user-editable`
  }

  if (database.sources?.length) {
    return `${database.sources.length} recent major Limitless events, user-editable`
  }

  return 'Suggested Meta from major Limitless event data, user-editable'
}
