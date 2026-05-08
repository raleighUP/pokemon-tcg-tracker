import { Deck } from '@/types'

type Props = {
  decks: Deck[]
  setSelectedDeck: (deck: Deck) => void
  editDeck: (deck: Deck) => void
  deleteDeck: (id: number) => void
}

export default function SavedDecks({
  decks,
  setSelectedDeck,
  editDeck,
  deleteDeck,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-4">
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
              className="bg-slate-800 rounded-xl p-4 flex items-center justify-between"
            >
              <button
                onClick={() => setSelectedDeck(deck)}
                className="text-left font-medium hover:text-yellow-400 transition"
              >
                {deck.name}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => editDeck(deck)}
                  className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-lg text-sm font-medium"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteDeck(deck.id)}
                  className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}