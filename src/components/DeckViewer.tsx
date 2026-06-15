import { Deck } from '@/types'
import { EmptyState, Panel, SectionHeader } from '@/components/ui'

type Props = {
  selectedDeck: Deck | null
}

export default function DeckViewer({
  selectedDeck,
}: Props) {
  return (
    <Panel className="h-full">
      <SectionHeader
        title="Deck Viewer"
        className="mb-4"
      />

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
        <EmptyState>
          Select a deck to view its decklist.
        </EmptyState>
      )}
    </Panel>
  )
}
