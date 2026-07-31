import manifest from '@/data/pokemon-sprite-manifest.json'

type ManifestPokemonIdentity = keyof typeof manifest.pokemon
export type PokemonIdentity = ManifestPokemonIdentity | 'substitute'

const substituteSprite = {
  id: 'substitute',
  name: 'substitute',
  species: 'substitute',
  path: '/pokemon-sprites/substitute.png',
}

export function normalizePokemonIdentity(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[♀]/g, ' female ')
    .replace(/[♂]/g, ' male ')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\bex\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getPokemonSprite(identity: string) {
  if (identity === 'substitute') return substituteSprite
  return manifest.pokemon[identity as ManifestPokemonIdentity] ?? null
}

export function getDeckPokemonIdentities(deckIdentity: string) {
  const key = normalizePokemonIdentity(deckIdentity)
  const mapped = manifest.deckMappings[
    key as keyof typeof manifest.deckMappings
  ]
  if (mapped?.length) return mapped.slice(0, 3) as PokemonIdentity[]

  const exact = Object.keys(manifest.pokemon).find(
    (identity) => normalizePokemonIdentity(identity) === key
  )
  return exact ? [exact as PokemonIdentity] : []
}
