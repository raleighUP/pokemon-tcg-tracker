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
    ['reflow-320', 320, 640],
    ['iphone-se', 375, 667],
    ['iphone-pro-max', 430, 932],
    ['tablet', 768, 1024],
    ['desktop', 1280, 900],
  ]
  for (const theme of ['dark', 'light']) {
    for (const [name, width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height } })
      const page = await context.newPage()
      await page.addInitScript(({ shareAvailable }) => {
          Object.defineProperty(navigator, 'share', {
            configurable: true,
            value: shareAvailable ? async () => undefined : undefined,
          })
        }, { shareAvailable: theme === 'dark' })
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
          data: [{ id: 1, eventName: 'Midwest Regional Championship', eventType: 'league-cup', format: 'TEF-CRI', deck: 'Dragapult Dusknoir', playerCount: 32 }],
        }))
        localStorage.setItem('pokemon-matches', JSON.stringify({
          schemaVersion: 1,
          data: [
            { id: 1, eventName: 'Midwest Regional Championship', eventType: 'league-cup', round: 1, format: 'TEF-CRI', deck: 'Dragapult Dusknoir', opponentDeck: 'Gardevoir', matchType: 'BO3', games: ['W','L','W'], gameStarts: ['1st','2nd','1st'], finalResult: '2-1' },
            { id: 2, eventName: 'Midwest Regional Championship', eventType: 'league-cup', round: 2, format: 'TEF-CRI', deck: 'Dragapult Dusknoir', opponentDeck: 'Charizard', matchType: 'BO3', games: [], gameStarts: [], finalResult: '0-0', alternateOutcome: 'intentionalDraw' },
            { id: 3, eventName: 'Midwest Regional Championship', eventType: 'league-cup', round: 3, format: 'TEF-CRI', deck: 'Dragapult Dusknoir', opponentDeck: '', matchType: 'BO3', games: [], gameStarts: [], finalResult: '0-0', alternateOutcome: 'bye' },
          ],
        }))
      }, { theme })
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'History' }).click()
      await page.getByRole('button', { name: /Show rounds/ }).click()
      await page.waitForTimeout(400)

      if (name === 'reflow-320') {
        await page.getByRole('button', { name: 'Next Round' }).click()
        const dialog = page.getByRole('dialog', { name: 'Round 4' })
        await dialog.waitFor()
        const matchFormat = dialog.getByRole('radiogroup', { name: 'Match format' })
        const bo1 = matchFormat.getByRole('radio', { name: 'BO1' })
        const bo3 = matchFormat.getByRole('radio', { name: 'BO3' })
        if ((await bo1.getAttribute('aria-checked')) !== 'true') {
          throw new Error(`${theme}: new round did not default to BO1`)
        }
        await bo1.focus()
        await bo1.press('ArrowRight')
        if ((await bo3.getAttribute('aria-checked')) !== 'true') {
          throw new Error(`${theme}: BO1/BO3 arrow-key selection failed`)
        }

        const gameResultsTop = (await dialog.getByText('Game 1').boundingBox())?.y
        const alternateTop = (await dialog.getByText('Alternate outcome').boundingBox())?.y
        const notesTop = (await dialog.getByLabel('Notes').boundingBox())?.y
        if (
          gameResultsTop === undefined ||
          alternateTop === undefined ||
          notesTop === undefined ||
          !(gameResultsTop < alternateTop && alternateTop < notesTop)
        ) {
          throw new Error(`${theme}: Match Logger visual order is incorrect`)
        }

        await dialog.getByRole('button', { name: 'ID' }).click()
        if (await matchFormat.isVisible()) {
          throw new Error(`${theme}: alternate outcome did not suppress game entry`)
        }
        await dialog.getByRole('button', { name: 'Close Round 4' }).nth(1).click()
        await dialog.waitFor({ state: 'hidden' })
      }

      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      if (overflow) throw new Error(`${name}/${theme} has horizontal overflow`)
      const eventTitleWidth = (await page.getByText('Midwest Regional Championship').boundingBox())?.width ?? 0
      if (eventTitleWidth < 88) {
        throw new Error(`${name}/${theme} event title column is too narrow`)
      }
      await page.screenshot({
        path: path.join(output, `${name}-${theme}.png`),
        fullPage: true,
      })

      if (name === 'reflow-320') {
        await page.getByRole('button', { name: 'Decks' }).click()
        await page.getByRole('button', { name: /Dragapult Dusknoir/ }).first().click()
        const deckDialog = page.getByRole('dialog', { name: 'Dragapult Dusknoir' })
        await deckDialog.waitFor()

        const groupedSpriteImages = deckDialog.locator('[aria-hidden="true"] img')
        const spriteCount = await groupedSpriteImages.count()
        if (spriteCount < 1) throw new Error(`${theme}: deck identity sprites were not rendered`)
        for (let index = 0; index < spriteCount; index++) {
          if ((await groupedSpriteImages.nth(index).getAttribute('alt')) !== '') {
            throw new Error(`${theme}: grouped sprite image is not decorative`)
          }
        }

        await deckDialog.getByRole('status').waitFor()
        const expectedExportLabel = theme === 'dark' ? 'Share list' : 'Download list'
        await deckDialog.getByRole('button', { name: expectedExportLabel }).waitFor()
        if (theme === 'dark') {
          await deckDialog.getByRole('button', { name: 'Share list' }).click()
          await deckDialog.getByText('Deck list shared').waitFor()
        }
      }
      await context.close()
    }
  }
  console.log(`Responsive match-history QA passed; screenshots: ${output}`)
} finally {
  await browser.close()
  server.kill()
}
