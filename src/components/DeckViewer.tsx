import { Deck } from '@/types'
import {
  EmptyState,
  MetricTile,
  NestedPanel,
  SectionHeader,
  StatusBadge,
} from '@/components/ui'

type Props = {
  selectedDeck: Deck | null
}

export default function DeckViewer({
  selectedDeck,
}: Props) {
  const cardLineCount = selectedDeck
    ? selectedDeck.decklist
        .split('\n')
        .filter((line) => line.trim()).length
    : 0

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Selected Deck"
      />

      {selectedDeck ? (
        <div className="space-y-4">
          <NestedPanel variant="glass" className="card-hero rounded-[18px] p-4">
            <StatusBadge className="bg-[rgba(23,107,181,0.15)] text-[#d7ebff]">
              Selected Deck
            </StatusBadge>

            <h3 className="mt-3 truncate text-[1.7rem] font-[760] leading-tight text-[var(--text-primary)]">
              {selectedDeck.name}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MetricTile
                label="Archetype"
                value={selectedDeck.archetype || 'Other'}
              />
              <MetricTile
                label="Lines"
                value={cardLineCount}
              />
            </div>
          </NestedPanel>

          <NestedPanel className="rounded-[18px] p-0">
            <div className="border-b border-[var(--divider)] px-4 py-3">
              <p className="type-card-title text-[var(--text-primary)]">
                Decklist
              </p>
              <p className="type-metadata mt-1 text-[var(--text-subtle)]">
                Saved card export
              </p>
            </div>

            <pre className="max-h-[clamp(16rem,calc(100dvh-28rem),34rem)] overflow-auto whitespace-pre-wrap p-4 font-mono text-sm leading-6 text-[var(--text-secondary)]">
              {selectedDeck.decklist}
            </pre>
          </NestedPanel>
        </div>
      ) : (
        <EmptyState>
          Select a deck to view its decklist.
        </EmptyState>
      )}
    </section>
  )
}
