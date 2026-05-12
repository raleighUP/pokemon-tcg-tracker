import { useState } from 'react'

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
  const [expanded, setExpanded] = useState(false)
  const collapsedRows = 6

  return (
    <>
      {/* ADD DECK */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4">
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
  onChange={(e) => {
    setDecklist(e.target.value)

    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }}
  placeholder="Paste decklist here..."
  rows={expanded ? decklist.split('\n').length + 2 : collapsedRows}
  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-yellow-400 resize-none overflow-hidden transition-all"
/>

          <div className="grid grid-cols-2 gap-2">
            <button
  onClick={() => setExpanded(!expanded)}
  className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition"
>
  {expanded ? 'Collapse List' : 'Expand List'}
</button>

            <button
              onClick={addDeck}
              className="bg-yellow-400 text-black font-semibold py-3 rounded-xl hover:scale-[1.02] transition"
            >
              {editingDeckId !== null
                ? 'Update Deck'
                : 'Save Deck'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}