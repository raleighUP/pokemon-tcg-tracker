import { Deck } from '@/types'

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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4">
        Saved Decks
      </h2>

      {decks.length === 0 ? (
        <p className="text-slate-400">
          No decks saved yet.
        </p>
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
                  <p className="font-semibold text-white hover:text-yellow-400 transition">
                    {deck.name}
                  </p>

                  {selectedDeck?.id === deck.id && (
                    <p className="text-blue-400 text-sm font-semibold animate-pulse">
                      Viewing ↓
                    </p>
                  )}
                </div>

                {/* RIGHT SIDE */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => editDeck(deck)}
                    className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-lg text-sm font-semibold"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteDeck(deck.id)}
                    className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm font-semibold"
                  >
                    Delete
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}