import assert from 'node:assert/strict'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  createManifest,
  groupCardsBySourceSet,
  normalizeApiCard,
  syncCardReferenceCache,
  validateCachePayload,
} from './lib/card-reference-sync.mjs'

function tempDir() {
  return mkdtempSync(path.join(tmpdir(), 'card-reference-sync-test-'))
}

function apiSet(overrides = {}) {
  return {
    id: 'sv1',
    name: 'Scarlet & Violet',
    ptcgoCode: 'SVI',
    printedTotal: 198,
    total: 258,
    releaseDate: '2023/03/31',
    updatedAt: '2023/03/31 12:00:00',
    ...overrides,
  }
}

function apiCard(overrides = {}) {
  const set = overrides.set ?? apiSet()
  return {
    id: `${set.id}-${overrides.number ?? '1'}`,
    name: overrides.name ?? 'Sprigatito',
    supertype: overrides.supertype ?? 'Pokémon',
    set,
    number: overrides.number ?? '1',
    regulationMark: overrides.regulationMark ?? 'G',
    legalities: {
      standard: 'Legal',
      expanded: 'Legal',
      unlimited: 'Legal',
    },
    images: {
      small: `https://images.example.test/${set.id}/${overrides.number ?? '1'}.png`,
      large: `https://images.example.test/${set.id}/${overrides.number ?? '1'}_hires.png`,
    },
    ...overrides,
  }
}

function installMockFetch({ sets, cardsBySet, failCardsForSet, requestedSets = [] }) {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input))

    if (url.pathname.endsWith('/sets')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: sets }),
      }
    }

    if (url.pathname.endsWith('/cards')) {
      const setId = url.searchParams.get('q')?.replace('set.id:', '')
      requestedSets.push(setId)

      if (setId === failCardsForSet) {
        throw new Error(`Forced card fetch failure for ${setId}`)
      }

      const cards = cardsBySet[setId] ?? []
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: cards,
          totalCount: cards.length,
        }),
      }
    }

    throw new Error(`Unexpected URL ${url}`)
  }
}

async function runSync(root, options = {}) {
  return syncCardReferenceCache({
    cacheRoot: path.join(root, 'public', 'card-reference'),
    legacyCachePath: path.join(root, 'data', 'card-reference-cache.json'),
    legacyInputPath: path.join(root, 'data', 'card-reference-cache.json'),
    apiBaseUrl: 'https://mock.example.test/v2',
    now: new Date('2026-07-13T12:00:00.000Z'),
    ...options,
  })
}

