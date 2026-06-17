import { Deck } from '@/types'
import { useState } from 'react'
import {
  ContextActionSheet,
  DisclosurePanel,
  EmptyState,
  MetricTile,
  NestedPanel,
  SectionHeader,
  SelectField,
  StatusBadge,
  SwipeActionRow,
  cn,
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
  const [detailChange, setDetailChange] =
    useState<Change | null>(null)

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
      <section className="space-y-4">
        <SectionHeader
          title="Compare"
        />

        <NestedPanel variant="compact" className="rounded-[18px] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <StatusBadge className="bg-[rgba(23,107,181,0.15)] text-[#b7dcfb]">
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

        <div className="max-h-[clamp(12rem,calc(100dvh-25rem),34rem)] space-y-2 overflow-y-auto pr-1">
          {changes.length === 0 ? (
            <EmptyState className="py-3">
              {emptyStateMessage}
            </EmptyState>
          ) : (
            changes.map((change) => (
              <SwipeActionRow
                key={change.cardName}
                open={false}
                onOpenChange={() => undefined}
                actions={[]}
                onContextOpen={() => setDetailChange(change)}
              >
                <button
                  type="button"
                  onClick={() => setDetailChange(change)}
                  className="motion-press card-row flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-white/[0.055]"
                >
                  <span className="min-w-0">
                    <span className="type-card-title block truncate text-[var(--text-primary)]">
                      {change.cardName}
                    </span>
                    <span className="type-metadata mt-0.5 block text-[var(--text-muted)]">
                      {change.oldQty} to {change.newQty}
                    </span>
                  </span>

                  <span
                    className={cn(
                      'type-metric-value shrink-0 rounded-full px-2.5 py-1',
                      change.diff > 0
                        ? 'bg-[rgba(47,116,59,0.16)] text-[#b8dfbe]'
                        : 'bg-[rgba(160,24,24,0.16)] text-[#e9b6b6]'
                    )}
                  >
                    {change.diff > 0 ? `+${change.diff}` : change.diff}
                  </span>
                </button>
              </SwipeActionRow>
            ))
          )}
        </div>
      </section>

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

      <ContextActionSheet
        open={Boolean(detailChange)}
        onClose={() => setDetailChange(null)}
        title={detailChange?.cardName ?? 'Card Difference'}
        subtitle={
          compareDeck1 && compareDeck2
            ? `${compareDeck1} to ${compareDeck2}`
            : undefined
        }
        ariaLabel="card difference details"
        details={
          detailChange
            ? [
                { label: compareDeck1 || 'Deck A', value: detailChange.oldQty },
                { label: compareDeck2 || 'Deck B', value: detailChange.newQty },
                {
                  label: 'Change',
                  value:
                    detailChange.diff > 0
                      ? `+${detailChange.diff}`
                      : detailChange.diff,
                },
              ]
            : []
        }
      />
    </div>
  )
}
