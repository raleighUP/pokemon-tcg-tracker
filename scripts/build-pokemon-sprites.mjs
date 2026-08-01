import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { normalizeSpriteBuffer } from './lib/sprite-normalization.mjs'

const spriteRoot = path.join(process.cwd(), 'public', 'pokemon-sprites')
const spriteFiles = readdirSync(spriteRoot).filter((file) => file.endsWith('.png')).sort()
let changed = 0
for (const file of spriteFiles) {
  const target = path.join(spriteRoot, file)
  const source = readFileSync(target)
  const normalized = await normalizeSpriteBuffer(source)
  if (!source.equals(normalized)) {
    writeFileSync(target, normalized)
    changed += 1
  }
}
console.log(`Normalized ${spriteFiles.length} sprites on 96px canvases (${changed} rewritten).`)
