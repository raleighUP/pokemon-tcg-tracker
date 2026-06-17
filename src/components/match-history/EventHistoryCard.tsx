import { Deck, Match } from '@/types'
import { useState } from 'react'
import {
  ContextActionSheet,
  DisclosureAction,
  DisclosureContent,
  NestedPanel,
  StatusBadge,
  SwipeActionRow,
  cn,
} from '@/components/ui'
import EventEditForm from './EventEditForm'
import RoundHistoryRow from './RoundHistoryRow'

type RoundResult = 'W' | 'L' | 'T'

type Props = {
  eventName: string
  matches: Match[]
  decks: Deck[]
  editingEvent: string | null
  editingMatch: Match | null
  openMenuId: number | null
  openNotesId: number | null
  isRoundValid: boolean
  isFormValid: boolean
  isCollapsed: boolean
  toggleCollapsed: () => void
  setEditingEvent: (value: string | null) => void
  setEditingMatch: (match: Match | null) => void
  setOpenMenuId: (id: number | null) => void
  setOpenNotesId: (id: number | null) => void
  editEvent: (
    oldEventName: string,
    updatedData: {
      eventName: string
      format: string
      deck: string
    }
  ) => void
  editMatch: (match: Match) => void
  deleteEvent: (eventName: string) => void
  deleteMatch: (id: number) => void
}

function getRoundResult(match: Match): RoundResult {
  const wins = match.games.filter((game) => game === 'W').length
  const losses = match.games.filter((game) => game === 'L').length

  if (wins > losses) return 'W'
  if (losses > wins) return 'L'

  return 'T'
}

