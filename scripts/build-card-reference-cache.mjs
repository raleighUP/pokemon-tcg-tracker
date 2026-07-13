import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { syncCardReferenceCache } from './lib/card-reference-sync.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

syncCardReferenceCache({
  full: true,
  cacheRoot: path.join(repoRoot, 'public', 'card-reference'),
  legacyCachePath: path.join(repoRoot, 'data', 'card-reference-cache.json'),
  legacyInputPath: path.join(repoRoot, 'data', 'card-reference-cache.json'),
})
  .then((report) => {
    console.log(JSON.stringify(report, null, 2))
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
