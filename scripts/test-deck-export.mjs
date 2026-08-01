import assert from 'node:assert/strict'
import { getDeckExportFileName } from '../src/utils/deck-export.ts'

assert.equal(getDeckExportFileName('Dragapult ex'), 'dragapult-ex.txt')
assert.equal(getDeckExportFileName("N's Zoroark / Dusknoir"), 'n-s-zoroark-dusknoir.txt')
assert.equal(getDeckExportFileName('M\u00e9ga Gardevoir'), 'mega-gardevoir.txt')
assert.equal(getDeckExportFileName('***'), 'deck-list.txt')
console.log('Deck export filename tests passed.')
