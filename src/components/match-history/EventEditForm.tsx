import { Deck } from '@/types'
import { useState } from 'react'
import {
  Button,
  FieldLabel,
  NestedPanel,
  SelectField,
  StatusBadge,
  TextInput,
} from '@/components/ui'
import {
  TOURNAMENT_TYPE_OPTIONS,
  getTournamentTypeLabel,
} from '@/utils/tournament'
import DeckSelectField from '@/components/DeckSelectField'

type Props = {
  eventName: string
  initialEventType?: string
  initialFormat?: string
  initialDeck?: string
  decks: Deck[]
  onSave: (
    oldEventName: string,
    updatedData: {
      eventName: string
      eventType: string
      format: string
      deck: string
    }
  ) => void
  onCancel: () => void
}

export default function EventEditForm({
  eventName,
  initialFormat,
  initialEventType,
  initialDeck,
  decks,
  onSave,
  onCancel,
}: Props) {
  const [selectedDeckName, setSelectedDeckName] = useState(initialDeck ?? '')

  return (
    <NestedPanel className="m-4 space-y-4 rounded-2xl border-white/10 bg-white/[0.035]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <StatusBadge className="bg-[rgba(23,107,181,0.15)] text-[#b7dcfb]">
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
        <FieldLabel>Event Type</FieldLabel>
        <SelectField
          defaultValue={initialEventType}
          id={`event-type-${eventName}`}
          aria-label="Event type"
        >
          <option value="">Event Type</option>
          {initialEventType &&
            !TOURNAMENT_TYPE_OPTIONS.some(
              (option) => option.value === initialEventType
            ) && (
              <option value={initialEventType}>
                {getTournamentTypeLabel(initialEventType)}
              </option>
            )}
          {TOURNAMENT_TYPE_OPTIONS.map((eventType) => (
            <option key={eventType.value} value={eventType.value}>
              {eventType.label}
            </option>
          ))}
        </SelectField>
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
        <DeckSelectField
          decks={decks}
          placeholder="Event deck"
          value={selectedDeckName}
          onChange={(event) => setSelectedDeckName(event.target.value)}
          id={`event-deck-${eventName}`}
          aria-label="Event deck"
        />
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

            const updatedEventType = (
              document.getElementById(
                `event-type-${eventName}`
              ) as HTMLSelectElement
            ).value

            const updatedDeck = selectedDeckName

            onSave(eventName, {
              eventName: updatedEventName,
              eventType: updatedEventType,
              format: updatedFormat,
              deck: updatedDeck,
            })
          }}
          tone="primary"
          className="min-h-[52px] flex-1 rounded-2xl"
        >
          Save Event
        </Button>

        <Button
          onClick={onCancel}
          tone="secondary"
          className="min-h-[52px] flex-1 rounded-2xl"
        >
          Cancel
        </Button>
      </div>
    </NestedPanel>
  )
}
