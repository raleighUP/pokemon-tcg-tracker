const BASE_URL = 'https://play.limitlesstcg.com/api'

async function fetchJson(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`)
  }

  return response.json()
}

async function main() {
  console.log('Fetching recent PTCG Standard tournaments...')

  const tournaments = await fetchJson(
    `${BASE_URL}/tournaments?game=PTCG&format=STANDARD&limit=5`
  )

  console.log('\nRecent tournaments:')
  tournaments.forEach((tournament, index) => {
    console.log(
      `${index + 1}. ${tournament.name} | ${tournament.players} players | ${tournament.id}`
    )
  })

  const tournament = tournaments.find((item) => item.players >= 16) ?? tournaments[0]

  if (!tournament) {
    console.log('No tournaments found.')
    return
  }

  console.log(`\nTesting tournament: ${tournament.name}`)
  console.log(`Tournament ID: ${tournament.id}`)

  const standings = await fetchJson(
    `${BASE_URL}/tournaments/${tournament.id}/standings`
  )

  console.log('\nFirst 10 standings deck fields:')

  standings.slice(0, 10).forEach((player, index) => {
    console.log(
      `${index + 1}. ${player.name} | placing ${player.placing} | deck: ${
        player.deck?.name ?? 'No deck archetype'
      } | deck id: ${player.deck?.id ?? 'N/A'}`
    )
  })

  const playersWithDecks = standings.filter((player) => player.deck?.name)

  console.log(
    `\nPlayers with auto-assigned deck archetypes: ${playersWithDecks.length}/${standings.length}`
  )

  const pairings = await fetchJson(
    `${BASE_URL}/tournaments/${tournament.id}/pairings`
  )

  console.log(`Pairings found: ${pairings.length}`)

  const playerToDeck = new Map(
    standings
      .filter((player) => player.deck?.name)
      .map((player) => [
        player.player,
        {
          id: player.deck.id,
          name: player.deck.name,
        },
      ])
  )

  const sampleMatchups = pairings
    .filter((match) => {
      return (
        match.player1 &&
        match.player2 &&
        match.winner &&
        match.winner !== 0 &&
        match.winner !== -1 &&
        playerToDeck.has(match.player1) &&
        playerToDeck.has(match.player2)
      )
    })
    .slice(0, 10)

  console.log('\nSample archetype matchups:')

  sampleMatchups.forEach((match) => {
    const deck1 = playerToDeck.get(match.player1)
    const deck2 = playerToDeck.get(match.player2)

    const winningDeck =
      match.winner === match.player1 ? deck1 : deck2

    console.log(
      `Round ${match.round}: ${deck1.name} vs ${deck2.name} | Winner: ${winningDeck.name}`
    )
  })
}

main().catch((error) => {
  console.error('\nLimitless API test failed:')
  console.error(error)
  process.exit(1)
})