type Change = {
  cardName: string
  diff: number
  oldQty: number
  newQty: number
}

import { Deck } from '@/types'

type Props = {
  compareDeck1: string
  setCompareDeck1: (value: string) => void
  compareDeck2: string
  setCompareDeck2: (value: string) => void
  decks: Deck[]
  changes: Change[]
}

export default function CompareDecks({
  compareDeck1,
  setCompareDeck1,
  compareDeck2,
  setCompareDeck2,
  decks,
  changes,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-4">
        Compare Decks
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <select
          value={compareDeck1}
          onChange={(e) => setCompareDeck1(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        >
          <option value="">Select Deck A</option>

          {decks.map((deck) => (
            <option key={deck.id} value={deck.name}>
              {deck.name}
            </option>
          ))}
        </select>

        <select
          value={compareDeck2}
          onChange={(e) => setCompareDeck2(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        >
          <option value="">Select Deck B</option>

          {decks.map((deck) => (
            <option key={deck.id} value={deck.name}>
              {deck.name}
            </option>
          ))}
        </select>
      </div>

      {compareDeck1 && compareDeck2 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-4">
            Deck Differences
          </h3>

          {changes.length === 0 ? (
            <p className="text-slate-400">
              Decks are identical.
            </p>
          ) : (
            <div className="space-y-3">
              {changes.map((change) => (
                <div
                  key={change.cardName}
                  className="bg-slate-700 rounded-lg px-4 py-3 flex justify-between"
                >
                  <span>{change.cardName}</span>

                  <span
                    className={`font-semibold ${
                      change.diff > 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {change.diff > 0 ? '+' : ''}
                    {change.diff}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}