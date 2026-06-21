import { useMemo, useState } from 'react'
import { Deck, EventRecord, Match } from '@/types'
import { getArchetypeOptions } from '@/utils/archetype-options'
import {
  Button,
  EmptyState,
  NestedPanel,
  ResultPill,
  SectionHeader,
  SegmentedControl,
  SelectField,
  Sheet,
  SwipeActionRow,
  TextareaField,
  TextInput,
} from '@/components/ui'
import EventHistoryCard from './match-history/EventHistoryCard'

type EventDraft = {
  eventName: string
  eventType: string
  playerCount: string
  format: string
  deck: string
}

type RoundDraft = EventDraft & {
  round: number
  opponentDeck: string
  matchType: 'BO1' | 'BO3'
  games: string[]
  gameStarts: ('1st' | '2nd')[]
  diceRollWins: boolean[]
  notes: string
}

type RoundEventData = Omit<EventDraft, 'playerCount'> & {
  playerCount?: number
  nextRound: number
}

type Props = {
  events: EventRecord[]
  matches: Match[]

  deleteMatch: (id: number) => void
  deleteEvent: (eventName: string) => void

  editMatch: (match: Match) => void
  addMatch: (match: Match) => void
  addEvent: (event: EventRecord) => void

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

  editingMatch: Match | null
  setEditingMatch: (match: Match | null) => void

  editingEvent: string | null
  setEditingEvent: (value: string | null) => void

  decks: Deck[]
}

const emptyEventDraft: EventDraft = {
  eventName: '',
  eventType: '',
  playerCount: '',
  format: '',
  deck: '',
}

const eventTypes = [
  'Local',
  'Challenge',
  'League Cup',
  'Online Event',
  'Regional',
  'Special Event',
  'Other',
]

function getFinalResult(games: string[]) {
  const wins = games.filter((game) => game === 'W').length
  const losses = games.filter((game) => game === 'L').length

  return `${wins}-${losses}`
}

function DiceIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
      <circle cx="15" cy="15" r="1.4" fill="currentColor" />
      <circle cx="15" cy="9" r="1.4" fill="currentColor" />
      <circle cx="9" cy="15" r="1.4" fill="currentColor" />
    </svg>
  )
}

