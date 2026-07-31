import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(
  readFileSync('src/data/pokemon-sprite-manifest.json', 'utf8')
)

assert.equal(manifest.spriteType, 'front_default')
assert.deepEqual(manifest.deckMappings['dragapult dusknoir'], [
  'dragapult',
  'dusknoir',
])
assert.deepEqual(manifest.deckMappings['mega lucario'], ['lucario-mega'])
assert.deepEqual(manifest.deckMappings['raging bolt ogerpon'], [
  'raging-bolt',
  'ogerpon',
])
assert.deepEqual(manifest.deckMappings['ns zoroark'], ['zoroark'])
assert.ok(
  Object.values(manifest.pokemon).every(
    (pokemon) => pokemon.path.startsWith('/pokemon-sprites/')
  )
)
assert.ok(
  Object.values(manifest.deckMappings)
    .flat()
    .every((identity) => manifest.pokemon[identity])
)

console.log('Pokémon sprite manifest and deck mappings: pass')
