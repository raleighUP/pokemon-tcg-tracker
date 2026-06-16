import { useMemo, useState } from 'react'
import { Deck } from '@/types'
import { getArchetypeOptions } from '@/utils/archetype-options'
import {
  Button,
  DisclosurePanel,
  FieldLabel,
  NestedPanel,
  Panel,
  ResultPill,
  SectionHeader,
  SelectField,
  Sheet,
  StatusBadge,
  TextareaField,
  TextInput,
} from '@/components/ui'

type Props = {
  eventName: string
  setEventName: (value: string) => void
  selectedMatchDeck: string
  setSelectedMatchDeck: (value: string) => void
  opponentDeck: string
  setOpponentDeck: (value: string) => void
  format: string
  setFormat: (value: string) => void
  decks: Deck[]

  games: string[]
  gameStarts: ('1st' | '2nd')[]

  toggleGameResult: (result: string) => void
  toggleGameStart: (gameIndex: number) => void

  saveMatch: () => void

  matchType: 'BO1' | 'BO3'
  setMatchType: (value: 'BO1' | 'BO3') => void
  currentRound: number

  clearGames: () => void
  startNewEvent: () => void
  nextRound: () => void
  clearEvent: () => void
  clearCurrentMatch: () => void

  notes: string
  setNotes: (value: string) => void

  roundSuccess: boolean
  eventSuccess: boolean
  clearSuccess: boolean
  saveSuccess: boolean
  invalidMatchFields: string[]
}

