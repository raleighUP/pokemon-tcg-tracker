import { Deck } from '@/types'

type Props = {
  eventName: string
  initialFormat?: string
  initialDeck?: string
  decks: Deck[]
  onSave: (
    oldEventName: string,
    updatedData: {
      eventName: string
      format: string
      deck: string
    }
  ) => void
  onCancel: () => void
}

export default function EventEditForm({
  eventName,
  initialFormat,
  initialDeck,
  decks,
  onSave,
  onCancel,
}: Props) {
  return (
    <div className="bg-slate-900 rounded-xl p-4 mb-4 border border-slate-700 space-y-3">
      <input
        type="text"
        defaultValue={eventName}
        id={`event-name-${eventName}`}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        placeholder="Event Name"
      />

      <input
        type="text"
        defaultValue={initialFormat}
        id={`event-format-${eventName}`}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        placeholder="Format"
      />

      <select
        defaultValue={initialDeck}
        id={`event-deck-${eventName}`}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
      >
        {decks.map((deck) => (
          <option key={deck.id} value={deck.name}>
            {deck.name}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <button
          onClick={() => {
            const updatedEventName = (
              document.getElementById(
                `event-name-${eventName}`
              ) as HTMLInputElement
            ).value

            const updatedFormat = (
              document.getElementById(
                `event-format-${eventName}`
              ) as HTMLInputElement
            ).value

            const updatedDeck = (
              document.getElementById(
                `event-deck-${eventName}`
              ) as HTMLSelectElement
            ).value

            onSave(eventName, {
              eventName: updatedEventName,
              format: updatedFormat,
              deck: updatedDeck,
            })
          }}
          className="flex-1 bg-green-500 hover:bg-green-600 py-3 rounded-xl font-semibold transition"
        >
          Save Event
        </button>

        <button
          onClick={onCancel}
          className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
