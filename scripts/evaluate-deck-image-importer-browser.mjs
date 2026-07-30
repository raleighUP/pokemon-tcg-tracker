import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { discoverDeckImageFixtures, repoRoot } from './lib/deck-image-fixtures.mjs'
import {
  parseTcglDecklist,
  tcglIdentityKey,
  tcglRowKey,
} from './lib/tcgl-decklist-parser.mjs'
import { DIGITAL_RECOGNITION_CONFIG } from '../src/lib/deck-recognition/digital-recognition-config.mjs'

const port = Number(process.env.DECK_IMPORTER_BENCHMARK_PORT ?? 3217)
const benchmarkSourceType = process.env.DECK_IMPORTER_BENCHMARK_SOURCE ?? 'digital'
let baseUrl = process.env.DECK_IMPORTER_BENCHMARK_URL ?? `http://127.0.0.1:${port}`
const outputRoot = path.join(
  repoRoot,
  'debug-output',
  `deck-image-importer-browser-${benchmarkSourceType}`
)
const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]

function expectedTextForSource(fixture) {
  if (benchmarkSourceType !== 'physical') return fixture.expectedText

  const exactListFile = readdirSync(fixture.fixturePath).find((file) =>
    /exact.*(?:pic.*)?list.*\.txt$/i.test(file)
  )
  if (!exactListFile) {
    throw new Error(`No exact physical list found for ${fixture.fixture}`)
  }

  return readFileSync(path.join(fixture.fixturePath, exactListFile), 'utf8')
}

async function serverAvailable(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

function waitForServer(timeoutMs = 120000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await fetch(baseUrl)
        if (response.ok) return resolve()
      } catch {}
      if (Date.now() - started >= timeoutMs) {
        return reject(new Error(`Timed out waiting for ${baseUrl}`))
      }
      setTimeout(poll, 500)
    }
    poll()
  })
}

function compareRows(expectedText, actualText) {
  const expected = parseTcglDecklist(expectedText)
  const actual = parseTcglDecklist(actualText)
  const expectedByIdentity = new Map(expected.map((row) => [tcglIdentityKey(row), row]))
  const actualByIdentity = new Map(actual.map((row) => [tcglIdentityKey(row), row]))
  const exactRows = new Set(actual.map(tcglRowKey))
  let quantityCorrectRows = 0
  let wrongIdentities = 0

  for (const row of expected) {
    const actualRow = actualByIdentity.get(tcglIdentityKey(row))
    if (actualRow?.quantity === row.quantity) quantityCorrectRows += 1
  }
  for (const row of actual) {
    if (!expectedByIdentity.has(tcglIdentityKey(row)) && !/^unresolved/i.test(row.name)) {
      wrongIdentities += 1
    }
  }

  return {
    expectedTotal: expected.reduce((sum, row) => sum + row.quantity, 0),
    recognizedTotal: actual.reduce((sum, row) => sum + row.quantity, 0),
    expectedRows: expected.length,
    exactRows: expected.filter((row) => exactRows.has(tcglRowKey(row))).length,
    quantityCorrectRows,
    wrongIdentities,
    unresolvedRows: actual.filter((row) => /^unresolved/i.test(row.name)).length,
    falseExtraRows: actual.filter(
      (row) => !expectedByIdentity.has(tcglIdentityKey(row)) && !/^unresolved/i.test(row.name)
    ).length,
  }
}

let server = null
let browser

