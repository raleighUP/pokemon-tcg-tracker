import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseTcglDecklist } from './lib/tcgl-decklist-parser.mjs'

const root = path.resolve('test-data/deck-image-importer')
const fixtures = [
  ['aob', 'AOB', 4000, 2879],
  ['neddy-dragapult', 'Neddy Dragapult', 2048, 1292],
  ['rahul-crustle', 'Rahul Crustle', 1967, 1081],
  ['slop-box', 'Slop Box', 1536, 2048],
].map(([id, name, width, height]) => {
  const directory = path.join(root, id)
  const exactFile = readdirSync(directory).find((file) => /exact.*(?:pic.*)?list.*\.txt$/i.test(file))
  if (!exactFile) throw new Error(`Missing exact list for ${id}`)
  const rows = parseTcglDecklist(readFileSync(path.join(directory, exactFile), 'utf8')).map((row) => ({
    quantity: row.quantity,
    name: row.name,
    setCode: row.setCode,
    collectorNumber: row.cardNumber,
  }))
  const publicDirectory = path.resolve('public/physical-fixtures', id)
  mkdirSync(publicDirectory, { recursive: true })
  copyFileSync(path.join(directory, 'physical.jfif'), path.join(publicDirectory, 'physical.jfif'))
  return { id, name, imageFile: 'physical.jfif', imageUrl: `/physical-fixtures/${id}/physical.jfif`, exactFile, width, height, expectedTotal: rows.reduce((sum, row) => sum + row.quantity, 0), expectedRows: rows }
})

const output = path.resolve('public/physical-fixtures/catalog.json')
mkdirSync(path.dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify({ schemaVersion: 1, fixtures }, null, 2)}\n`)
console.log(`Physical annotation catalog: ${fixtures.length} fixtures written to ${output}`)