export default function MatchLogger({
  eventName,
  setEventName,
  selectedMatchDeck,
  setSelectedMatchDeck,
  opponentDeck,
  setOpponentDeck,
  format,
  setFormat,
  matchType,
  setMatchType,
  currentRound,
  decks,
  games,
  gameStarts,
  toggleGameResult,
  toggleGameStart,
  clearGames,
  saveMatch,
  clearCurrentMatch,
  startNewEvent,
  nextRound,
  saveSuccess,
  roundSuccess,
  eventSuccess,
  clearSuccess,
  notes,
  setNotes,
  invalidMatchFields = [],
}: Props) {
  const [eventOverlayOpen, setEventOverlayOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)

  const opponentOptions = useMemo(() => {
    const options = new Set<string>(getArchetypeOptions())

    decks.forEach((deck) => {
      if (deck.archetype) options.add(deck.archetype)
      if (deck.variant) options.add(deck.variant)
      if (deck.name) options.add(deck.name)
    })

    return [...options].sort((a, b) => a.localeCompare(b))
  }, [decks])

  const visibleGameCount =
    matchType === 'BO1' ? 1 : Math.min(games.length + 1, 3)

  const eventConfigured =
    eventName.trim() &&
    format.trim() &&
    selectedMatchDeck.trim()

  const eventHasError =
    invalidMatchFields.includes('eventName') ||
    invalidMatchFields.includes('format') ||
    invalidMatchFields.includes('selectedMatchDeck')

  const gamesHaveError = invalidMatchFields.includes('games')

  const validationMessage =
    invalidMatchFields.length > 0
      ? 'Add the missing event, opponent, and game details before saving.'
      : ''

  const successMessage = saveSuccess
    ? 'Match saved. Ready for the next opponent.'
    : clearSuccess
    ? 'Current match fields cleared.'
    : eventSuccess
    ? 'New event started. Set the event details when ready.'
    : roundSuccess
    ? `Round ${currentRound} is ready.`
    : ''

  const feedbackMessage = validationMessage || successMessage

  const errorClass = (fieldName: string) =>
    invalidMatchFields.includes(fieldName)
      ? 'field-error-shake border-red-500 ring-2 ring-red-500/60'
      : ''

  return (
    <Panel className="space-y-5">
      <SectionHeader
        title="Match Logger"
        description="Capture the round, result, and context without leaving the tournament flow."
      />

      <NestedPanel
        className={`card-hero overflow-hidden rounded-[28px] p-0 ${
          eventHasError
            ? 'field-error-shake border-red-500 ring-2 ring-red-500/40'
            : ''
        }`}
      >
        <div className="border-b border-white/10 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <StatusBadge className="bg-blue-500/15 px-2.5 py-1 text-blue-100">
              Active Event
            </StatusBadge>

            <button
              type="button"
              onClick={() => setEventOverlayOpen(true)}
              className="motion-press rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-white/20 hover:bg-white/12 hover:text-white"
            >
              {eventConfigured ? 'Edit Event' : 'Set Event'}
            </button>
          </div>

          <h3 className="truncate text-[1.75rem] font-[760] leading-none text-white">
            {eventName || 'No event selected'}
          </h3>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="card-data rounded-2xl p-3">
              <p className="type-metadata text-[var(--text-muted)]">Deck</p>
              <p className="type-card-title mt-1 truncate text-[var(--text-primary)]">
                {selectedMatchDeck || 'Not selected'}
              </p>
            </div>

            <div className="card-data rounded-2xl p-3">
              <p className="type-metadata text-[var(--text-muted)]">Format</p>
              <p className="type-card-title mt-1 truncate text-[var(--text-primary)]">
                {format || 'Not selected'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4">
          <Button
            onClick={nextRound}
            tone="purple"
            size="lg"
            className="min-h-[56px] rounded-2xl bg-blue-600 shadow-[0_14px_30px_rgba(23,107,181,0.28)] hover:bg-blue-500"
          >
            {roundSuccess ? 'Next!' : 'Next Round'}
          </Button>

          <Button
            onClick={() => setEventOverlayOpen(true)}
            tone="secondary"
            size="lg"
            className="min-h-[56px] rounded-2xl bg-white/8 text-[var(--text-secondary)] hover:bg-white/12 hover:text-white"
          >
            New Event
          </Button>
        </div>
      </NestedPanel>

      <NestedPanel className="space-y-4 rounded-[28px] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="type-metadata text-[var(--text-muted)]">
              Round {currentRound}
            </p>
            <h3 className="type-section-title mt-1 text-[var(--text-primary)]">
              Log Match
            </h3>
          </div>

          <StatusBadge className="bg-white/10 px-2.5 py-1 text-[var(--text-secondary)]">
            {matchType}
          </StatusBadge>
        </div>

        <div className="card-data rounded-2xl p-3">
          <FieldLabel className="mb-2 text-[var(--text-muted)]">
            Opponent Deck
          </FieldLabel>

          <TextInput
            value={opponentDeck}
            onChange={(e) => setOpponentDeck(e.target.value)}
            aria-label="Opponent deck"
            placeholder="Search archetype or deck name"
            autoComplete="off"
            inputMode="search"
            enterKeyHint="next"
            list="opponent-archetype-options"
            className={`min-h-[56px] bg-black/18 ${errorClass(
              'opponentDeck'
            )}`}
          />
        </div>

        <datalist id="opponent-archetype-options">
          {opponentOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>

        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
          <button
            onClick={() => {
              setMatchType('BO1')
              clearGames()
            }}
            className={`motion-press rounded-xl px-4 py-3 text-sm font-semibold ${
              matchType === 'BO1'
                ? 'bg-white text-black shadow-[0_10px_24px_rgba(0,0,0,0.25)]'
                : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-white'
            }`}
          >
            Best of 1
          </button>

          <button
            onClick={() => {
              setMatchType('BO3')
              clearGames()
            }}
            className={`motion-press rounded-xl px-4 py-3 text-sm font-semibold ${
              matchType === 'BO3'
                ? 'bg-white text-black shadow-[0_10px_24px_rgba(0,0,0,0.25)]'
                : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-white'
            }`}
          >
            Best of 3
          </button>
        </div>

        <div
          className={`card-data rounded-2xl p-3 ${
            gamesHaveError
              ? 'field-error-shake border-red-500 ring-2 ring-red-500/60'
              : ''
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="type-card-title text-[var(--text-primary)]">
                Match Result
              </p>
              <p className="type-metadata mt-1 text-[var(--text-subtle)]">
                Tap a result, then confirm who went first.
              </p>
            </div>

            <button
              type="button"
              onClick={clearGames}
              className="motion-press shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-white/10 hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2">
            {Array.from({ length: visibleGameCount }).map((_, index) => {
              const result = games[index]

              return (
                <div
                  key={index}
                  className="card-row flex min-h-[60px] items-center justify-between rounded-2xl px-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="type-card-title text-[var(--text-secondary)]">
                      Game {index + 1}
                    </span>

                    {result ? (
                      <ResultPill result={result} />
                    ) : (
                      <span className="type-metadata text-[var(--text-subtle)]">
                        Awaiting result
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleGameStart(index)}
                    aria-label={`Toggle Game ${index + 1} starting order`}
                    className="motion-press rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/12 hover:text-white"
                  >
                    Went {gameStarts[index] ?? '1st'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => toggleGameResult('W')}
            tone="success"
            size="lg"
            className="min-h-[68px] rounded-2xl bg-green-500 text-lg shadow-[0_14px_30px_rgba(34,197,94,0.18)] hover:bg-green-400"
          >
            Win
          </Button>

          <Button
            onClick={() => toggleGameResult('L')}
            tone="danger"
            size="lg"
            className="min-h-[68px] rounded-2xl bg-red-600 text-lg text-white shadow-[0_14px_30px_rgba(220,38,38,0.18)] hover:bg-red-500"
          >
            Loss
          </Button>

          <Button
            onClick={() => toggleGameResult('T')}
            tone="accent"
            size="lg"
            className="min-h-[68px] rounded-2xl text-lg shadow-[0_14px_30px_rgba(250,204,21,0.14)]"
          >
            Tie
          </Button>
        </div>
      </NestedPanel>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={clearCurrentMatch}
          tone="secondary"
          size="lg"
          className="min-h-[56px] rounded-2xl bg-white/8 text-[var(--text-secondary)] hover:bg-white/12 hover:text-white"
        >
          {clearSuccess ? 'Cleared!' : 'Clear Match'}
        </Button>

        <Button
          onClick={saveMatch}
          tone="purple"
          size="lg"
          className="min-h-[56px] rounded-2xl bg-blue-600 shadow-[0_14px_30px_rgba(23,107,181,0.28)] hover:bg-blue-500"
        >
          {saveSuccess ? 'Saved!' : 'Save Match'}
        </Button>
      </div>

      {feedbackMessage && (
        <NestedPanel
          className={`rounded-2xl px-4 py-3 text-sm font-medium ${
            validationMessage
              ? 'border-red-500/60 bg-red-950/30 text-red-100'
              : 'border-green-400/40 bg-green-950/20 text-green-100 shadow-[0_16px_36px_rgba(34,197,94,0.08)]'
          }`}
        >
          {feedbackMessage}
        </NestedPanel>
      )}

      <DisclosurePanel
        open={notesOpen}
        actionOpen={notesOpen}
        onToggle={() => setNotesOpen((current) => !current)}
        actionOpenLabel="Show"
        actionCloseLabel="Hide"
        className="rounded-2xl"
        buttonClassName="px-4 py-3"
        contentClassName="px-4 pb-4"
        header={
          <span>
            <span className="type-card-title block text-[var(--text-secondary)]">
              Match Notes
            </span>
            <span className="type-metadata mt-1 block text-[var(--text-subtle)]">
              Optional context for later review
            </span>
          </span>
        }
      >
        <TextareaField
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          expandable
          rows={1}
          aria-label="Match notes"
          placeholder="Match Notes (optional)"
          enterKeyHint="done"
          className="min-h-[56px]"
        />
      </DisclosurePanel>

      <Sheet
        open={eventOverlayOpen}
        onClose={() => setEventOverlayOpen(false)}
        ariaLabel="event setup"
      >
        <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto p-4 pt-3">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="type-metadata text-[var(--text-muted)]">
                Event Setup
              </p>
              <h3 className="type-section-title mt-1 text-[var(--text-primary)]">
                Active Event
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setEventOverlayOpen(false)}
              className="motion-press rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/10 hover:text-white"
            >
              Done
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <FieldLabel>
                Event Name
              </FieldLabel>

              <TextInput
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                aria-label="Event name"
                placeholder="Event Name"
                autoComplete="organization"
                enterKeyHint="next"
                className={errorClass(
                  'eventName'
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <FieldLabel>
                  Format
                </FieldLabel>

                <SelectField
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  aria-label="Format"
                  className={errorClass(
                    'format'
                  )}
                >
                  <option value="">Format</option>
                  <option value="TEF-POR">TEF-POR</option>
                  <option value="Gym Leader Challenge">
                    Gym Leader Challenge
                  </option>
                  <option value="Expanded">Expanded</option>
                </SelectField>
              </div>

              <div>
                <FieldLabel>
                  Your Deck
                </FieldLabel>

                <SelectField
                  value={selectedMatchDeck}
                  onChange={(e) =>
                    setSelectedMatchDeck(e.target.value)
                  }
                  aria-label="Your deck"
                  className={errorClass(
                    'selectedMatchDeck'
                  )}
                >
                  <option value="">Your Deck</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.name}>
                      {deck.name}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <Button
              onClick={startNewEvent}
              tone="primary"
              size="lg"
              className="w-full min-h-[56px]"
            >
              {eventSuccess ? 'Started!' : 'Start New Event'}
            </Button>
          </div>
        </div>
      </Sheet>
    </Panel>
  )
}
