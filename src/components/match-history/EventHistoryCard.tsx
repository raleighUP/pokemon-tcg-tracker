import { Deck, EventRecord, Match } from '@/types'
import { useState } from 'react'
import {
  Button,
  ContextActionSheet,
  DisclosureAction,
  DisclosureContent,
  NestedPanel,
  Sheet,
  StatusBadge,
  SwipeActionRow,
  TextInput,
  cn,
} from '@/components/ui'
import EventEditForm from './EventEditForm'
import RoundHistoryRow from './RoundHistoryRow'
import {
  EventType,
  getTournamentStructure,
} from '@/utils/tournament'

type RoundResult = 'W' | 'L' | 'T'

type Props = {
  event: EventRecord
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
      eventType: string
      format: string
      deck: string
      playerCount?: number
      finalPlacement?: string
      championshipPoints?: string
      prizing?: string
    }
  ) => void
  editMatch: (match: Match) => void
  deleteEvent: (eventName: string) => void
  deleteMatch: (id: number) => void
  onAddRound: (eventData: {
    eventName: string
    eventType: string
    format: string
    deck: string
    playerCount?: number
    nextRound: number
  }) => void
}

function getRoundResult(match: Match): RoundResult {
  const wins = match.games.filter((game) => game === 'W').length
  const losses = match.games.filter((game) => game === 'L').length

  if (wins > losses) return 'W'
  if (losses > wins) return 'L'

  return 'T'
}

function toStructureEventType(eventType: string): EventType | null {
  const normalized = eventType.toLowerCase()

  if (normalized.includes('challenge')) return 'challenge'
  if (normalized.includes('cup')) return 'cup'
  if (
    normalized.includes('regional') ||
    normalized.includes('special')
  ) {
    return 'regional'
  }

  return null
}

function getRoundLabel(event: EventRecord, round: number) {
  const structureType = toStructureEventType(event.eventType)

  if (!structureType || !event.playerCount) return `R${round}`

  const structure = getTournamentStructure(
    structureType,
    event.playerCount
  )

  if (!structure.swissRounds || round <= structure.swissRounds) {
    return `R${round}`
  }

  const cutRound = round - structure.swissRounds

  if (structure.topCutSize >= 8) {
    if (cutRound === 1) return 'Top 8'
    if (cutRound === 2) return 'Top 4'
    if (cutRound === 3) return 'Finals'
  }

  if (structure.topCutSize >= 4) {
    if (cutRound === 1) return 'Top 4'
    if (cutRound === 2) return 'Finals'
  }

  if (structure.topCutSize >= 2 && cutRound === 1) return 'Finals'

  return `R${round}`
}

