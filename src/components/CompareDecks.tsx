type Change = {
  cardName: string
  diff: number
  oldQty: number
  newQty: number
}

import { Deck } from '@/types'
import {
  EmptyState,
  Panel,
  SectionHeader,
  SelectField,
} from '@/components/ui'

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
    <Panel className="shrink-0">
      <SectionHeader
        title="Compare Decks"
        className="mb-4"
      />

      <div className="space-y-4">
        {/* DECK 1 */}
        <SelectField
          value={compareDeck1}
          onChange={(e) =>
            setCompareDeck1(e.target.value)
          }
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
        </SelectField>

        {/* DECK 2 */}
        <SelectField
          value={compareDeck2}
          onChange={(e) =>
            setCompareDeck2(e.target.value)
          }
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
        </SelectField>
      </div>
    </Panel>

    {/* DIFFERENCES PANEL */}
    <Panel className="flex-1 overflow-hidden">
  <SectionHeader
    title="Deck Differences"
    className="mb-4"
  />

  <div className="h-[calc(100vh-400px)] overflow-y-auto pr-2 space-y-2">
    {changes.length === 0 ? (
      <EmptyState>
        No differences found.
      </EmptyState>
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
</Panel>
  </div>
) }
