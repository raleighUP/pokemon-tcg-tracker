import {
  deckImageFixtureRoot,
  discoverDeckImageFixtures,
} from './lib/deck-image-fixtures.mjs'

const fixtures = discoverDeckImageFixtures()

console.log(`Deck image fixture root: ${deckImageFixtureRoot}`)
console.log(`Fixture decks: ${fixtures.length}`)
console.log('')

for (const fixture of fixtures) {
  console.log(`${fixture.fixture} - ${fixture.deckName}`)
  console.log(`  Expected list: ${fixture.expectedText.trim() ? 'yes' : 'missing'}`)
  console.log(`  Expected total: ${fixture.expectedTotalCards ?? 'unknown'}`)
  console.log(`  Language: ${fixture.language}`)

  if (fixture.images.length === 0) {
    console.log('  Images: none')
  } else {
    console.log(`  Images: ${fixture.images.length}`)

    for (const image of fixture.images) {
      console.log(`    - ${image.file} (${image.sourceType}) ${image.label}`)
    }
  }

  console.log('')
}