export default function EventHistoryCard({
  eventName,
  matches,
  decks,
  editingEvent,
  editingMatch,
  openMenuId,
  openNotesId,
  isRoundValid,
  isFormValid,
  isCollapsed,
  toggleCollapsed,
  setEditingEvent,
  setEditingMatch,
  setOpenMenuId,
  setOpenNotesId,
  editEvent,
  editMatch,
  deleteEvent,
  deleteMatch,
}: Props) {
  const [eventSwipeOpen, setEventSwipeOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const sortedMatches = [...matches].sort((a, b) => a.round - b.round)
  const firstMatch = sortedMatches[0]

  if (!firstMatch) return null

  let totalWins = 0
  let totalLosses = 0
  let totalTies = 0

  sortedMatches.forEach((match) => {
    const roundResult = getRoundResult(match)

    if (roundResult === 'W') totalWins++
    else if (roundResult === 'L') totalLosses++
    else totalTies++
  })

  let runningWins = 0
  let runningLosses = 0
  let runningTies = 0

  const eventRecord = `${totalWins}-${totalLosses}${
    totalTies > 0 ? `-${totalTies}` : ''
  }`
  const eventWinRate =
    sortedMatches.length === 0
      ? 0
      : (totalWins / sortedMatches.length) * 100
  const notesCount = sortedMatches.filter((match) =>
    match.notes?.trim()
  ).length
  const recordToneClass =
    totalWins > totalLosses
      ? 'bg-[rgba(47,116,59,0.16)] text-[#b8dfbe] ring-[rgba(47,116,59,0.35)]'
      : totalLosses > totalWins
      ? 'bg-[rgba(160,24,24,0.16)] text-[#e9b6b6] ring-[rgba(160,24,24,0.35)]'
      : 'bg-[rgba(220,192,65,0.14)] text-[#f4e392] ring-[rgba(220,192,65,0.35)]'

  const startEventEdit = () => {
    setEditingEvent(eventName)
  }

  const confirmDeleteEvent = () => {
    if (window.confirm(`Delete ${eventName} and all of its rounds?`)) {
      deleteEvent(eventName)
    }
  }

  return (
    <>
      <SwipeActionRow
        open={eventSwipeOpen}
        onOpenChange={setEventSwipeOpen}
        onContextOpen={() => setContextOpen(true)}
        actions={[
          {
            label: 'Edit',
            tone: 'edit',
            onSelect: startEventEdit,
          },
          {
            label: 'Delete',
            tone: 'delete',
            onSelect: confirmDeleteEvent,
          },
        ]}
        className="rounded-2xl"
      >
        <NestedPanel variant="compact" className="overflow-hidden p-0">
          {editingEvent === eventName ? (
            <EventEditForm
              eventName={eventName}
              initialFormat={firstMatch?.format}
              initialDeck={firstMatch?.deck}
              decks={decks}
              onSave={(oldEventName, updatedData) => {
                editEvent(oldEventName, updatedData)
                setEditingEvent(null)
              }}
              onCancel={() => setEditingEvent(null)}
            />
          ) : (
            <div className="border-b border-white/10 bg-white/[0.025] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      className={cn(
                        'px-2.5 py-1 ring-1',
                        recordToneClass
                      )}
                    >
                      {eventRecord}
                    </StatusBadge>

                    <span className="type-metadata text-[var(--text-muted)]">
                      {sortedMatches.length} rounds
                    </span>
                  </div>

                  <h3 className="truncate text-[1.1rem] font-[760] leading-tight text-white">
                    {eventName}
                  </h3>

                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="type-card-title max-w-full truncate text-[var(--text-secondary)]">
                      {firstMatch?.deck}
                    </span>
                    <span className="type-metadata text-[var(--text-muted)]">
                      {firstMatch?.format}
                    </span>
                    {notesCount > 0 && (
                      <span className="type-metadata text-[var(--text-muted)]">
                        {notesCount} notes
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className="motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-white/10 hover:text-white"
                  aria-label={isCollapsed ? 'Show rounds' : 'Hide rounds'}
                  aria-expanded={!isCollapsed}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 border-b-2 border-r-2 border-current transition-transform duration-[var(--motion-base)] ${
                      isCollapsed ? 'rotate-45' : 'rotate-[-135deg]'
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={toggleCollapsed}
                className="motion-press mt-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left hover:bg-white/[0.07]"
                aria-expanded={!isCollapsed}
              >
                <span className="type-metadata text-[var(--text-muted)]">
                  Rounds
                </span>

                <DisclosureAction
                  open={!isCollapsed}
                  openLabel="Show rounds"
                  closeLabel="Hide rounds"
                  className="text-[var(--text-secondary)]"
                />
              </button>
            </div>
          )}

          <DisclosureContent
            open={!isCollapsed || editingEvent === eventName}
            innerClassName="divide-y divide-white/[0.07]"
          >
            {sortedMatches.map((match) => {
              const roundResult = getRoundResult(match)

              if (roundResult === 'W') runningWins++
              else if (roundResult === 'L') runningLosses++
              else runningTies++

              return (
                <RoundHistoryRow
                  key={match.id}
                  match={match}
                  roundResult={roundResult}
                  runningRecord={{
                    wins: runningWins,
                    losses: runningLosses,
                    ties: runningTies,
                  }}
                  editingMatch={editingMatch}
                  openMenuId={openMenuId}
                  openNotesId={openNotesId}
                  isRoundValid={isRoundValid}
                  isFormValid={isFormValid}
                  setEditingMatch={setEditingMatch}
                  setOpenMenuId={setOpenMenuId}
                  setOpenNotesId={setOpenNotesId}
                  editMatch={editMatch}
                  deleteMatch={deleteMatch}
                />
              )
            })}
          </DisclosureContent>
        </NestedPanel>
      </SwipeActionRow>

      <ContextActionSheet
        open={contextOpen}
        onClose={() => setContextOpen(false)}
        title={eventName}
        subtitle={`${firstMatch.deck} - ${firstMatch.format}`}
        ariaLabel="event actions"
        details={[
          { label: 'Record', value: eventRecord },
          { label: 'Win Rate', value: `${eventWinRate.toFixed(0)}%` },
          { label: 'Rounds', value: sortedMatches.length },
          { label: 'Notes', value: notesCount },
        ]}
        actions={[
          {
            label: 'Edit',
            tone: 'secondary',
            onSelect: startEventEdit,
          },
          {
            label: 'Delete',
            tone: 'danger',
            onSelect: confirmDeleteEvent,
          },
        ]}
      />
    </>
  )
}
