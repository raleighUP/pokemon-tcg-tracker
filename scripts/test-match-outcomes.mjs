import assert from 'node:assert/strict'
import {
  getEventRecord,
  getMatchDisplayResult,
  getRoundResult,
} from '../src/utils/match-results.ts'

const match = (games, alternateOutcome) => ({
  id: 1,
  eventName: 'Test Event',
  round: 1,
  format: 'Standard',
  deck: 'Deck',
  opponentDeck: alternateOutcome === 'bye' ? '' : 'Opponent',
  matchType: 'BO3',
  games,
  gameStarts: [],
  finalResult: '',
  alternateOutcome,
})

for (const [games, result, display] of [
  [['W', 'W'], 'W', '2–0'],
  [['W', 'L', 'W'], 'W', '2–1'],
  [['W', 'L', 'L'], 'L', '1–2'],
  [['L', 'L'], 'L', '0–2'],
  [['W', 'L', 'T'], 'T', '1–1–1'],
]) {
  assert.equal(getRoundResult(match(games)), result)
  assert.equal(getMatchDisplayResult(match(games)), display)
}

const intentionalDraw = match([], 'intentionalDraw')
const noShow = match([], 'noShow')
const bye = match([], 'bye')
assert.equal(getRoundResult(intentionalDraw), 'T')
assert.equal(getMatchDisplayResult(intentionalDraw), 'ID')
assert.equal(getRoundResult(noShow), 'W')
assert.equal(getMatchDisplayResult(noShow), 'No Show')
assert.equal(getRoundResult(bye), 'W')
assert.equal(getMatchDisplayResult(bye), 'Bye')
assert.deepEqual(getEventRecord([
  match(['W', 'W']),
  match(['L', 'L']),
  intentionalDraw,
  noShow,
  bye,
]), { wins: 3, losses: 1, draws: 1, label: '3–1–1' })
assert.equal(noShow.games.length, 0)
assert.equal(bye.games.length, 0)
assert.equal(bye.opponentDeck, '')

console.log('Match outcomes and event record: pass')
