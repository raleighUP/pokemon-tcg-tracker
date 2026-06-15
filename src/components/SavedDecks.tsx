import { Deck } from '@/types'
import {
  Button,
  EmptyState,
  Panel,
  SectionHeader,
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
          {decks.map((deck) => (
            <div
              key={deck.id}
              className={`rounded-xl p-4 border transition-all duration-200 ${
                selectedDeck?.id === deck.id
                  ? 'bg-blue-500/10 border-blue-500 scale-[1.02] shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                
                {/* LEFT SIDE */}
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setSelectedDeck(deck)}
                >
                  <div>
  <p className="font-semibold text-white hover:text-yellow-400 transition">
    {deck.name}
  </p>

  <p className="text-xs text-slate-400">
    {deck.variant || deck.archetype || 'Other'}
  </p>
</div>

                  {selectedDeck?.id === deck.id && (
                    <p className="text-blue-400 text-sm font-semibold animate-pulse">
                      Viewing ↓
                    </p>
                  )}
                </div>

                {/* RIGHT SIDE */}
                <div className="flex gap-2 shrink-0">
                  <Button
                    onClick={() => editDeck(deck)}
                    tone="primary"
                    className="rounded-lg px-3 py-1"
                  >
                    Edit
                  </Button>

                  <Button
                    onClick={() => deleteDeck(deck.id)}
                    tone="danger"
                    className="rounded-lg bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                  >
                    Delete
                  </Button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
