import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_REMOVAL_THRESHOLD,
  loadExistingPublicCache,
  validateCachePayload,
} from './lib/card-reference-sync.mjs'
import {
  getApiSetCodesForTcglSetCode,
  getPreferredTcglSetCode,
  normalizeSetCode,
} from './lib/tcgl-set-code-aliases.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const cachePath = path.join(repoRoot, 'data', 'card-reference-cache.json')
const publicCacheRoot = path.join(repoRoot, 'public', 'card-reference')

const testCases = [
  {
    name: 'Mega Kangaskhan ex',
    setCode: 'MEG',
    cardNumber: '104',
  },
  {
    name: 'Ultra Ball',
    setCode: 'MEG',
    cardNumber: '131',
  },
  {
    name: 'Buddy-Buddy Poffin',
    setCode: 'TEF',
    cardNumber: '144',
  },
  {
    name: "Boss's Orders",
    setCode: 'MEG',
    cardNumber: '114',
  },
  {
    name: 'Basic Psychic Energy',
    setCode: 'MEE',
    cardNumber: '5',
  },
  {
    name: 'Dreepy',
    setCode: 'TWM',
    cardNumber: '128',
  },
  {
    name: 'Crustle',
    setCode: 'DRI',
    cardNumber: '12',
  },
  {
    name: 'Area Zero Underdepths',
    setCode: 'SCR',
    cardNumber: '131',
  },
]

