const URL = 'https://limitlesstcg.com/tournaments/540/statistics'

async function main() {
  const response = await fetch(URL)

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  const html = await response.text()

  console.log(`Fetched ${html.length} characters from ${URL}`)

  const patterns = [
    'Matchups',
    'Winrate',
    'Win Rate',
    'Conversion',
    'Day 2',
    'Deck',
    'Share',
    'data-deck',
    'table',
    'data-',
  ]

  for (const pattern of patterns) {
    console.log(`${pattern}: ${html.includes(pattern) ? 'FOUND' : 'not found'}`)
  }

  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/g)]
    .map((match) => match[0])

  console.log(`\nTables found: ${tables.length}`)

  tables.slice(0, 5).forEach((table, index) => {
    console.log(`\n--- TABLE ${index + 1} ---`)
    console.log(table.slice(0, 2500))
  })

  const links = [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])

  console.log('\nInteresting links:')
  console.log(
    [...new Set(links)]
      .filter((link) =>
        link.includes('/tournaments/') ||
        link.includes('/decks/') ||
        link.includes('matchup') ||
        link.includes('statistics')
      )
      .slice(0, 50)
  )
}

main().catch((error) => {
  console.error('\nStatistics page test failed:')
  console.error(error)
  process.exit(1)
})