export default function EventHistoryCard({
  event,
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
  onAddRound,
}: Props) {
  const [contextOpen, setContextOpen] = useState(false)
  const [eventSwipeOpen, setEventSwipeOpen] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [endSheetOpen, setEndSheetOpen] = useState(false)
  const [finalPlacement, setFinalPlacement] = useState(
    event.finalPlacement ?? ''
  )
  const [championshipPoints, setChampionshipPoints] = useState(
    event.championshipPoints ?? ''
  )
  const [prizing, setPrizing] = useState(event.prizing ?? '')
  const [endFeedback, setEndFeedback] = useState('')
  const [finalDetailsOpen, setFinalDetailsOpen] = useState(false)
  const sortedMatches = [...matches].sort((a, b) => a.round - b.round)
  const eventDeck = decks.find((deck) => deck.name === event.deck)
  const isFinalized = Boolean(
    event.finalPlacement?.trim() ||
      event.championshipPoints?.trim() ||
      event.prizing?.trim()
  )

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
    setEventSwipeOpen(false)
    setEditSheetOpen(true)
  }

  const confirmDeleteEvent = () => {
    if (window.confirm(`Delete ${event.eventName} and all of its rounds?`)) {
      deleteEvent(event.eventName)
    }
  }

  return (
    <>
      {endFeedback && (
        <div className="motion-success-pop fixed left-1/2 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full border border-[rgba(47,116,59,0.45)] bg-[rgba(47,116,59,0.92)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.36)]">
          {endFeedback}
        </div>
      )}
      <NestedPanel variant="compact" className="overflow-hidden p-0">
        {editingEvent === event.eventName ? (
          <EventEditForm
            eventName={event.eventName}
            initialEventType={event.eventType}
            initialFormat={event.format}
            initialDeck={event.deck}
            decks={decks}
            onSave={(oldEventName, updatedData) => {
              editEvent(oldEventName, updatedData)
              setEditingEvent(null)
            }}
            onCancel={() => setEditingEvent(null)}
          />
        ) : (
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
              className="mx-3 mt-3 rounded-2xl bg-[#17171a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]"
              contentClassName="rounded-2xl bg-[#17171a]"
            >
              <button
                type="button"
                onClick={() => {
                  if (isFinalized) {
                    setFinalDetailsOpen((open) => !open)
                  }
                }}
                className="motion-press w-full p-3.5 text-left hover:bg-white/[0.04]"
                aria-expanded={isFinalized ? finalDetailsOpen : undefined}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-1">
                  <h3 className="truncate text-[1.25rem] font-[760] leading-tight text-white">
                    {event.eventName}
                  </h3>
                  <span className="type-card-title truncate text-[var(--text-secondary)]">
                    {event.eventType}
                  </span>
                  <StatusBadge
                    className={cn(
                      'justify-self-end px-2.5 py-1 ring-1',
                      recordToneClass
                    )}
                  >
                    {eventRecord}
                  </StatusBadge>
                  <span className="type-card-title truncate text-[var(--text-secondary)]">
                    {event.deck}
                  </span>
                  <span className="type-metadata truncate text-[var(--text-muted)]">
                    {eventDeck?.archetype || eventDeck?.variant || 'Other'}
                  </span>
                  <span className="type-metadata justify-self-end text-[var(--text-muted)]">
                    {event.format}
                  </span>
                  {isFinalized && (
                    <span className="type-metadata col-span-3 mt-1 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[var(--text-secondary)]">
                      Event Summary
                      <DisclosureAction
                        open={finalDetailsOpen}
                        openLabel="Show"
                        closeLabel="Hide"
                      />
                    </span>
                  )}
                  {isFinalized && finalDetailsOpen && (
                    <span className="col-span-3 mt-1 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                      <span>
                        <span className="type-metadata block text-[var(--text-muted)]">
                          Placement
                        </span>
                        <span className="type-card-title mt-1 block text-white">
                          {event.finalPlacement || '-'}
                        </span>
                      </span>
                      <span>
                        <span className="type-metadata block text-[var(--text-muted)]">
                          Players
                        </span>
                        <span className="type-card-title mt-1 block text-white">
                          {event.playerCount ?? '-'}
                        </span>
                      </span>
                      <span>
                        <span className="type-metadata block text-[var(--text-muted)]">
                          CP
                        </span>
                        <span className="type-card-title mt-1 block text-white">
                          {event.championshipPoints || '-'}
                        </span>
                      </span>
                      <span>
                        <span className="type-metadata block text-[var(--text-muted)]">
                          Prizing
                        </span>
                        <span className="type-card-title mt-1 block text-white">
                          {event.prizing || '-'}
                        </span>
                      </span>
                    </span>
                  )}
                </div>
              </button>
            </SwipeActionRow>

            <div className={cn('p-3.5', isFinalized ? 'pt-1' : 'pt-3')}>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="motion-press flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left hover:bg-white/[0.07]"
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

              {!isFinalized && (
                <div
                  className={cn(
                    'mt-3 grid gap-2',
                    sortedMatches.length > 0 ? 'grid-cols-2' : 'grid-cols-1'
                  )}
                >
                  <Button
                    onClick={() =>
                      onAddRound({
                        eventName: event.eventName,
                        eventType: event.eventType,
                        format: event.format,
                        deck: event.deck,
                        playerCount: event.playerCount,
                        nextRound:
                          sortedMatches.length > 0
                            ? Math.max(
                                ...sortedMatches.map((match) => match.round)
                              ) + 1
                            : 1,
                      })
                    }
                    tone="primary"
                    className="min-h-11 rounded-2xl"
                  >
                    {sortedMatches.length > 0 ? 'Next Round' : 'Add Round'}
                  </Button>
                  {sortedMatches.length > 0 && (
                    <Button
                      onClick={() => setEndSheetOpen(true)}
                      tone="secondary"
                      className="min-h-11 rounded-2xl"
                    >
                      End Event
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <DisclosureContent
          open={!isCollapsed || editingEvent === event.eventName}
          innerClassName="mx-3 mb-3 space-y-2"
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
                roundLabel={getRoundLabel(event, match.round)}
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

      <Sheet
        open={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        ariaLabel="edit event"
        contentClassName="overflow-hidden rounded-t-[26px] rounded-b-none border-b-0 p-0"
      >
        <EventEditForm
          eventName={event.eventName}
          initialEventType={event.eventType}
          initialFormat={event.format}
          initialDeck={event.deck}
          decks={decks}
          onSave={(oldEventName, updatedData) => {
            editEvent(oldEventName, updatedData)
            setEditSheetOpen(false)
          }}
          onCancel={() => setEditSheetOpen(false)}
        />
      </Sheet>

      <Sheet
        open={endSheetOpen}
        onClose={() => setEndSheetOpen(false)}
        ariaLabel="end event"
        className="items-start overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(5.75rem+env(safe-area-inset-top))]"
        contentClassName="mb-auto overflow-hidden rounded-[26px] p-0"
      >
        <div className="space-y-4 p-4">
          <h3 className="type-section-title text-[var(--text-primary)]">
            End Event
          </h3>
          <TextInput
            value={finalPlacement}
            onChange={(event) => setFinalPlacement(event.target.value)}
            placeholder="Final Placement"
            aria-label="Final placement"
          />
          <TextInput
            value={championshipPoints}
            onChange={(event) =>
              setChampionshipPoints(event.target.value)
            }
            inputMode="numeric"
            placeholder="Championship Points"
            aria-label="Championship points"
          />
          <TextInput
            value={prizing}
            onChange={(event) => setPrizing(event.target.value)}
            placeholder="Prizing"
            aria-label="Prizing"
          />
          <Button
            onClick={() => {
              editEvent(event.eventName, {
                eventName: event.eventName,
                eventType: event.eventType,
                format: event.format,
                deck: event.deck,
                playerCount: event.playerCount,
                finalPlacement,
                championshipPoints,
                prizing,
              })
              setEndSheetOpen(false)
              setEndFeedback('Event finalized')
              window.setTimeout(() => setEndFeedback(''), 1400)
            }}
            tone="primary"
            className="w-full"
          >
            Finalize Event
          </Button>
        </div>
      </Sheet>

      <ContextActionSheet
        open={contextOpen}
        onClose={() => setContextOpen(false)}
        title={event.eventName}
        subtitle={`${event.deck} - ${event.eventType}`}
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
