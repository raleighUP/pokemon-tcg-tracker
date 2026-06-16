import { useState } from 'react'
import { Deck, Match } from '@/types'
import {
  EmptyState,
  Panel,
  SectionHeader,
} from '@/components/ui'
import EventHistoryCard from './match-history/EventHistoryCard'

type Props = {
  matches: Match[]

  deleteMatch: (id: number) => void
  deleteEvent: (eventName: string) => void

  editMatch: (match: Match) => void

  editEvent: (
    oldEventName: string,
    updatedData: {
      eventName: string
      format: string
      deck: string
    }
  ) => void

  editingMatch: Match | null
  setEditingMatch: (match: Match | null) => void

  editingEvent: string | null
  setEditingEvent: (value: string | null) => void

  decks: Deck[]
}

export default function MatchHistory({
  matches,
  deleteMatch,
  deleteEvent,
  editMatch,
  editEvent,
  editingMatch,
  setEditingMatch,
  editingEvent,
  setEditingEvent,
  decks,
}: Props) {
  const [openMenuId, setOpenMenuId] =
    useState<number | null>(null)

  const [openNotesId, setOpenNotesId] =
    useState<number | null>(null)

  const [collapsedEvents, setCollapsedEvents] = useState<
    Record<string, boolean>
  >({})

  const isRoundValid =
    editingMatch?.round !== undefined &&
    editingMatch?.round !== null &&
    String(editingMatch.round).trim() !== '' &&
    !isNaN(Number(editingMatch.round)) &&
    Number(editingMatch.round) > 0

  const isFormValid = isRoundValid

  if (matches.length === 0) {
    return (
      <Panel>
        <SectionHeader
          title="Match History"
          description="Review event records, round outcomes, and notes."
          className="mb-4"
        />

        <EmptyState>
          No matches logged yet.
        </EmptyState>
      </Panel>
    )
  }

  const groupedMatches = matches.reduce<Record<string, Match[]>>(
    (acc, match) => {
      if (!acc[match.eventName]) {
        acc[match.eventName] = []
      }

      acc[match.eventName].push(match)

      return acc
    },
    {}
  )

  return (
    <Panel>
      <SectionHeader
        title="Match History"
        description="Review event records, round outcomes, and notes."
        className="mb-4"
      />

      <div className="space-y-4">
        {Object.entries(groupedMatches)
          .reverse()
          .map(([eventName, eventMatches], index) => (
            <EventHistoryCard
              key={eventName}
              eventName={eventName}
              matches={eventMatches}
              decks={decks}
              editingEvent={editingEvent}
              editingMatch={editingMatch}
              openMenuId={openMenuId}
              openNotesId={openNotesId}
              isRoundValid={isRoundValid}
              isFormValid={isFormValid}
              isCollapsed={
                collapsedEvents[eventName] ?? index > 0
              }
              toggleCollapsed={() => {
                setCollapsedEvents((currentCollapsedEvents) => ({
                  ...currentCollapsedEvents,
                  [eventName]: !(
                    currentCollapsedEvents[eventName] ?? index > 0
                  ),
                }))
              }}
              setEditingEvent={setEditingEvent}
              setEditingMatch={setEditingMatch}
              setOpenMenuId={setOpenMenuId}
              setOpenNotesId={setOpenNotesId}
              editEvent={editEvent}
              editMatch={editMatch}
              deleteEvent={deleteEvent}
              deleteMatch={deleteMatch}
            />
          ))}
      </div>
    </Panel>
  )
}
