const URL = 'https://limitlesstcg.com/tournaments/540'

async function main() {
  const response = await fetch(URL)

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  const html = await response.text()

  console.log(`Fetched ${html.length} characters from ${URL}`)

  const patterns = [
    'Standings',
    'Decklists',
    'Matchups',
    'archetype',
    'data-',
    'table',
    '/decks/',
    '/tournaments/540/player',
    '/tournaments/540/decklist',
  ]

  for (const pattern of patterns) {
    console.log(`${pattern}: ${html.includes(pattern) ? 'FOUND' : 'not found'}`)
  }

  const links = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])

  console.log('\nInteresting links:')
  console.log(
    [...new Set(links)]
      .filter((link) =>
        link.includes('/tournaments/') ||
        link.includes('/decks/') ||
        link.includes('matchup')
      )
      .slice(0, 50)
  )

  console.log('\nFirst table-ish snippets:')
  const tableSnippets = [...html.matchAll(/<table[\s\S]*?<\/table>/g)]
    .map((match) => match[0])
    .slice(0, 2)

  tableSnippets.forEach((snippet, index) => {
    console.log(`\n--- TABLE ${index + 1} ---`)
    console.log(snippet.slice(0, 2000))
  })
}

main().catch((error) => {
  console.error('\nTournament page test failed:')
  console.error(error)
  process.exit(1)
})