try {
  if (!await serverAvailable(baseUrl)) {
    server = spawn(
      process.execPath,
      [
        path.join(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next'),
        'dev',
        '--hostname',
        '127.0.0.1',
        '--port',
        String(port),
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          NEXT_PUBLIC_ENABLE_DECK_PHOTO_IMPORT: 'true',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
  }
  await waitForServer()
  const executablePath = edgePaths.find(existsSync)
  browser = await chromium.launch(executablePath ? { executablePath } : {})
  const results = []

  for (const fixture of discoverDeckImageFixtures()) {
    const image = fixture.images.find(
      (candidate) => candidate.sourceType === benchmarkSourceType
    )
    if (!image || !['aob', 'rahul-crustle', 'slop-box', 'neddy-dragapult'].includes(fixture.fixture)) continue

    const context = await browser.newContext({ reducedMotion: 'reduce' })
    await context.addInitScript(() => {
      localStorage.setItem('top-cut-first-launch-dismissed', 'true')
      localStorage.setItem('top-cut-intro-last-shown', String(Date.now()))
    })
    const page = await context.newPage()
    const benchmarkUrl = new URL(baseUrl)
    benchmarkUrl.searchParams.set('deckImageStrategy', benchmarkSourceType)
    await page.goto(benchmarkUrl.toString(), { waitUntil: 'networkidle' })
    await page.locator('input[type="file"]').setInputFiles(image.absolutePath)
    const editor = page.getByLabel('Editable extracted TCGL decklist')
    await editor.waitFor({ state: 'visible', timeout: 120000 })
    const actualText = await editor.inputValue()
    const diagnostics = await page.evaluate(
      () => window.__topCutDeckImageRecognition ?? null
    )
    const metrics = compareRows(expectedTextForSource(fixture), actualText)
    const quantityReviewRows = diagnostics?.debugMatches.filter(
      (match) =>
        match.quantitySource === 'unknown' ||
        match.quantityConfidence <
          DIGITAL_RECOGNITION_CONFIG.minimumAcceptedQuantityConfidence
    ).length ?? 0
    const saveButton = page.getByRole('button', { name: 'Save Deck' }).last()
    const saveAvailable = await saveButton.isEnabled()
    if (benchmarkSourceType === 'digital') await saveButton.click()
    if (benchmarkSourceType === 'digital') {
      await page.waitForFunction((expectedDecklist) => {
        const stored = localStorage.getItem('pokemon-decks')
        if (!stored) return false
        try {
          return JSON.parse(stored).data?.some(
            (deck) => deck.decklist === expectedDecklist
          )
        } catch {
          return false
        }
      }, actualText)
    }
    if (benchmarkSourceType === 'digital') await page.reload({ waitUntil: 'networkidle' })
    const savedAndReopened = benchmarkSourceType === 'digital' &&
      await page.evaluate((expectedDecklist) => {
        const stored = localStorage.getItem('pokemon-decks')
        if (!stored) return false
        try {
          return JSON.parse(stored).data?.some(
            (deck) => deck.decklist === expectedDecklist
          ) ?? false
        } catch {
          return false
        }
      }, actualText)
    results.push({
      fixture: fixture.fixture,
      image: image.file,
      ...metrics,
      quantityReviewRows,
      saveAvailable,
      savedAndReopened,
      actualText,
      diagnostics,
      requestedStrategy: diagnostics?.strategyDiagnostics?.requestedStrategy,
      resolvedStrategy: diagnostics?.strategyDiagnostics?.resolvedStrategy,
      digitalQuantityExecuted:
        diagnostics?.strategyDiagnostics?.digitalQuantityExecuted,
    })
    await context.close()
  }

  mkdirSync(outputRoot, { recursive: true })
  const report = {
    generatedAt: new Date().toISOString(),
    recognitionPath: 'production-browser-upload-ui',
    sourceType: benchmarkSourceType,
    config: DIGITAL_RECOGNITION_CONFIG,
    results,
  }
  writeFileSync(path.join(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.table(results.map((result) => ({
    fixture: result.fixture,
    image: result.image,
    expectedTotal: result.expectedTotal,
    recognizedTotal: result.recognizedTotal,
    expectedRows: result.expectedRows,
    exactRows: result.exactRows,
    quantityCorrectRows: result.quantityCorrectRows,
    wrongIdentities: result.wrongIdentities,
    unresolvedRows: result.unresolvedRows,
    falseExtraRows: result.falseExtraRows,
    quantityReviewRows: result.quantityReviewRows,
    saveAvailable: result.saveAvailable,
    savedAndReopened: result.savedAndReopened,
    requestedStrategy: result.requestedStrategy,
    resolvedStrategy: result.resolvedStrategy,
    digitalQuantityExecuted: result.digitalQuantityExecuted,
  })))
  if (results.some(
    (result) => result.recognizedTotal > 65 || !result.saveAvailable ||
      (benchmarkSourceType === 'digital' && !result.savedAndReopened) ||
      (benchmarkSourceType === 'physical' && (
        result.resolvedStrategy !== 'physical' || result.digitalQuantityExecuted !== false
      ))
  )) process.exitCode = 1
} finally {
  await browser?.close()
  server?.kill()
}
