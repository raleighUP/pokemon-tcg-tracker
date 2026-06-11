import fs from 'node:fs/promises'
import path from 'node:path'

const BASE_URL = 'https://play.limitlesstcg.com/api'

const CACHE_DIR = path.join(
  process.cwd(),
  'scripts',
  'cache',
  'limitless'
)

const DATA_DIR = path.join(process.cwd(), 'data')

const MATCHUPS_OUTPUT_PATH = path.join(
  DATA_DIR,
  'limitless-matchups.json'
)

const MAJOR_EVENT_KEYWORDS = [
  'regional',
  'regionals',
  'international',
  'internationals',
  'special event',
  'world championship',
  'worlds',
  'national',
  'nationals',
  'invitational',
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true })
}

function getCachePath(cacheKey) {
  return path.join(CACHE_DIR, `${cacheKey}.json`)
}

async function readCache(cacheKey) {
  try {
    const filePath = getCachePath(cacheKey)
    const file = await fs.readFile(filePath, 'utf8')
    return JSON.parse(file)
  } catch {
    return null
  }
}

async function writeCache(cacheKey, data) {
  const filePath = getCachePath(cacheKey)

  await fs.writeFile(
    filePath,
    JSON.stringify(data, null, 2),
    'utf8'
  )
}

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url)

  if (response.status === 429) {
    const waitTime = Math.min(attempt * 5000, 60000)

    console.log(
      `Rate limited. Waiting ${waitTime / 1000}s before retrying...`
    )

    await sleep(waitTime)

    return fetchJson(url, attempt + 1)
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`)
  }

  await sleep(1500)

  return response.json()
}

async function fetchCachedJson(cacheKey, url) {
  const cached = await readCache(cacheKey)

  if (cached) {
    return cached
  }

  const data = await fetchJson(url)
  await writeCache(cacheKey, data)

  return data
}

function getMatchupKey(deckA, deckB) {
  return [deckA, deckB].sort().join('|||')
}

function formatPercent(wins, losses) {
  const total = wins + losses
  if (total === 0) return '0.0'
  return ((wins / total) * 100).toFixed(1)
}

function isLikelyMajorEvent(tournament) {
  const name = String(tournament.name ?? '').toLowerCase()

  return MAJOR_EVENT_KEYWORDS.some((keyword) =>
    name.includes(keyword)
  )
}

async function main() {
  await ensureCacheDir()

  console.log('Fetching recent PTCG Standard tournament pages...')

  const tournaments = []

  const pageLimit = 50
  const pagesToScan = 6

  for (let page = 1; page <= pagesToScan; page += 1) {
    const pageTournaments = await fetchCachedJson(
      `ptcg-standard-tournaments-page-${page}-limit-${pageLimit}`,
      `${BASE_URL}/tournaments?game=PTCG&format=STANDARD&limit=${pageLimit}&page=${page}`
    )

    console.log(
      `Page ${page}: found ${pageTournaments.length} tournaments.`
    )

    tournaments.push(...pageTournaments)
  }

  console.log(
    `Found ${tournaments.length} tournaments across scanned pages.`
  )

  const likelyMajorTournaments = tournaments.filter(isLikelyMajorEvent)

  console.log(
    `Found ${likelyMajorTournaments.length} likely major tournaments by name.`
  )

  likelyMajorTournaments.forEach((tournament) => {
    console.log(
      `- ${tournament.name} | ${tournament.players} players | ${tournament.id}`
    )
  })

  const eligibleTournaments = tournaments
  .filter((tournament) => tournament.players >= 32)
  .slice(0, 20)

console.log(
  `Using ${eligibleTournaments.length} online tournaments for matchup data.`
)

eligibleTournaments.forEach((tournament) => {
  console.log(
    `- ${tournament.name} | ${tournament.players} players | ${tournament.id}`
  )
})

if (eligibleTournaments.length === 0) {
  console.log('No eligible online tournaments found.')
  return
}

  const matchupRecords = new Map()

  for (const tournament of eligibleTournaments) {
    console.log(
      `Processing: ${tournament.name} | ${tournament.players} players`
    )

    const standings = await fetchCachedJson(
      `${tournament.id}-standings`,
      `${BASE_URL}/tournaments/${tournament.id}/standings`
    )

    const pairings = await fetchCachedJson(
      `${tournament.id}-pairings`,
      `${BASE_URL}/tournaments/${tournament.id}/pairings`
    )

    const playerToDeck = new Map(
      standings
        .filter((player) => player.deck?.name)
        .map((player) => [player.player, player.deck.name])
    )

    for (const match of pairings) {
      if (
        !match.player1 ||
        !match.player2 ||
        !match.winner ||
        match.winner === 0 ||
        match.winner === -1
      ) {
        continue
      }

      const deck1 = playerToDeck.get(match.player1)
      const deck2 = playerToDeck.get(match.player2)

      if (!deck1 || !deck2) continue
      if (deck1 === deck2) continue

      const key = getMatchupKey(deck1, deck2)

      if (!matchupRecords.has(key)) {
        const [deckA, deckB] = [deck1, deck2].sort()

        matchupRecords.set(key, {
          deckA,
          deckB,
          deckAWins: 0,
          deckBWins: 0,
        })
      }

      const record = matchupRecords.get(key)
      const winnerDeck =
        match.winner === match.player1 ? deck1 : deck2

      if (winnerDeck === record.deckA) {
        record.deckAWins += 1
      } else if (winnerDeck === record.deckB) {
        record.deckBWins += 1
      }
    }
  }

  const sortedRecords = [...matchupRecords.values()]
    .map((record) => {
      const totalMatches =
        record.deckAWins + record.deckBWins

      return {
        ...record,
        totalMatches,
        deckAWinRate: formatPercent(
          record.deckAWins,
          record.deckBWins
        ),
        deckBWinRate: formatPercent(
          record.deckBWins,
          record.deckAWins
        ),
      }
    })
    .filter((record) => record.totalMatches >= 3)
    .sort((a, b) => b.totalMatches - a.totalMatches)

  console.log('\nTop matchup records:')

  sortedRecords.slice(0, 30).forEach((record) => {
    console.log(
      `${record.deckA} vs ${record.deckB}: ` +
        `${record.deckAWins}-${record.deckBWins} | ` +
        `${record.deckA} WR ${record.deckAWinRate}% | ` +
        `${record.totalMatches} matches`
    )
  })

  console.log(`\nTotal matchup pairs: ${sortedRecords.length}`)

  await fs.mkdir(DATA_DIR, { recursive: true })

  const matchupDatabase = sortedRecords.map((record) => ({
    deckA: record.deckA,
    deckB: record.deckB,
    deckAWins: record.deckAWins,
    deckBWins: record.deckBWins,
    totalMatches: record.totalMatches,
    deckAWinRate: Number(record.deckAWinRate),
    deckBWinRate: Number(record.deckBWinRate),
  }))

  await fs.writeFile(
    MATCHUPS_OUTPUT_PATH,
    JSON.stringify(matchupDatabase, null, 2),
    'utf8'
  )

  console.log(`\nSaved matchup database to ${MATCHUPS_OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error('\nMatchup aggregation failed:')
  console.error(error)
  process.exit(1)
})