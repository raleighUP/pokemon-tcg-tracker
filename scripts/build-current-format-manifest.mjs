import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const referencePath = path.join(root, 'public', 'card-reference', 'card-reference-manifest.json')
const legalityPath = path.join(root, 'data', 'standard-format-legality.json')
const outputPath = path.join(root, 'src', 'data', 'current-format-manifest.json')
const reference = JSON.parse(readFileSync(referencePath, 'utf8'))
const legality = JSON.parse(readFileSync(legalityPath, 'utf8'))
const asOf = new Date(process.env.FORMAT_AS_OF || new Date().toISOString())

const released = reference.sets
  .filter((set) => set.releaseDate && new Date(set.releaseDate.replaceAll('/', '-')) <= asOf)
  .filter((set) => legality.legalSetIds.includes(set.id))
  .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
const latest = released.at(-1)
const fallback = !latest
const label = latest
  ? `${legality.earliestIncludedSetCode}–${latest.ptcgoCode || latest.id.toUpperCase()}`
  : legality.fallbackLabel

writeFileSync(outputPath, `${JSON.stringify({
  schemaVersion: 1,
  id: legality.id,
  label,
  regulationMarks: legality.regulationMarks,
  earliestIncludedSet: legality.earliestIncludedSet,
  earliestIncludedSetCode: legality.earliestIncludedSetCode,
  latestLegalSet: latest?.name ?? null,
  latestLegalSetCode: latest?.ptcgoCode ?? null,
  effectiveDate: legality.effectiveDate,
  generatedAt: asOf.toISOString(),
  source: fallback ? 'installed-legality-manifest' : reference.source,
  sourceVersion: legality.version,
  fallback,
  diagnostic: fallback ? 'No release-dated legal sets were available; using the latest verified installed format.' : null,
}, null, 2)}\n`)
console.log(`Current format: ${label}${fallback ? ' (verified fallback)' : ''}`)
