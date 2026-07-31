import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { resolveRecognitionStrategy } from '../src/lib/deck-recognition/physical-recognition-config.mjs'
import {localize,STRATEGIES} from './physical-localization-strategies.mjs'

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

assert.deepEqual(STRATEGIES,['baseline-v1','proposal-v2','perspective-first'])
const fixture={width:1000,height:1000},source={diagnostics:{debugMatches:[{candidateBounds:{x:10,y:10,width:60,height:88},logicalStackBounds:{x:5,y:5,width:70,height:98},proposalFeatures:{finalScore:.8,proposalSource:'connected-component'},detectorStages:[{stage:'geometry-filtered-components',regions:[{id:'g1',bounds:{x:10,y:10,width:63,height:88},score:.8}]},{stage:'card-like-candidates',regions:[{id:'w1',bounds:{x:11,y:11,width:63,height:88},score:.9}]},{stage:'raw-connected-components',regions:[{id:'r1',bounds:{x:10,y:10,width:63,height:88},score:.7}]}]}]}}
assert.equal(localize(source,fixture,'baseline-v1').proposals.length,1)
const a=localize(source,fixture,'proposal-v2'),b=localize(source,fixture,'proposal-v2');assert.deepEqual(a,b,'candidate is deterministic');assert.ok(a.proposals[0].diagnostics.sources.length>=1);assert.ok(!String(localize).includes('physical-annotations'),'runtime localizer cannot read annotations')
console.log('Physical recognition and localization strategy routing: pass')