export default function MatchHistory({
  events,
  matches,
  deleteMatch,
  deleteEvent,
  editMatch,
  addMatch,
  addEvent,
  editEvent,
  editingMatch,
  setEditingMatch,
  editingEvent,
  setEditingEvent,
  decks,
}: Props) {
  const [openEventSwipeId, setOpenEventSwipeId] =
    useState<number | null>(null)

  const [openNotesId, setOpenNotesId] =
    useState<string | null>(null)

  const [collapsedEvents, setCollapsedEvents] = useState<
    Record<string, boolean>
  >({})

  const [newEventOpen, setNewEventOpen] = useState(false)
  const [eventStep, setEventStep] =
    useState<'name' | 'type' | 'format' | 'deck'>('name')
  const [eventDraft, setEventDraft] =
    useState<EventDraft>(emptyEventDraft)
  const [roundDraft, setRoundDraft] = useState<RoundDraft | null>(null)
  const [opponentFocused, setOpponentFocused] = useState(false)
  const [openGameActionIndex, setOpenGameActionIndex] =
    useState<number | null>(null)
  const [eventValidationMessage, setEventValidationMessage] = useState('')
  const [roundValidationMessage, setRoundValidationMessage] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')

  const opponentOptions = useMemo(() => {
    return getArchetypeOptions()
  }, [])

  const isRoundValid =
    editingMatch?.round !== undefined &&
    editingMatch?.round !== null &&
    String(editingMatch.round).trim() !== '' &&
    !isNaN(Number(editingMatch.round)) &&
    Number(editingMatch.round) > 0

  const isFormValid = isRoundValid

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

  const eventRecords = [
    ...events,
    ...Object.entries(groupedMatches)
      .filter(
        ([eventName]) =>
          !events.some((event) => event.eventName === eventName)
      )
      .map(([eventName, eventMatches], index) => {
        const firstMatch = eventMatches[0]

        return {
          id: firstMatch?.id ?? -index - 1,
          eventName,
          eventType: firstMatch?.eventType ?? 'Other',
          format: firstMatch?.format ?? '',
          deck: firstMatch?.deck ?? '',
        }
      }),
  ]

  const resetEventSheet = () => {
    setOpenEventSwipeId(null)
    setNewEventOpen(false)
    setEventStep('name')
    setEventDraft(emptyEventDraft)
    setEventValidationMessage('')
  }

  const openNewEvent = () => {
    setOpenEventSwipeId(null)
    setEventDraft(emptyEventDraft)
    setEventStep('name')
    setNewEventOpen(true)
  }

  const startRoundForEvent = (eventData: RoundEventData) => {
    setOpenEventSwipeId(null)
    setRoundDraft({
      ...eventData,
      playerCount: String(eventData.playerCount ?? ''),
      round: eventData.nextRound,
      opponentDeck: '',
      matchType: 'BO3',
      games: [],
      gameStarts: [],
      diceRollWins: [],
      notes: '',
    })
  }

  const finishEventSetup = () => {
    const playerCount = Number(eventDraft.playerCount)

    if (
      !eventDraft.eventName ||
      !eventDraft.eventType ||
      !eventDraft.playerCount ||
      !Number.isFinite(playerCount) ||
      playerCount <= 0 ||
      !eventDraft.format ||
      !eventDraft.deck
    ) {
      setEventValidationMessage('Complete the event fields first.')
      window.setTimeout(() => setEventValidationMessage(''), 1600)
      return
    }

    addEvent({
      id: Date.now(),
      eventName: eventDraft.eventName,
      eventType: eventDraft.eventType,
      playerCount,
      format: eventDraft.format,
      deck: eventDraft.deck,
    })
    resetEventSheet()
    setFeedbackMessage('Event created')
    window.setTimeout(() => setFeedbackMessage(''), 1400)
  }

  const closeRoundSheet = () => {
    setOpenGameActionIndex(null)
    setRoundDraft(null)
    setRoundValidationMessage('')
  }

  const updateRoundGames = (result: string) => {
    if (!roundDraft) return

    if (roundDraft.matchType === 'BO1') {
      setRoundDraft({
        ...roundDraft,
        games: [result],
        gameStarts: roundDraft.gameStarts.slice(0, 1),
        diceRollWins: roundDraft.diceRollWins.slice(0, 1),
      })
      return
    }

    if (roundDraft.games.length >= 3) return

    setRoundDraft({
      ...roundDraft,
      games: [...roundDraft.games, result],
    })
  }

  const updateRoundMatchType = (matchType: 'BO1' | 'BO3') => {
    if (!roundDraft) return

    setRoundDraft({
      ...roundDraft,
      matchType,
      games:
        matchType === 'BO1'
          ? roundDraft.games.slice(0, 1)
          : roundDraft.games,
      gameStarts:
        matchType === 'BO1'
          ? roundDraft.gameStarts.slice(0, 1)
          : roundDraft.gameStarts,
      diceRollWins:
        matchType === 'BO1'
          ? roundDraft.diceRollWins.slice(0, 1)
          : roundDraft.diceRollWins,
    })
  }

  const toggleGameStart = (index: number) => {
    if (!roundDraft) return

    const updatedStarts = [...roundDraft.gameStarts]

    updatedStarts[index] =
      updatedStarts[index] === '2nd' ? '1st' : '2nd'

    setRoundDraft({
      ...roundDraft,
      gameStarts: updatedStarts,
    })
  }

  const toggleDiceRollWin = (index: number) => {
    if (!roundDraft) return

    const updatedDiceRollWins = [...roundDraft.diceRollWins]
    updatedDiceRollWins[index] = !updatedDiceRollWins[index]

    setRoundDraft({
      ...roundDraft,
      diceRollWins: updatedDiceRollWins,
    })
  }

  const clearRoundGame = (index: number) => {
    if (!roundDraft) return

    setRoundDraft({
      ...roundDraft,
      games: roundDraft.games.filter((_, gameIndex) => gameIndex !== index),
      gameStarts: roundDraft.gameStarts.filter(
        (_, gameIndex) => gameIndex !== index
      ),
      diceRollWins: roundDraft.diceRollWins.filter(
        (_, gameIndex) => gameIndex !== index
      ),
    })
    setOpenGameActionIndex(null)
  }

  const saveRound = () => {
    if (
      !roundDraft ||
      !roundDraft.eventName.trim() ||
      !roundDraft.format.trim() ||
      !roundDraft.deck.trim() ||
      !roundDraft.opponentDeck.trim() ||
      roundDraft.games.length === 0
    ) {
      setRoundValidationMessage('Add opponent deck and at least one game result.')
      window.setTimeout(() => setRoundValidationMessage(''), 1600)
      return
    }

    addMatch({
      id: Date.now(),
      eventName: roundDraft.eventName,
      eventType: roundDraft.eventType,
      round: roundDraft.round,
      format: roundDraft.format,
      deck: roundDraft.deck,
      opponentDeck: roundDraft.opponentDeck,
      matchType: roundDraft.matchType,
      games: roundDraft.games,
      gameStarts: roundDraft.gameStarts.slice(0, roundDraft.games.length),
      diceRollWins: roundDraft.diceRollWins.slice(
        0,
        roundDraft.games.length
      ),
      finalResult: getFinalResult(roundDraft.games),
      notes: roundDraft.notes,
    })

    closeRoundSheet()
    setFeedbackMessage('Round saved')
    window.setTimeout(() => setFeedbackMessage(''), 1400)
  }

  const visibleGameCount =
    roundDraft?.matchType === 'BO1'
      ? 1
      : Math.min((roundDraft?.games.length ?? 0) + 1, 3)
  const filteredOpponentOptions = useMemo(() => {
    const query = roundDraft?.opponentDeck.trim().toLowerCase() ?? ''

    if (query.length < 3) return []

    return opponentOptions
      .filter((option) => option.toLowerCase().includes(query))
      .slice(0, 4)
  }, [opponentOptions, roundDraft?.opponentDeck])

  return (
    <section className="space-y-4">
      {feedbackMessage && (
        <div className="motion-success-pop fixed left-1/2 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full border border-[rgba(47,116,59,0.45)] bg-[rgba(47,116,59,0.92)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.36)]">
          {feedbackMessage}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <SectionHeader title="Match History" level={1} />
        <Button
          onClick={openNewEvent}
          tone="primary"
          className="min-h-11 shrink-0 px-4"
        >
          New Event
        </Button>
      </div>

      {eventRecords.length === 0 ? (
        <EmptyState>No matches logged yet.</EmptyState>
      ) : (
        <div className="space-y-4">
          {eventRecords
            .reverse()
            .map((event) => (
              <EventHistoryCard
                key={event.id}
                event={event}
                matches={groupedMatches[event.eventName] ?? []}
                decks={decks}
                editingEvent={editingEvent}
                editingMatch={editingMatch}
                eventSwipeOpen={openEventSwipeId === event.id}
                openNotesId={openNotesId}
                isRoundValid={isRoundValid}
                isFormValid={isFormValid}
                isCollapsed={
                  collapsedEvents[String(event.id)] ?? true
                }
                toggleCollapsed={() => {
                  setCollapsedEvents((currentCollapsedEvents) => ({
                    ...currentCollapsedEvents,
                    [String(event.id)]: !(
                      currentCollapsedEvents[String(event.id)] ?? true
                    ),
                  }))
                }}
                setEditingEvent={setEditingEvent}
                setEditingMatch={setEditingMatch}
                setEventSwipeOpen={(open) => {
                  setOpenEventSwipeId(open ? event.id : null)
                }}
                setOpenNotesId={setOpenNotesId}
                editEvent={editEvent}
                editMatch={editMatch}
                deleteEvent={deleteEvent}
                deleteMatch={deleteMatch}
                onAddRound={startRoundForEvent}
              />
            ))}
        </div>
      )}

      <Sheet
        open={newEventOpen}
        onClose={resetEventSheet}
        ariaLabel="new event"
        className="ios-modal-scroll items-start overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(5.75rem+env(safe-area-inset-top))]"
        contentClassName="mb-auto overflow-hidden rounded-[26px] p-0"
      >
        <div
          className={`space-y-4 p-4 ${
            eventValidationMessage
              ? 'field-error-shake rounded-t-[26px] border border-[var(--color-error)]'
              : ''
          }`}
        >
          <h3 className="type-section-title text-[var(--text-primary)]">
            New Event
          </h3>

          {eventStep === 'name' && (
            <div className="space-y-4">
              <TextInput
                value={eventDraft.eventName}
                onChange={(event) =>
                  setEventDraft({
                    ...eventDraft,
                    eventName: event.target.value,
                  })
                }
                placeholder="Event Name"
                aria-label="Event name"
              />
              <Button
                onClick={() => {
                  if (eventDraft.eventName.trim()) {
                    setEventValidationMessage('')
                    setEventStep('type')
                  } else {
                    setEventValidationMessage('Add an event name.')
                    window.setTimeout(
                      () => setEventValidationMessage(''),
                      1600
                    )
                  }
                }}
                tone="primary"
                className="w-full"
              >
                Next
              </Button>
            </div>
          )}

          {eventStep !== 'name' && (
            <TextInput
              value={eventDraft.eventName}
              onChange={(event) =>
                setEventDraft({
                  ...eventDraft,
                  eventName: event.target.value,
                })
              }
              placeholder="Event Name"
              aria-label="Event name"
            />
          )}

          {eventStep === 'type' && (
            <div className="space-y-4">
              <SelectField
                value={eventDraft.eventType}
                onChange={(event) =>
                  setEventDraft({
                    ...eventDraft,
                    eventType: event.target.value,
                  })
                }
                aria-label="Event type"
              >
                <option value="">Event Type</option>
                {eventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </SelectField>
              <TextInput
                value={eventDraft.playerCount}
                onChange={(event) =>
                  setEventDraft({
                    ...eventDraft,
                    playerCount: event.target.value.replace(/\D/g, ''),
                  })
                }
                inputMode="numeric"
                placeholder="Number of Players"
                aria-label="Number of players"
              />
              <Button
                onClick={() => {
                  const playerCount = Number(eventDraft.playerCount)
                  if (
                    eventDraft.eventType &&
                    eventDraft.playerCount &&
                    Number.isFinite(playerCount) &&
                    playerCount > 0
                  ) {
                    setEventValidationMessage('')
                    setEventStep('format')
                  } else {
                    setEventValidationMessage(
                      'Choose event type and player count.'
                    )
                    window.setTimeout(
                      () => setEventValidationMessage(''),
                      1600
                    )
                  }
                }}
                tone="primary"
                className="w-full"
              >
                Next
              </Button>
            </div>
          )}

          {(eventStep === 'format' || eventStep === 'deck') && (
            <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
              <SelectField
                value={eventDraft.eventType}
                onChange={(event) =>
                  setEventDraft({
                    ...eventDraft,
                    eventType: event.target.value,
                  })
                }
                aria-label="Event type"
              >
                <option value="">Event Type</option>
                {eventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </SelectField>
              <TextInput
                value={eventDraft.playerCount}
                onChange={(event) =>
                  setEventDraft({
                    ...eventDraft,
                    playerCount: event.target.value.replace(/\D/g, ''),
                  })
                }
                inputMode="numeric"
                placeholder="Players"
                aria-label="Number of players"
              />
            </div>
          )}

          {eventStep === 'format' && (
            <div className="space-y-4">
              <SelectField
                value={eventDraft.format}
                onChange={(event) =>
                  setEventDraft({
                    ...eventDraft,
                    format: event.target.value,
                  })
                }
                aria-label="Format"
              >
                <option value="">Format</option>
                <option value="TEF-CRI">TEF-CRI</option>
                <option value="Gym Leader Challenge">
                  Gym Leader Challenge
                </option>
                <option value="Expanded">Expanded</option>
              </SelectField>
              <Button
                onClick={() => {
                  if (eventDraft.format) {
                    setEventValidationMessage('')
                    setEventStep('deck')
                  } else {
                    setEventValidationMessage('Choose a format.')
                    window.setTimeout(
                      () => setEventValidationMessage(''),
                      1600
                    )
                  }
                }}
                tone="primary"
                className="w-full"
              >
                Next
              </Button>
            </div>
          )}

          {eventStep === 'deck' && (
            <div className="space-y-4">
              <SelectField
                value={eventDraft.format}
                onChange={(event) =>
                  setEventDraft({
                    ...eventDraft,
                    format: event.target.value,
                  })
                }
                aria-label="Format"
              >
                <option value="">Format</option>
                <option value="TEF-CRI">TEF-CRI</option>
                <option value="Gym Leader Challenge">
                  Gym Leader Challenge
                </option>
                <option value="Expanded">Expanded</option>
              </SelectField>
              <SelectField
                value={eventDraft.deck}
                onChange={(event) =>
                  setEventDraft({
                    ...eventDraft,
                    deck: event.target.value,
                  })
                }
                aria-label="Your deck"
              >
                <option value="">Your Deck</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.name}>
                    {deck.name}
                  </option>
                ))}
              </SelectField>
              <Button
                onClick={finishEventSetup}
                tone="primary"
                className="w-full"
              >
                Save Event
              </Button>
            </div>
          )}
          {eventValidationMessage && (
            <p className="type-helper text-[var(--color-error)]">
              {eventValidationMessage}
            </p>
          )}
        </div>
      </Sheet>

      <Sheet
        open={Boolean(roundDraft)}
        onClose={closeRoundSheet}
        ariaLabel="new round"
        className="ios-modal-scroll items-start overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(5.75rem+env(safe-area-inset-top))]"
        contentClassName="mb-auto overflow-hidden rounded-[26px] p-0"
      >
        {roundDraft && (
          <div
            className={`ios-modal-scroll max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain p-4 ${
              roundValidationMessage
                ? 'field-error-shake rounded-t-[26px] border border-[var(--color-error)]'
                : ''
            }`}
          >
            <h3 className="type-section-title text-[var(--text-primary)]">
              Round {roundDraft.round}
            </h3>
            <p className="type-metadata mt-1 text-[var(--text-muted)]">
              {roundDraft.eventName}
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-3">
                <TextInput
                  value={roundDraft.opponentDeck}
                  onChange={(event) =>
                    setRoundDraft({
                      ...roundDraft,
                      opponentDeck: event.target.value,
                    })
                  }
                  onFocus={() => setOpponentFocused(true)}
                  placeholder="Opponent Deck"
                  aria-label="Opponent deck"
                />
                {opponentFocused && filteredOpponentOptions.length > 0 && (
                  <div className="surface-card-elevated max-h-44 overflow-y-auto rounded-2xl border border-[var(--surface-border)] p-1">
                    {filteredOpponentOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setRoundDraft({
                            ...roundDraft,
                            opponentDeck: option,
                          })
                          setOpponentFocused(false)
                        }}
                        className="motion-press type-card-title block w-full rounded-xl px-3 py-2.5 text-left text-[var(--text-primary)] hover:bg-white/10"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <SegmentedControl
                value={roundDraft.matchType}
                onChange={updateRoundMatchType}
                options={[
                  { label: 'BO1', value: 'BO1' },
                  { label: 'BO3', value: 'BO3' },
                ]}
              />

              <div className="space-y-3">
                <div className="space-y-2">
                  {Array.from({ length: visibleGameCount }).map(
                    (_, index) => {
                      const result = roundDraft.games[index]
                      const diceRollWon = roundDraft.diceRollWins[index]

                      return (
                        <SwipeActionRow
                          key={index}
                          open={openGameActionIndex === index}
                          onOpenChange={(open) =>
                            setOpenGameActionIndex(open ? index : null)
                          }
                          actions={
                            result
                              ? [
                                  {
                                    label: 'Clear',
                                    tone: 'delete',
                                    onSelect: () => clearRoundGame(index),
                                  },
                                ]
                              : []
                          }
                          className="rounded-2xl"
                          contentClassName="rounded-2xl"
                        >
                          <NestedPanel
                            variant="compact"
                            className="grid min-h-[56px] grid-cols-[1fr_auto_1fr] items-center gap-2 p-3"
                          >
                            <span className="type-card-title text-[var(--text-secondary)]">
                              Game {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleDiceRollWin(index)}
                              aria-label={`Toggle dice roll win for game ${
                                index + 1
                              }`}
                              aria-pressed={Boolean(diceRollWon)}
                              className={`motion-press flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${
                                diceRollWon
                                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                                  : 'border-white/10 bg-white/8 text-[var(--text-secondary)]'
                              }`}
                            >
                              <DiceIcon />
                            </button>
                            <span className="flex items-center justify-end gap-2">
                              {result ? (
                                <>
                                  <ResultPill result={result} />
                                  <button
                                    type="button"
                                    onClick={() => toggleGameStart(index)}
                                    className="motion-press min-h-9 rounded-full border border-white/10 bg-white/8 px-3 text-xs font-semibold text-[var(--text-secondary)]"
                                  >
                                    Went {roundDraft.gameStarts[index] ?? '1st'}
                                  </button>
                                </>
                              ) : (
                                <span className="type-metadata text-[var(--text-muted)]">
                                  Pending
                                </span>
                              )}
                            </span>
                          </NestedPanel>
                        </SwipeActionRow>
                      )
                    }
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => updateRoundGames('W')}
                    tone="success"
                  >
                    Win
                  </Button>
                  <Button
                    onClick={() => updateRoundGames('L')}
                    tone="danger"
                    className="!bg-[var(--color-error)] !text-white hover:!bg-[#b32020]"
                  >
                    Loss
                  </Button>
                  <Button
                    onClick={() => updateRoundGames('T')}
                    tone="accent"
                  >
                    Tie
                  </Button>
                </div>
              </div>

              <TextareaField
                value={roundDraft.notes}
                onChange={(event) =>
                  setRoundDraft({
                    ...roundDraft,
                    notes: event.target.value,
                  })
                }
                placeholder="Notes (optional)"
                aria-label="Notes"
                className="min-h-[96px]"
              />

              <Button
                onClick={saveRound}
                tone="primary"
                className="w-full"
              >
                Save Round
              </Button>
              {roundValidationMessage && (
                <p className="type-helper text-[var(--color-error)]">
                  {roundValidationMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </section>
  )
}
