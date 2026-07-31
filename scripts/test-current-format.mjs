import assert from 'node:assert/strict'
import manifest from '../src/data/current-format-manifest.json' with { type: 'json' }

assert.equal(manifest.schemaVersion, 1)
assert.ok(manifest.label)
assert.deepEqual(manifest.regulationMarks, ['H', 'I', 'J'])
assert.ok(Date.parse(manifest.effectiveDate))
assert.ok(Date.parse(manifest.generatedAt))
console.log('Current format manifest tests passed.')
