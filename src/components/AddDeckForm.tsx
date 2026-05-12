import { useEffect, useRef, useState } from 'react'

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
  const [isExpanded, setIsExpanded] = useState(false)

  const textareaRef =
    useRef<HTMLTextAreaElement>(null)

  // AUTO RESIZE WHEN EXPANDED
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }

    // RESET HEIGHT WHEN COLLAPSED
    if (!isExpanded && textareaRef.current) {
      textareaRef.current.style.height = '140px'
    }
  }, [decklist, isExpanded])

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
            onChange={(e) =>
              setDeckName(e.target.value)
            }
            placeholder="Deck Name"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-yellow-400"
          />

          <textarea
            ref={textareaRef}
            value={decklist}
            onChange={(e) =>
              setDecklist(e.target.value)
            }
            placeholder="Paste decklist here..."
            rows={6}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-yellow-400 resize-none overflow-hidden transition-all duration-200"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                setIsExpanded(!isExpanded)
              }
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition"
            >
              {isExpanded
                ? 'Collapse List'
                : 'Expand List'}
            </button>

            <button
              onClick={() => {
                addDeck()

                setIsExpanded(false)

                if (textareaRef.current) {
                  textareaRef.current.style.height =
                    '140px'
                }
              }}
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