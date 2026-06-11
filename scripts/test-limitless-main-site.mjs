const URL = 'https://limitlesstcg.com/tournaments'

async function main() {
  const response = await fetch(URL)

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  const html = await response.text()

  console.log(`Fetched ${html.length} characters from ${URL}`)

  const patterns = [
    '__NEXT_DATA__',
    'application/json',
    'Special Event Turin',
    'Regional Indianapolis',
    '/tournaments/',
    'api',
    'data-',
  ]

  for (const pattern of patterns) {
    const found = html.includes(pattern)
    console.log(`${pattern}: ${found ? 'FOUND' : 'not found'}`)
  }

  const tournamentLinks = [
    ...html.matchAll(/href="(\/tournaments\/[^"]+)"/g),
  ].map((match) => match[1])

  console.log('\nTournament links found:')
  console.log([...new Set(tournamentLinks)].slice(0, 20))

  const jsonLikeScripts = [
    ...html.matchAll(
      /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g
    ),
  ]

  console.log(`\nJSON script blocks found: ${jsonLikeScripts.length}`)

  const apiMentions = [
    ...html.matchAll(/["']([^"']*api[^"']*)["']/gi),
  ].map((match) => match[1])

  console.log('\nAPI-looking mentions:')
  console.log([...new Set(apiMentions)].slice(0, 20))
}

main().catch((error) => {
  console.error('\nMain site test failed:')
  console.error(error)
  process.exit(1)
})