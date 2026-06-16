import { Deck } from '@/types'
import { useState } from 'react'
import {
  DeltaRow,
  DisclosurePanel,
  EmptyState,
  MetricTile,
  NestedPanel,
  Panel,
  SectionHeader,
  SelectField,
  StatusBadge,
} from '@/components/ui'

type Change = {
  cardName: string
  diff: number
  oldQty: number
  newQty: number
}

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
  const [setupOpen, setSetupOpen] = useState(
    !compareDeck1 || !compareDeck2
  )

  const emptyStateMessage =
    decks.length === 0
      ? 'Save decks before comparing decklists.'
      : !compareDeck1 || !compareDeck2
      ? 'Select two decks to compare.'
      : 'No differences found.'
  const hasSelection = Boolean(compareDeck1 && compareDeck2)
  const netChange = changes.reduce(
    (total, change) => total + Math.abs(change.diff),
    0
  )

  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader
          title="Deck Differences"
          description="Compare saved decklists and review card-level changes."
          className="mb-4"
        />

        <NestedPanel className="mb-4 rounded-[28px] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <StatusBadge className="bg-blue-500/15 text-blue-200">
                Compare
              </StatusBadge>
              <h3 className="type-section-title mt-2 truncate text-[var(--text-primary)]">
                {hasSelection
                  ? `${compareDeck1} vs ${compareDeck2}`
                  : 'Select two decks'}
              </h3>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MetricTile
              label="Changed Cards"
              value={changes.length}
            />
            <MetricTile
              label="Quantity Delta"
              value={netChange}
            />
          </div>
        </NestedPanel>

        <div className="max-h-[clamp(10rem,calc(100dvh-28rem),32rem)] space-y-2 overflow-y-auto pr-2">
          {changes.length === 0 ? (
            <EmptyState>{emptyStateMessage}</EmptyState>
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

      <DisclosurePanel
        title="Comparison Setup"
        description={
          compareDeck1 && compareDeck2
            ? `${compareDeck1} vs ${compareDeck2}`
            : 'Choose two decks'
        }
        open={setupOpen}
        onToggle={() => setSetupOpen((current) => !current)}
        contentClassName="space-y-4 border-t border-white/10 p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            value={compareDeck1}
            onChange={(e) =>
              setCompareDeck1(e.target.value)
            }
            aria-label="Select Deck A"
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
            aria-label="Select Deck B"
          >
            <option value="">Select Deck B</option>

            {decks.map((deck) => (
              <option key={deck.id} value={deck.name}>
                {deck.name}
              </option>
            ))}
          </SelectField>
        </div>
      </DisclosurePanel>
    </div>
  )
}
