import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { resolveRecognitionStrategy } from '../src/lib/deck-recognition/physical-recognition-config.mjs'

assert.equal(resolveRecognitionStrategy('physical'), 'physical')
assert.equal(resolveRecognitionStrategy('digital'), 'digital')
assert.equal(resolveRecognitionStrategy('auto'), 'digital')

const benchmark = spawnSync(
  process.execPath,
  [path.resolve('scripts/evaluate-deck-image-importer-physical.mjs')],
  { cwd: process.cwd(), encoding: 'utf8', stdio: 'inherit' }
)
assert.equal(benchmark.status, 0, 'Production-path physical benchmark must pass')

const report = JSON.parse(readFileSync(
  path.resolve('debug-output/deck-image-importer-browser-physical/report.json'),
  'utf8'
))
assert.equal(report.results.length, 4)
for (const result of report.results) {
  const diagnostics = result.diagnostics?.strategyDiagnostics
  assert.equal(diagnostics?.requestedStrategy, 'physical')
  assert.equal(diagnostics?.resolvedStrategy, 'physical')
  assert.equal(diagnostics?.physicalDetectorExecuted, true)
  assert.equal(diagnostics?.digitalDetectorExecuted, false)
  assert.equal(diagnostics?.digitalQuantityExecuted, false)
  assert.equal(diagnostics?.physicalStackCounterExecuted, true)
  assert.ok(
    result.diagnostics.debugMatches.every(
      (match) => match.candidateId.startsWith('physical-entry-')
    ),
    `${result.fixture} must contain only physical-entry candidates`
  )
}

console.log('Physical recognition strategy routing: pass')
