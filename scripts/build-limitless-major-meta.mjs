import fs from 'node:fs/promises'
import path from 'node:path'

const DATA_DIR = path.join(process.cwd(), 'data')
const OUTPUT_PATH = path.join(DATA_DIR, 'limitless-major-meta.json')

const META_SOURCES = [
  {
    id: '518',
    name: 'NAIC 2026, New Orleans',
    type: 'International',
  },
  {
    id: '540',
    name: 'Special Event Turin',
    type: 'Special Event',
  },
  {
    id: '559',
    name: 'Regional Indianapolis, IN',
    type: 'Regional',
  },
  {
    id: '536',
    name: 'Special Event Lima',
    type: 'Special Event',
  },
  {
    id: '550',
    name: 'Regional Melbourne',
    type: 'Regional',
  },
  {
    id: '544',
    name: 'Regional Campinas',
    type: 'Regional',
  },
  {
    id: '535',
    name: 'Regional Utrecht',
    type: 'Regional',
  },
  {
    id: '558',
    name: 'Regional Los Angeles, CA',
    type: 'Regional',
  },
]

function decodeHtml(value) {
  return value
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function getStatisticsUrl(source) {
  return `https://limitlesstcg.com/tournaments/${source.id}/statistics`
}

async function fetchEventMeta(source) {
  const sourceUrl = getStatisticsUrl(source)

  console.log(`Fetching major event meta from ${sourceUrl}`)

  const response = await fetch(sourceUrl)

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  const html = await response.text()

  const rows = [...html.matchAll(/<tr data-count="(\d+)" data-points="(\d+)">([\s\S]*?)<\/tr>/g)]

  const meta = rows
    .map((row) => {
      const count = Number(row[1])
      const points = Number(row[2])
      const rowHtml = row[3]

      const deckMatch = rowHtml.match(/<td><a href="\/decks\/[^"]+">([\s\S]*?)<\/a><\/td>/)
      const shareMatch = rowHtml.match(/<td class="landscape-only">([\d.]+)%<\/td>/)

      if (!deckMatch || !shareMatch) return null

      return {
        archetype: decodeHtml(deckMatch[1].replace(/<[^>]*>/g, '').trim()),
        count,
        share: Number(shareMatch[1]),
        points,
        sourceTournamentId: source.id,
        sourceUrl,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.share - a.share)

  const players = meta.reduce((total, deck) => total + deck.count, 0)

  return {
    source: {
      ...source,
      players,
      url: sourceUrl,
    },
    meta,
  }
}

function aggregateEventMeta(eventMetas) {
  const sourceCount = eventMetas.length
  const totalPlayers = eventMetas.reduce(
    (total, eventMeta) => total + eventMeta.source.players,
    0
  )
  const archetypeRecords = new Map()

  eventMetas.forEach((eventMeta) => {
    eventMeta.meta.forEach((deck) => {
      if (!archetypeRecords.has(deck.archetype)) {
        archetypeRecords.set(deck.archetype, {
          archetype: deck.archetype,
          totalCount: 0,
          totalPoints: 0,
          weightedShareTotal: 0,
          sourceShares: [],
        })
      }

      const aggregate = archetypeRecords.get(deck.archetype)

      aggregate.totalCount += deck.count
      aggregate.totalPoints += deck.points
      aggregate.weightedShareTotal +=
        deck.share * eventMeta.source.players
      aggregate.sourceShares.push({
        sourceTournamentId: eventMeta.source.id,
        share: deck.share,
        count: deck.count,
        points: deck.points,
      })
    })
  })

  return [...archetypeRecords.values()]
    .map((record) => ({
      archetype: record.archetype,
      share: Number(
        (record.weightedShareTotal / totalPlayers).toFixed(2)
      ),
      averageShare: Number(
        (
          record.sourceShares.reduce(
            (total, sourceShare) => total + sourceShare.share,
            0
          ) / sourceCount
        ).toFixed(2)
      ),
      weightedShare: Number(
        (record.weightedShareTotal / totalPlayers).toFixed(2)
      ),
      totalCount: record.totalCount,
      totalPoints: record.totalPoints,
      eventCount: record.sourceShares.length,
      sourceShares: record.sourceShares.sort((a, b) =>
        a.sourceTournamentId.localeCompare(b.sourceTournamentId)
      ),
    }))
    .sort((a, b) => b.weightedShare - a.weightedShare)
}

async function main() {
  const eventMetas = []

  for (const source of META_SOURCES) {
    eventMetas.push(await fetchEventMeta(source))
  }

  const sources = eventMetas.map((eventMeta) => eventMeta.source)
  const meta = aggregateEventMeta(eventMetas)
  const totalPlayers = sources.reduce(
    (total, source) => total + source.players,
    0
  )
  const sourceLabel = sources
    .map((source) => source.name)
    .join(' + ')

  const output = {
    generatedAt: new Date().toISOString(),
    method: 'weighted-average-by-player-count',
    sourceLabel,
    totalPlayers,
    sources,
    meta,
  }

  await fs.mkdir(DATA_DIR, { recursive: true })

  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(output, null, 2),
    'utf8'
  )

  console.log(`Saved ${meta.length} meta records to ${OUTPUT_PATH}`)
  console.log(`Aggregated ${sources.length} sources.`)
  console.log('\nTop 10:')
  meta.slice(0, 10).forEach((deck, index) => {
    console.log(
      `${index + 1}. ${deck.archetype}: ${deck.weightedShare}% (${deck.totalCount})`
    )
  })
}

main().catch((error) => {
  console.error('\nMajor meta scrape failed:')
  console.error(error)
  process.exit(1)
})
