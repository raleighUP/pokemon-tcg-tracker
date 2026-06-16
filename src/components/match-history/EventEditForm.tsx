import { Deck } from '@/types'
import {
  Button,
  FieldLabel,
  NestedPanel,
  SelectField,
  StatusBadge,
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
    <NestedPanel className="m-4 space-y-4 rounded-2xl border-white/10 bg-white/[0.035]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <StatusBadge className="bg-blue-500/15 text-blue-200">
            Edit Event
          </StatusBadge>
          <h3 className="type-section-title mt-2 text-[var(--text-primary)]">
            Event Summary
          </h3>
        </div>
      </div>

      <div>
        <FieldLabel>Event Name</FieldLabel>
        <TextInput
          defaultValue={eventName}
          id={`event-name-${eventName}`}
          aria-label="Event name"
          placeholder="Event Name"
          enterKeyHint="next"
        />
      </div>

      <div>
        <FieldLabel>Format</FieldLabel>
        <TextInput
          defaultValue={initialFormat}
          id={`event-format-${eventName}`}
          aria-label="Format"
          placeholder="Format"
          enterKeyHint="next"
        />
      </div>

      <div>
        <FieldLabel>Deck</FieldLabel>
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
      </div>

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
          className="min-h-[52px] flex-1 rounded-2xl bg-green-500 hover:bg-green-400"
        >
          Save Event
        </Button>

        <Button
          onClick={onCancel}
          tone="secondary"
          className="min-h-[52px] flex-1 rounded-2xl bg-white/8 text-[var(--text-secondary)] hover:bg-white/12 hover:text-white"
        >
          Cancel
        </Button>
      </div>
    </NestedPanel>
  )
}
