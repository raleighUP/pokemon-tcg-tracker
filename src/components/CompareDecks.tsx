type Change = {
  cardName: string
  diff: number
  oldQty: number
  newQty: number
}

import { Deck } from '@/types'
import {
  DeltaRow,
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
    <div className="flex h-[calc(100vh-90px)] flex-col gap-4">
      <Panel className="shrink-0">
        <SectionHeader
          title="Compare Decks"
          className="mb-4"
        />

        <div className="space-y-4">
          <SelectField
            value={compareDeck1}
            onChange={(e) =>
              setCompareDeck1(e.target.value)
            }
          >
            <option value="">Select Deck A</option>

            {decks.map((deck) => (
              <option key={deck.id} value={deck.name}>
                {deck.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            value={compareDeck2}
            onChange={(e) =>
              setCompareDeck2(e.target.value)
            }
          >
            <option value="">Select Deck B</option>

            {decks.map((deck) => (
              <option key={deck.id} value={deck.name}>
                {deck.name}
              </option>
            ))}
          </SelectField>
        </div>
      </Panel>

      <Panel className="flex-1 overflow-hidden">
        <SectionHeader
          title="Deck Differences"
          className="mb-4"
        />

        <div className="h-[calc(100vh-400px)] space-y-2 overflow-y-auto pr-2">
          {changes.length === 0 ? (
            <EmptyState>No differences found.</EmptyState>
          ) : (
            changes.map((change) => (
              <DeltaRow
                key={change.cardName}
                label={change.cardName}
                before={change.oldQty}
                after={change.newQty}
                diff={change.diff}
              />
            ))
          )}
        </div>
      </Panel>
    </div>
  )
}