function normalizeName(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeCardNumber(value) {
  return String(value).trim().toLowerCase()
}

function getAcceptedSetCodes(setCode) {
  return getApiSetCodesForTcglSetCode(setCode)
}

function parseDisplayString(value) {
  const parts = value.trim().split(/\s+/)
  const cardNumber = parts.at(-1) ?? ''
  const setCode = parts.at(-2) ?? ''
  const name = parts.slice(0, -2).join(' ')

  return {
    name,
    setCode,
    cardNumber,
  }
}

function loadCache() {
  if (!existsSync(cachePath)) {
    throw new Error(`Card reference cache not found: ${cachePath}`)
  }

  const cache = JSON.parse(readFileSync(cachePath, 'utf8'))

  if (!Array.isArray(cache)) {
    throw new Error('Card reference cache must be a JSON array.')
  }

  return cache
}

function validatePublicSplitCache(cache) {
  if (!existsSync(publicCacheRoot)) {
    return {
      ok: true,
      skipped: true,
      errors: [],
    }
  }

  const { manifest, setCards } = loadExistingPublicCache(publicCacheRoot)

  if (!manifest) {
    return {
      ok: false,
      skipped: false,
      errors: ['Public card-reference manifest is missing.'],
    }
  }

  const splitValidation = validateCachePayload({
    manifest,
    setCards,
    allowRemovals: true,
    removalThreshold: DEFAULT_REMOVAL_THRESHOLD,
  })
  const splitCardIds = new Set([...setCards.values()].flat().map((card) => card.id))
  const legacyCardIds = new Set(cache.map((card) => card.id))
  const errors = [...splitValidation.errors]

  if (splitCardIds.size !== legacyCardIds.size) {
    errors.push(
      `Split cache has ${splitCardIds.size} unique cards but legacy cache has ${legacyCardIds.size}.`
    )
  }

  for (const id of splitCardIds) {
    if (!legacyCardIds.has(id)) {
      errors.push(`Split cache card ${id} is missing from legacy cache.`)
      break
    }
  }

  const indexes = [
    'card-name-index.json',
    'set-number-index.json',
    'multilingual-name-index.json',
  ]

  for (const indexFile of indexes) {
    const indexPath = path.join(publicCacheRoot, 'indexes', indexFile)
    if (!existsSync(indexPath)) {
      errors.push(`Missing public card-reference index ${indexFile}.`)
      continue
    }

    const index = JSON.parse(readFileSync(indexPath, 'utf8'))
    for (const [key, ids] of Object.entries(index)) {
      if (!Array.isArray(ids)) {
        errors.push(`Index ${indexFile} key ${key} does not contain an array.`)
        break
      }

      const missingId = ids.find((id) => !splitCardIds.has(id))
      if (missingId) {
        errors.push(`Index ${indexFile} key ${key} references missing card ${missingId}.`)
        break
      }
    }
  }

  return {
    ok: errors.length === 0,
    skipped: false,
    errors,
    manifest,
  }
}

function findByExactName(cache, name) {
  const target = String(name).trim().toLowerCase()

  return cache.filter(
    (card) => String(card.englishName).trim().toLowerCase() === target
  )
}

function findByNormalizedName(cache, name) {
  const target = normalizeName(name)

  return cache.filter((card) => normalizeName(card.englishName) === target)
}

function findBySetAndNumber(cache, setCode, cardNumber) {
  const acceptedSetCodes = getAcceptedSetCodes(setCode)
  const requestedNumber = normalizeCardNumber(cardNumber)

  return cache.filter(
    (card) =>
      acceptedSetCodes.includes(normalizeSetCode(card.setCode)) &&
      normalizeCardNumber(card.cardNumber) === requestedNumber
  )
}

function findByDisplayString(cache, displayString) {
  const parsed = parseDisplayString(displayString)
  const nameMatches = findByNormalizedName(cache, parsed.name)
  const setMatches = findBySetAndNumber(
    nameMatches,
    parsed.setCode,
    parsed.cardNumber
  )

  return setMatches
}

function findRequestedPrinting(cache, testCase) {
  return findBySetAndNumber(
    findByNormalizedName(cache, testCase.name),
    testCase.setCode,
    testCase.cardNumber
  )[0]
}

function validateRequiredFields(cache) {
  const sampleSize = Math.min(100, cache.length)
  const missing = []

  for (let index = 0; index < sampleSize; index += 1) {
    const sampleIndex = Math.floor((index * cache.length) / sampleSize)
    const card = cache[sampleIndex]
    const missingFields = [
      'englishName',
      'category',
      'setCode',
      'cardNumber',
    ].filter((field) => !card[field])

    if (missingFields.length > 0) {
      missing.push({
        id: card.id,
        missingFields,
      })
    }
  }

  return missing
}

function formatPrinting(card) {
  if (!card) return 'none'

  return `${card.englishName} ${card.setCode} ${card.cardNumber}`
}

function usedSetCodeAlias(testCase, card) {
  if (!card) return false

  return normalizeSetCode(testCase.setCode) !== normalizeSetCode(card.setCode)
}

function validateLookup(cache, testCase) {
  const displayString = `${testCase.name} ${testCase.setCode} ${testCase.cardNumber}`
  const exactNameMatches = findByExactName(cache, testCase.name)
  const normalizedNameMatches = findByNormalizedName(
    cache,
    testCase.name.toUpperCase()
  )
  const setNumberMatches = findBySetAndNumber(
    cache,
    testCase.setCode,
    testCase.cardNumber
  )
  const displayMatches = findByDisplayString(cache, displayString)
  const requestedPrinting = findRequestedPrinting(cache, testCase)
  const success = Boolean(
    exactNameMatches.length > 0 &&
      normalizedNameMatches.length > 0 &&
      setNumberMatches.length > 0 &&
      displayMatches.length > 0 &&
      requestedPrinting
  )

  return {
    ...testCase,
    displayString,
    success,
    totalMatchingPrintings: exactNameMatches.length,
    requestedPrinting,
    exactNameLookup: exactNameMatches.length > 0,
    normalizedNameLookup: normalizedNameMatches.length > 0,
    setNumberLookup: setNumberMatches.length > 0,
    displayStringLookup: displayMatches.length > 0,
    usedAlias: usedSetCodeAlias(testCase, requestedPrinting),
    preferredTcglSetCode: requestedPrinting
      ? getPreferredTcglSetCode(requestedPrinting.setCode)
      : undefined,
  }
}

function printLookupReport(results) {
  for (const result of results) {
    console.log(`${result.success ? 'PASS' : 'FAIL'} ${result.name}`)
    console.log(
      `  Exact name lookup: ${result.exactNameLookup ? 'pass' : 'fail'}`
    )
    console.log(
      `  Normalized name lookup: ${
        result.normalizedNameLookup ? 'pass' : 'fail'
      }`
    )
    console.log(
      `  Set code + card number lookup: ${
        result.setNumberLookup ? 'pass' : 'fail'
      }`
    )
    console.log(
      `  Combined display string lookup: ${
        result.displayStringLookup ? 'pass' : 'fail'
      }`
    )
    console.log(`  Total matching printings: ${result.totalMatchingPrintings}`)
    console.log(
      `  Requested printing: ${formatPrinting(result.requestedPrinting)}`
    )
    if (result.usedAlias) {
      console.log(
        `  Alias resolution: ${result.setCode} -> ${result.requestedPrinting.setCode}`
      )
      console.log(`  Preferred TCGL output code: ${result.preferredTcglSetCode}`)
    }
    console.log('')
  }
}

function summarizeCache(cache) {
  return cache.reduce(
    (summary, card) => {
      summary.total += 1
      if (card.category === 'Pokemon') summary.Pokemon += 1
      if (card.category === 'Trainer') summary.Trainer += 1
      if (card.category === 'Energy') summary.Energy += 1
      return summary
    },
    { total: 0, Pokemon: 0, Trainer: 0, Energy: 0 }
  )
}

try {
  const cache = loadCache()
  const lookupResults = testCases.map((testCase) =>
    validateLookup(cache, testCase)
  )
  const summary = summarizeCache(cache)
  const missingRequiredFields = validateRequiredFields(cache)
  const splitCacheValidation = validatePublicSplitCache(cache)
  const resolvedCount = lookupResults.filter((result) => result.success).length
  const lookupSuccessPercentage =
    (resolvedCount / lookupResults.length) * 100

  printLookupReport(lookupResults)

  if (missingRequiredFields.length > 0) {
    console.log('Missing required fields')
    console.log(JSON.stringify(missingRequiredFields, null, 2))
    console.log('')
  }

  console.log('Summary')
  console.log(`${resolvedCount} / ${lookupResults.length} cards resolved`)
  console.log(`Total cached cards: ${summary.total}`)
  console.log(`Pokemon count: ${summary.Pokemon}`)
  console.log(`Trainer count: ${summary.Trainer}`)
  console.log(`Energy count: ${summary.Energy}`)
  console.log(
    `Cards missing required fields in sample: ${missingRequiredFields.length}`
  )
  console.log(`Lookup success: ${lookupSuccessPercentage.toFixed(1)}%`)

  if (splitCacheValidation.skipped) {
    console.log('Public split cache: skipped')
  } else {
    console.log(
      `Public split cache: ${
        splitCacheValidation.ok ? 'valid' : 'invalid'
      } (${splitCacheValidation.manifest?.totalSets ?? 0} sets, ${
        splitCacheValidation.manifest?.totalCards ?? 0
      } cards)`
    )
  }

  if (!splitCacheValidation.ok) {
    console.log('')
    console.log('Public split cache errors')
    console.log(JSON.stringify(splitCacheValidation.errors, null, 2))
  }

  if (resolvedCount !== lookupResults.length || !splitCacheValidation.ok) {
    process.exitCode = 1
  }
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
