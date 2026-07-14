import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { discoverDeckImageFixtures, repoRoot } from './lib/deck-image-fixtures.mjs'
import { parseTcglDecklist, tcglIdentityKey } from './lib/tcgl-decklist-parser.mjs'

const manifestPath = path.join(
  repoRoot,
  'public',
  'card-image-cache',
  'fixture-subset',
  'manifest.json'
)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const expected = new Map()

for (const fixture of discoverDeckImageFixtures()) {
  for (const row of parseTcglDecklist(fixture.expectedText)) {
    expected.set(tcglIdentityKey(row), row)
  }
}

const available = new Map(
  manifest.cards.map((card) => [
    card.expectedIdentityKey ?? tcglIdentityKey({
        category: card.category,
        name: card.name,
        setCode: card.setCode,
        cardNumber: card.cardNumber,
      }),
    card,
  ])
)
const missing = []

for (const [key, row] of expected) {
  const card = available.get(key)
  const runtimePath = card?.publicImagePath
    ? path.join(repoRoot, 'public', card.publicImagePath.replace(/^\//, ''))
    : null

  if (!card || !runtimePath || !existsSync(runtimePath)) {
    missing.push(`${row.name} ${row.setCode} ${row.cardNumber}`)
  }
}

console.log('Fixture reference coverage')
console.log(`  Expected exact prints: ${expected.size}`)
console.log(`  Available reference images: ${expected.size - missing.length}`)
console.log(`  Missing reference images: ${missing.length}`)
if (missing.length) console.log(missing.map((row) => `  - ${row}`).join('\n'))

if (manifest.unmatched?.length || missing.length) process.exitCode = 1
