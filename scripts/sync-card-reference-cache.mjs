import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { syncCardReferenceCache } from './lib/card-reference-sync.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const options = {
    full: false,
    dryRun: false,
    fromLocal: false,
    allowRemovals: false,
    forceSetIds: [],
  }

  for (const arg of argv) {
    if (arg === '--full') options.full = true
    else if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--from-local') options.fromLocal = true
    else if (arg === '--allow-removals') options.allowRemovals = true
    else if (arg.startsWith('--force-set=')) {
      options.forceSetIds.push(arg.slice('--force-set='.length))
    } else if (arg.startsWith('--api-base-url=')) {
      options.apiBaseUrl = arg.slice('--api-base-url='.length)
    } else {
      throw new Error(`Unknown sync option: ${arg}`)
    }
  }

  return options
}

try {
  const options = parseArgs(process.argv.slice(2))
  const report = await syncCardReferenceCache({
    ...options,
    cacheRoot: path.join(repoRoot, 'public', 'card-reference'),
    legacyCachePath: path.join(repoRoot, 'data', 'card-reference-cache.json'),
    legacyInputPath: path.join(repoRoot, 'data', 'card-reference-cache.json'),
  })

  console.log(JSON.stringify(report, null, 2))
  if (!options.dryRun) await import('./build-current-format-manifest.mjs')
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
