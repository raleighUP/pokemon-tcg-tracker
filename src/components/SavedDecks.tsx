import { Deck } from '@/types'
import {
  Button,
  EmptyState,
  Panel,
  SectionHeader,
  StatusBadge,
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
                className={`rounded-xl border p-4 transition duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                    : 'border-slate-700 bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer text-left"
                    onClick={() => setSelectedDeck(deck)}
                  >
                    <p className="truncate font-semibold text-white transition duration-200 hover:text-yellow-400">
                      {deck.name}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-400">
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
                      className="rounded-lg px-3"
                    >
                      Edit
                    </Button>

                    <Button
                      onClick={() => deleteDeck(deck.id)}
                      tone="danger"
                      size="sm"
                      className="rounded-lg bg-red-500 px-3 text-white hover:bg-red-600"
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
