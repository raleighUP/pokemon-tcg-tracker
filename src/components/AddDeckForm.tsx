type Props = {
  deckName: string
  setDeckName: (value: string) => void
  decklist: string
  setDecklist: (value: string) => void
  addDeck: () => void
  editingDeckId: number | null
}

export default function AddDeckForm({
  deckName,
  setDeckName,
  decklist,
  setDecklist,
  addDeck,
  editingDeckId,
}: Props) {
  return (
    <>
      {/* ADD DECK */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Add Deck
              </h2>

              <div className="space-y-4">
                <input
                  type="text"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="Deck Name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-yellow-400"
                />

                <textarea
                  value={decklist}
                  onChange={(e) => setDecklist(e.target.value)}
                  placeholder="Paste decklist here..."
                  rows={12}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-yellow-400 resize-none"
                />

                <button
                  onClick={addDeck}
                  className="w-full bg-yellow-400 text-black font-semibold py-3 rounded-xl hover:scale-[1.02] transition"
                >
                  {editingDeckId !== null ? 'Update Deck' : 'Save Deck'}
                </button>
              </div>
            </div>
    </>
  )
}