async function testNoUpstreamChangesDoNotRewrite() {
  const root = tempDir()
  try {
    const sets = [apiSet()]
    const cardsBySet = { sv1: [apiCard()] }
    installMockFetch({ sets, cardsBySet })
    await runSync(root)
    const manifestPath = path.join(root, 'public', 'card-reference', 'card-reference-manifest.json')
    const before = readFileSync(manifestPath, 'utf8')
    const beforeMtime = statSync(manifestPath).mtimeMs

    await new Promise((resolve) => setTimeout(resolve, 20))
    installMockFetch({ sets, cardsBySet })
    const report = await runSync(root)

    assert.equal(report.noChanges, true)
    assert.equal(readFileSync(manifestPath, 'utf8'), before)
    assert.equal(statSync(manifestPath).mtimeMs, beforeMtime)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

async function testNewSetCreatesSetFileAndIndexes() {
  const root = tempDir()
  try {
    const sets = [apiSet({ id: 'sv1' })]
    installMockFetch({ sets, cardsBySet: { sv1: [apiCard({ set: sets[0] })] } })
    await runSync(root)

    const newSet = apiSet({
      id: 'sv2',
      name: 'Paldea Evolved',
      ptcgoCode: 'PAL',
      updatedAt: '2023/06/09 12:00:00',
    })
    installMockFetch({
      sets: [...sets, newSet],
      cardsBySet: {
        sv2: [apiCard({ set: newSet, name: 'Fuecoco', number: '4' })],
      },
    })
    const report = await runSync(root)

    assert.deepEqual(report.changedSets.map((set) => set.id), ['sv2'])
    assert.ok(existsSync(path.join(root, 'public', 'card-reference', 'sets', 'sv2.json')))

    const index = JSON.parse(
      readFileSync(
        path.join(root, 'public', 'card-reference', 'indexes', 'card-name-index.json'),
        'utf8'
      )
    )
    assert.deepEqual(index.fuecoco, ['sv2-4'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

async function testExistingSetUpdatedOnlyRefreshesThatSet() {
  const root = tempDir()
  const requestedSets = []
  try {
    const sets = [apiSet({ id: 'sv1' }), apiSet({ id: 'sv2', updatedAt: '2023/06/09' })]
    installMockFetch({
      sets,
      cardsBySet: {
        sv1: [apiCard({ set: sets[0] })],
        sv2: [apiCard({ set: sets[1], number: '2' })],
      },
    })
    await runSync(root, { full: true })

    const updatedSv2 = { ...sets[1], total: 260, updatedAt: '2023/06/10' }
    installMockFetch({
      sets: [sets[0], updatedSv2],
      cardsBySet: {
        sv2: [apiCard({ set: updatedSv2, name: 'Quaxly', number: '7' })],
      },
      requestedSets,
    })
    const report = await runSync(root)

    assert.deepEqual(report.changedSets.map((set) => set.id), ['sv2'])
    assert.deepEqual(requestedSets, ['sv2'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

async function testFailedSyncKeepsExistingCache() {
  const root = tempDir()
  try {
    const set = apiSet()
    installMockFetch({ sets: [set], cardsBySet: { sv1: [apiCard({ set })] } })
    await runSync(root)
    const manifestPath = path.join(root, 'public', 'card-reference', 'card-reference-manifest.json')
    const before = readFileSync(manifestPath, 'utf8')

    const changedSet = { ...set, total: 259, updatedAt: '2026/07/13' }
    installMockFetch({
      sets: [changedSet],
      cardsBySet: {},
      failCardsForSet: 'sv1',
    })

    await assert.rejects(() => runSync(root))
    assert.equal(readFileSync(manifestPath, 'utf8'), before)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function testUnexpectedRemovalFailsValidation() {
  const previousManifest = { totalCards: 200, sets: [] }
  const set = apiSet()
  const cards = [apiCard({ set })].map((card) =>
    normalizeApiCard(card, '2026-07-13T12:00:00.000Z')
  )
  const setCards = groupCardsBySourceSet(cards)
  const manifest = createManifest({
    sets: [set],
    setCards,
    generatedAt: '2026-07-13T12:00:00.000Z',
  })
  const validation = validateCachePayload({
    manifest,
    setCards,
    previousManifest,
  })

  assert.equal(validation.ok, false)
}

function testNewRegulationMarkAndFutureSetAreAccepted() {
  const futureSet = apiSet({
    id: 'sv99',
    name: 'Future Example',
    releaseDate: '2099/01/01',
  })
  const cards = [
    apiCard({
      set: futureSet,
      regulationMark: 'Z',
      name: 'Future Pikachu',
    }),
  ].map((card) => normalizeApiCard(card, '2026-07-13T12:00:00.000Z'))
  const setCards = groupCardsBySourceSet(cards)
  const manifest = createManifest({
    sets: [futureSet],
    setCards,
    generatedAt: '2026-07-13T12:00:00.000Z',
  })
  const validation = validateCachePayload({ manifest, setCards })

  assert.equal(validation.ok, true)
  assert.equal(cards[0].regulationMark, 'Z')
  assert.equal(manifest.sets[0].releaseDate, '2099/01/01')
}

function testExactPrintIdentityKeepsSameNameDistinct() {
  const set = apiSet()
  const cards = [
    apiCard({ set, name: 'Ultra Ball', number: '196' }),
    apiCard({ set, name: 'Ultra Ball', number: '197' }),
  ].map((card) => normalizeApiCard(card, '2026-07-13T12:00:00.000Z'))
  const setCards = groupCardsBySourceSet(cards)
  const manifest = createManifest({
    sets: [set],
    setCards,
    generatedAt: '2026-07-13T12:00:00.000Z',
  })

  assert.equal(validateCachePayload({ manifest, setCards }).ok, true)
  assert.notEqual(cards[0].id, cards[1].id)
  assert.notEqual(cards[0].cardNumber, cards[1].cardNumber)
}

function testIdenticalContentHasStableCacheVersion() {
  const set = apiSet()
  const cards = [apiCard({ set })].map((card) =>
    normalizeApiCard(card, '2026-07-13T12:00:00.000Z')
  )
  const setCards = groupCardsBySourceSet(cards)
  const firstManifest = createManifest({
    sets: [set],
    setCards,
    generatedAt: '2026-07-13T12:00:00.000Z',
  })
  const secondManifest = createManifest({
    sets: [set],
    setCards,
    generatedAt: '2026-07-14T12:00:00.000Z',
  })

  assert.equal(firstManifest.cacheVersion, secondManifest.cacheVersion)
  assert.notEqual(firstManifest.generatedAt, secondManifest.generatedAt)
}

const tests = [
  testNoUpstreamChangesDoNotRewrite,
  testNewSetCreatesSetFileAndIndexes,
  testExistingSetUpdatedOnlyRefreshesThatSet,
  testFailedSyncKeepsExistingCache,
  testUnexpectedRemovalFailsValidation,
  testNewRegulationMarkAndFutureSetAreAccepted,
  testExactPrintIdentityKeepsSameNameDistinct,
  testIdenticalContentHasStableCacheVersion,
]

for (const test of tests) {
  await test()
  console.log(`PASS ${test.name}`)
}
