import majorMetaData from '../../data/limitless-major-meta.json'

type MajorMetaRecord = {
  archetype: string
  count: number
  share: number
  points: number
  sourceTournamentId: string
  sourceUrl: string
}

const majorMeta = majorMetaData as MajorMetaRecord[]

export function getSuggestedMeta(limit = 5) {
  return majorMeta
    .slice()
    .sort((a, b) => b.share - a.share)
    .slice(0, limit)
    .map((record) => ({
      name: record.archetype,
      share: Number(record.share.toFixed(1)),
    }))
}