import { Deck } from '@/types'
import {
  Button,
  EmptyState,
  Panel,
  SectionHeader,
  StatusBadge,
  cn,
} from '@/components/ui'

type Props = {
  decks: Deck[]
  setSelectedDeck: (deck: Deck) => void
  selectedDeck: Deck | null
  editDeck: (deck: Deck) => void
  deleteDeck: (id: number) => void
}

export default function SavedDecks({
  decks,
  setSelectedDeck,
  editDeck,
  deleteDeck,
  selectedDeck,
}: Props) {
  return (
    <Panel>
      <SectionHeader
        title="Saved Decks"
        description="Choose, edit, or remove saved tournament decks."
        className="mb-4"
      />

      {decks.length === 0 ? (
        <EmptyState>
          No decks saved yet.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {decks.map((deck) => {
            const isSelected = selectedDeck?.id === deck.id

            return (
              <div
                key={deck.id}
                className={cn(
                  'card-row motion-surface rounded-2xl p-4',
                  isSelected
                    ? 'border-blue-500/55 bg-blue-500/12 shadow-[0_16px_38px_rgba(23,107,181,0.13)]'
                    : ''
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="motion-press min-w-0 flex-1 cursor-pointer rounded-xl text-left"
                    onClick={() => setSelectedDeck(deck)}
                  >
                    <p className="type-card-title truncate text-[var(--text-primary)] hover:text-blue-200">
                      {deck.name}
                    </p>

                    <p className="type-metadata mt-1 truncate text-[var(--text-muted)]">
                      {deck.variant || deck.archetype || 'Other'}
                    </p>

                    {isSelected && (
                      <StatusBadge className="mt-2 bg-blue-500/15 text-blue-200">
                        Viewing
                      </StatusBadge>
                    )}
                  </button>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      onClick={() => editDeck(deck)}
                      tone="primary"
                      size="sm"
                      className="rounded-xl bg-white/10 px-3 text-[var(--text-secondary)] hover:bg-white/15 hover:text-white"
                    >
                      Edit
                    </Button>

                    <Button
                      onClick={() => deleteDeck(deck.id)}
                      tone="danger"
                      size="sm"
                      className="rounded-xl bg-red-500/80 px-3 text-white hover:bg-red-500"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
