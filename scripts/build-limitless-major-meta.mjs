import fs from 'node:fs/promises'
import path from 'node:path'

const TOURNAMENT_ID = '540'
const URL = `https://limitlesstcg.com/tournaments/${TOURNAMENT_ID}/statistics`

const DATA_DIR = path.join(process.cwd(), 'data')
const OUTPUT_PATH = path.join(DATA_DIR, 'limitless-major-meta.json')

function decodeHtml(value) {
  return value
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

async function main() {
  console.log(`Fetching major event meta from ${URL}`)

  const response = await fetch(URL)

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  const html = await response.text()

  const rows = [...html.matchAll(/<tr data-count="(\d+)" data-points="(\d+)">([\s\S]*?)<\/tr>/g)]

  const meta = rows
    .map((row) => {
      const count = Number(row[1])
      const points = Number(row[2])
      const rowHtml = row[3]

      const deckMatch = rowHtml.match(/<td><a href="\/decks\/[^"]+">([\s\S]*?)<\/a><\/td>/)
      const shareMatch = rowHtml.match(/<td class="landscape-only">([\d.]+)%<\/td>/)

      if (!deckMatch || !shareMatch) return null

      return {
        archetype: decodeHtml(deckMatch[1].replace(/<[^>]*>/g, '').trim()),
        count,
        share: Number(shareMatch[1]),
        points,
        sourceTournamentId: TOURNAMENT_ID,
        sourceUrl: URL,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.share - a.share)

  await fs.mkdir(DATA_DIR, { recursive: true })

  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(meta, null, 2),
    'utf8'
  )

  console.log(`Saved ${meta.length} meta records to ${OUTPUT_PATH}`)
  console.log('\nTop 10:')
  meta.slice(0, 10).forEach((deck, index) => {
    console.log(
      `${index + 1}. ${deck.archetype}: ${deck.share}% (${deck.count})`
    )
  })
}

main().catch((error) => {
  console.error('\nMajor meta scrape failed:')
  console.error(error)
  process.exit(1)
})