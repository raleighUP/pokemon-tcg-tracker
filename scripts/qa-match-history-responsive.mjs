import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 3221
const url = `http://127.0.0.1:${port}`
const output = path.join(root, 'debug-output', 'match-history-qa')
mkdirSync(output, { recursive: true })
const server = spawn(process.execPath, ['scripts/serve-static.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
})

for (let attempt = 0; attempt < 100; attempt++) {
  try {
    if ((await fetch(url)).ok) break
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100))
}

const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)
const browser = await chromium.launch(edge ? { executablePath: edge } : {})

try {
  const viewports = [
    ['iphone-se', 375, 667],
    ['iphone-pro-max', 430, 932],
    ['desktop', 1280, 900],
  ]
  for (const theme of ['dark', 'light']) {
    for (const [name, width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height } })
      const page = await context.newPage()
      await page.addInitScript(({ theme }) => {
        localStorage.setItem('pokemon-theme-preference', theme)
        localStorage.setItem('top-cut-first-launch-dismissed', 'true')
        localStorage.setItem('top-cut-intro-last-shown', String(Date.now()))
        localStorage.setItem('pokemon-decks', JSON.stringify({
          schemaVersion: 1,
          data: [{ id: 1, name: 'Dragapult Dusknoir', decklist: '1 Dragapult ex TWM 130', archetype: 'Dragapult', variant: 'Dragapult Dusknoir', comfort: 4 }],
        }))
        localStorage.setItem('pokemon-events', JSON.stringify({
          schemaVersion: 1,
          data: [{ id: 1, eventName: 'League Cup', eventType: 'league-cup', format: 'TEF-CRI', deck: 'Dragapult Dusknoir', playerCount: 32 }],
        }))
        localStorage.setItem('pokemon-matches', JSON.stringify({
          schemaVersion: 1,
          data: [
            { id: 1, eventName: 'League Cup', eventType: 'league-cup', round: 1, format: 'TEF-CRI', deck: 'Dragapult Dusknoir', opponentDeck: 'Gardevoir', matchType: 'BO3', games: ['W','L','W'], gameStarts: ['1st','2nd','1st'], finalResult: '2-1' },
            { id: 2, eventName: 'League Cup', eventType: 'league-cup', round: 2, format: 'TEF-CRI', deck: 'Dragapult Dusknoir', opponentDeck: 'Charizard', matchType: 'BO3', games: [], gameStarts: [], finalResult: '0-0', alternateOutcome: 'intentionalDraw' },
            { id: 3, eventName: 'League Cup', eventType: 'league-cup', round: 3, format: 'TEF-CRI', deck: 'Dragapult Dusknoir', opponentDeck: '', matchType: 'BO3', games: [], gameStarts: [], finalResult: '0-0', alternateOutcome: 'bye' },
          ],
        }))
      }, { theme })
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'History' }).click()
      await page.getByRole('button', { name: /Show rounds/ }).click()
      await page.waitForTimeout(400)
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      if (overflow) throw new Error(`${name}/${theme} has horizontal overflow`)
      await page.screenshot({
        path: path.join(output, `${name}-${theme}.png`),
        fullPage: true,
      })
      await context.close()
    }
  }
  console.log(`Responsive match-history QA passed; screenshots: ${output}`)
} finally {
  await browser.close()
  server.kill()
}
