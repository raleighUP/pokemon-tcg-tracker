import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { normalizeSpriteBuffer } from './lib/sprite-normalization.mjs'
import path from 'node:path'

const root = process.cwd()
const outputRoot = path.join(root, 'public', 'pokemon-sprites')
const temporaryOutputRoot = path.join(root, 'public', 'pokemon-sprites-next')
const manifestPath = path.join(root, 'src', 'data', 'pokemon-sprite-manifest.json')
const matchupData = JSON.parse(readFileSync(path.join(root, 'data', 'limitless-matchups.json')))
const majorMetaData = JSON.parse(readFileSync(path.join(root, 'data', 'limitless-major-meta.json')))
const metaRows = Array.isArray(majorMetaData) ? majorMetaData : majorMetaData.meta
const substituteSpriteUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/substitute.png'

const archetypes = new Set()
for (const row of matchupData) {
  if (row.deckA) archetypes.add(row.deckA)
  if (row.deckB) archetypes.add(row.deckB)
}
for (const row of metaRows) if (row.archetype) archetypes.add(row.archetype)

const normalize = (value) => value
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

async function fetchWithRetry(url, attempts = 4) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url)
      if (response.ok || attempt === attempts) return response
      lastError = new Error(`${url} returned ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500))
  }
  throw lastError
}

const pokemonListResponse = await fetchWithRetry('https://pokeapi.co/api/v2/pokemon?limit=100000')
if (!pokemonListResponse.ok) throw new Error(`PokéAPI list failed: ${pokemonListResponse.status}`)
const pokemonList = (await pokemonListResponse.json()).results
const available = new Set(pokemonList.map((pokemon) => pokemon.name))
const normalizedSlugs = [...available]
  .map((slug) => ({ slug, key: normalize(slug) }))
  .sort((a, b) => b.key.length - a.key.length)

const formPrefixes = {
  alolan: 'alola',
  galarian: 'galar',
  hisuian: 'hisui',
  paldean: 'paldea',
}

function candidatesForArchetype(archetype) {
  const key = normalize(archetype)
  if (!key || key === 'other') return []
  const resolved = []

  const megaMatch = key.match(/\bmega ([a-z0-9 ]+?)(?: x| y| box|$)/)
  if (megaMatch) {
    const species = normalizedSlugs.find(({ key: speciesKey }) =>
      megaMatch[1] === speciesKey || megaMatch[1].startsWith(`${speciesKey} `)
    )
    if (species) {
      const suffix = /\bmega charizard x\b/.test(key)
        ? '-mega-x'
        : /\bmega charizard y\b/.test(key)
          ? '-mega-y'
          : '-mega'
      const form = `${species.slug}${suffix}`
      if (available.has(form)) resolved.push(form)
    }
  }

  for (const [displayPrefix, apiSuffix] of Object.entries(formPrefixes)) {
    const match = key.match(new RegExp(`\\b${displayPrefix} ([a-z0-9 ]+)`))
    if (!match) continue
    const species = normalizedSlugs.find(({ key: speciesKey }) =>
      match[1] === speciesKey || match[1].startsWith(`${speciesKey} `)
    )
    const form = species ? `${species.slug}-${apiSuffix}` : ''
    if (available.has(form)) resolved.push(form)
  }

  for (const pokemon of normalizedSlugs) {
    if (resolved.length >= 3) break
    if (
      pokemon.slug.includes('-mega') ||
      /-(?:alola|galar|hisui|paldea)$/.test(pokemon.slug) ||
      resolved.some((identity) => identity.startsWith(`${pokemon.slug}-mega`))
    ) continue
    if (
      new RegExp(`(?:^| )${pokemon.key}(?: |$)`).test(key) &&
      !resolved.some((slug) => slug === pokemon.slug)
    ) {
      resolved.push(pokemon.slug)
    }
  }
  return resolved.slice(0, 3)
}

const deckMappings = {}
const required = new Set()
for (const archetype of [...archetypes].sort()) {
  const identities = candidatesForArchetype(archetype)
  deckMappings[normalize(archetype)] = identities
  identities.forEach((identity) => required.add(identity))
}
for (const identity of [...required]) {
  const baseSpecies = identity.replace(/-mega(?:-x|-y)?$/, '')
  if (baseSpecies !== identity && available.has(baseSpecies)) {
    required.add(baseSpecies)
  }
}

rmSync(temporaryOutputRoot, { recursive: true, force: true })
mkdirSync(temporaryOutputRoot, { recursive: true })
mkdirSync(path.dirname(manifestPath), { recursive: true })
const substituteResponse = await fetchWithRetry(substituteSpriteUrl)
if (!substituteResponse.ok) throw new Error(`Substitute sprite download failed: ${substituteResponse.status}`)
writeFileSync(
  path.join(temporaryOutputRoot, 'substitute.png'),
  await normalizeSpriteBuffer(Buffer.from(await substituteResponse.arrayBuffer()))
)
const pokemon = {}
for (const slug of [...required].sort()) {
  const response = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon/${slug}`)
  if (!response.ok) {
    console.warn(`Skipping unresolved PokéAPI identity: ${slug}`)
    continue
  }
  const record = await response.json()
  const spriteUrl = record.sprites?.front_default
  if (!spriteUrl) {
    console.warn(`Skipping identity without front_default sprite: ${slug}`)
    continue
  }
  const spriteResponse = await fetchWithRetry(spriteUrl)
  if (!spriteResponse.ok) throw new Error(`Sprite download failed for ${slug}`)
  const fileName = `${slug}.png`
  writeFileSync(
    path.join(temporaryOutputRoot, fileName),
    await normalizeSpriteBuffer(Buffer.from(await spriteResponse.arrayBuffer()))
  )
  pokemon[slug] = {
    id: record.id,
    name: record.name,
    species: record.species?.name ?? record.name,
    path: `/pokemon-sprites/${fileName}`,
  }
}

for (const [key, identities] of Object.entries(deckMappings)) {
  deckMappings[key] = identities.filter((identity) => pokemon[identity])
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'https://pokeapi.co/api/v2/pokemon',
  spriteType: 'front_default',
  fallback: {
    canonicalIdentifier: 'substitute',
    source: substituteSpriteUrl,
    path: '/pokemon-sprites/substitute.png',
  },
  pokemon,
  deckMappings,
}
rmSync(outputRoot, { recursive: true, force: true })
renameSync(temporaryOutputRoot, outputRoot)
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Pokémon sprite cache: ${Object.keys(pokemon).length} sprites for ${Object.keys(deckMappings).length} archetypes.`)
