import { Deck } from '@/types'
import {
  Button,
  NestedPanel,
  SelectField,
  TextInput,
} from '@/components/ui'

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
    <NestedPanel className="mb-4 space-y-3 border-slate-700 bg-slate-900">
      <TextInput
        defaultValue={eventName}
        id={`event-name-${eventName}`}
        aria-label="Event name"
        placeholder="Event Name"
      />

      <TextInput
        defaultValue={initialFormat}
        id={`event-format-${eventName}`}
        aria-label="Format"
        placeholder="Format"
      />

      <SelectField
        defaultValue={initialDeck}
        id={`event-deck-${eventName}`}
        aria-label="Event deck"
      >
        {decks.map((deck) => (
          <option key={deck.id} value={deck.name}>
            {deck.name}
          </option>
        ))}
      </SelectField>

      <div className="flex gap-2">
        <Button
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
          tone="success"
          className="flex-1"
        >
          Save Event
        </Button>

        <Button
          onClick={onCancel}
          tone="secondary"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </NestedPanel>
  )
}
