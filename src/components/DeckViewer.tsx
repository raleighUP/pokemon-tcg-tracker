import { Deck } from '@/types'

type Props = {
  selectedDeck: Deck | null
}

export default function DeckViewer({
  selectedDeck,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full">
      <h2 className="text-2xl font-bold mb-4">
        Deck Viewer
      </h2>

      {selectedDeck ? (
        <div>
          <h3 className="text-xl font-bold text-yellow-400 mb-4">
            {selectedDeck.name}
          </h3>

          <pre className="whitespace-pre-wrap text-slate-300 bg-slate-800 rounded-xl p-4 overflow-auto">
            {selectedDeck.decklist}
          </pre>
        </div>
      ) : (
        <p className="text-slate-400">
          Select a deck to view its decklist.
        </p>
      )}
    </div>
  )
}