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
  <div className="flex flex-col h-[calc(100vh-90px)] gap-4">
    
    {/* TOP CONTROLS */}
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shrink-0">
      <h2 className="text-2xl font-bold mb-4">
        Compare Decks
      </h2>

      <div className="space-y-4">
        {/* DECK 1 */}
        <select
          value={compareDeck1}
          onChange={(e) =>
            setCompareDeck1(e.target.value)
          }
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        >
          <option value="">Select Deck A</option>

          {decks.map((deck) => (
            <option
              key={deck.id}
              value={deck.name}
            >
              {deck.name}
            </option>
          ))}
        </select>

        {/* DECK 2 */}
        <select
          value={compareDeck2}
          onChange={(e) =>
            setCompareDeck2(e.target.value)
          }
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        >
          <option value="">Select Deck B</option>

          {decks.map((deck) => (
            <option
              key={deck.id}
              value={deck.name}
            >
              {deck.name}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* DIFFERENCES PANEL */}
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1 overflow-hidden">
  <h2 className="text-2xl font-bold mb-4">
    Deck Differences
  </h2>

  <div className="h-[calc(100vh-400px)] overflow-y-auto pr-2 space-y-2">
    {changes.length === 0 ? (
      <p className="text-slate-400">
        No differences found.
      </p>
    ) : (
      changes.map((change) => (
        <div
          key={change.cardName}
          className="bg-slate-800 rounded-xl px-4 py-3 flex justify-between items-center"
        >
          <div>
            <p className="font-semibold">
              {change.cardName}
            </p>

            <p className="text-sm text-slate-400">
              {change.oldQty} → {change.newQty}
            </p>
          </div>

          <p
            className={`font-bold ${
              change.diff > 0
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {change.diff > 0
              ? `+${change.diff}`
              : change.diff}
          </p>
        </div>
      ))
    )}
  </div>
</div>
  </div>
) }