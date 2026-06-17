import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Deck } from '@/types'
import { getArchetypeOptions } from '@/utils/archetype-options'
import {
  Button,
  FieldLabel,
  NestedPanel,
  ResultPill,
  SectionHeader,
  SegmentedControl,
  SelectField,
  StatusBadge,
  TextareaField,
  TextInput,
  cn,
} from '@/components/ui'

type LoggerSection =
  | 'event'
  | 'deck'
  | 'opponent'
  | 'result'
  | 'start'
  | 'notes'

function GuidedSection({
  id,
  title,
  summary,
  complete,
  active,
  focused,
  invalid,
  onOpen,
  children,
}: {
  id: LoggerSection
  title: string
  summary: ReactNode
  complete: boolean
  active: boolean
  focused: boolean
  invalid?: boolean
  onOpen: (id: LoggerSection) => void
  children: ReactNode
}) {
  return (
    <NestedPanel
      variant={active ? 'elevated' : 'compact'}
      className={cn(
        'overflow-hidden rounded-[18px] p-0',
        focused && !active && 'border-[rgba(23,107,181,0.48)]',
        invalid &&
          'field-error-shake border-[var(--color-error)] ring-2 ring-[rgba(160,24,24,0.42)]'
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(id)}
        className="motion-press flex min-h-[54px] w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={active}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                complete
                  ? 'border-[var(--color-success)] bg-[rgba(47,116,59,0.18)] text-[#b8dfbe]'
                  : focused || active
                  ? 'border-[var(--color-primary)] bg-[rgba(23,107,181,0.16)] text-[#b7dcfb]'
                  : 'border-[var(--surface-border)] text-[var(--text-muted)]'
              )}
            >
              {complete ? '✓' : ''}
            </span>
            <span className="type-card-title text-[var(--text-primary)]">
              {title}
            </span>
          </div>

          {!active && (
            <div className="type-metadata mt-1 truncate pl-7 text-[var(--text-muted)]">
              {summary}
            </div>
          )}
        </div>

        <span className="type-metadata shrink-0 text-[#6fb2ed]">
          {active ? 'Open' : complete ? 'Edit' : 'Next'}
        </span>
      </button>

      {active && (
        <div className="space-y-4 border-t border-white/10 p-4">
          {children}
        </div>
      )}
    </NestedPanel>
  )
}

function EmptyResultHint() {
  return (
    <div className="surface-card-elevated rounded-2xl border border-dashed border-[var(--surface-border)] px-4 py-3">
      <p className="type-helper text-[var(--text-muted)]">
        Add at least one game result before choosing who went first.
      </p>
    </div>
  )
}

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
  const [activeSection, setActiveSection] =
    useState<LoggerSection>('event')
  const [opponentFocused, setOpponentFocused] = useState(false)

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

  const eventHasError =
    invalidMatchFields.includes('eventName') ||
    invalidMatchFields.includes('format')

  const deckHasError =
    invalidMatchFields.includes('selectedMatchDeck')

  const gamesHaveError = invalidMatchFields.includes('games')
  const opponentHasError = invalidMatchFields.includes('opponentDeck')

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
      ? 'field-error-shake border-[var(--color-error)] ring-2 ring-[rgba(160,24,24,0.6)]'
      : ''

  const eventComplete = Boolean(eventName.trim() && format.trim())
  const deckComplete = Boolean(selectedMatchDeck.trim())
  const opponentComplete = Boolean(opponentDeck.trim())
  const resultComplete = games.length > 0
  const startComplete = games.length > 0
  const notesComplete = true

  const sectionState: Record<LoggerSection, boolean> = {
    event: eventComplete,
    deck: deckComplete,
    opponent: opponentComplete,
    result: resultComplete,
    start: startComplete,
    notes: notesComplete,
  }

  const sectionOrder: LoggerSection[] = [
    'event',
    'deck',
    'opponent',
    'result',
    'start',
    'notes',
  ]

  const nextIncompleteSection =
    sectionOrder.find((section) => !sectionState[section]) ?? 'notes'

  const filteredOpponentOptions = useMemo(() => {
    const query = opponentDeck.trim().toLowerCase()

    if (!query) return opponentOptions.slice(0, 6)

    return opponentOptions
      .filter((option) =>
        option.toLowerCase().includes(query)
      )
      .slice(0, 6)
  }, [opponentDeck, opponentOptions])

  const selectOpponentDeck = (value: string) => {
    setOpponentDeck(value)
    setOpponentFocused(false)
    setActiveSection('result')
  }

  const handleSaveMatch = () => {
    if (!eventComplete) {
      setActiveSection('event')
    } else if (!deckComplete) {
      setActiveSection('deck')
    } else if (!opponentComplete) {
      setActiveSection('opponent')
    } else if (!resultComplete) {
      setActiveSection('result')
    }

    saveMatch()
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Match Logger"
      />

      <div className="flex items-center justify-between gap-3">
        <StatusBadge className="bg-white/10 px-2.5 py-1 text-[var(--text-secondary)]">
          Round {currentRound}
        </StatusBadge>
        <StatusBadge className="bg-[rgba(23,107,181,0.15)] px-2.5 py-1 text-[#b7dcfb]">
          {matchType}
        </StatusBadge>
      </div>

      <div className="space-y-3">
        <GuidedSection
          id="event"
          title="Event"
          summary={
            eventComplete
              ? `${eventName} - ${format}`
              : 'Event name and format'
          }
          complete={eventComplete}
          active={activeSection === 'event'}
          focused={nextIncompleteSection === 'event'}
          invalid={eventHasError}
          onOpen={setActiveSection}
        >
          <div>
            <FieldLabel>Event Name</FieldLabel>
            <TextInput
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
              aria-label="Event name"
              placeholder="Event Name"
              autoComplete="organization"
              enterKeyHint="next"
              className={errorClass('eventName')}
            />
          </div>

          <div>
            <FieldLabel>Format</FieldLabel>
            <SelectField
              value={format}
              onChange={(event) => {
                setFormat(event.target.value)
                if (eventName.trim()) setActiveSection('deck')
              }}
              aria-label="Format"
              className={errorClass('format')}
            >
              <option value="">Format</option>
              <option value="TEF-POR">TEF-POR</option>
              <option value="Gym Leader Challenge">
                Gym Leader Challenge
              </option>
              <option value="Expanded">Expanded</option>
            </SelectField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={nextRound}
              tone="secondary"
              className="min-h-12"
            >
              {roundSuccess ? 'Next!' : 'Next Round'}
            </Button>
            <Button
              onClick={startNewEvent}
              tone="secondary"
              className="min-h-12"
            >
              {eventSuccess ? 'Started!' : 'New Event'}
            </Button>
          </div>
        </GuidedSection>

        <GuidedSection
          id="deck"
          title="Your Deck"
          summary={deckComplete ? selectedMatchDeck : 'Select your deck'}
          complete={deckComplete}
          active={activeSection === 'deck'}
          focused={nextIncompleteSection === 'deck'}
          invalid={deckHasError}
          onOpen={setActiveSection}
        >
          <FieldLabel>Your Deck</FieldLabel>
          <SelectField
            value={selectedMatchDeck}
            onChange={(event) => {
              setSelectedMatchDeck(event.target.value)
              if (event.target.value) setActiveSection('opponent')
            }}
            aria-label="Your deck"
            className={errorClass('selectedMatchDeck')}
          >
            <option value="">Your Deck</option>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.name}>
                {deck.name}
              </option>
            ))}
          </SelectField>
        </GuidedSection>

        <GuidedSection
          id="opponent"
          title="Opponent Deck"
          summary={opponentComplete ? opponentDeck : 'Search archetype or deck name'}
          complete={opponentComplete}
          active={activeSection === 'opponent'}
          focused={nextIncompleteSection === 'opponent'}
          invalid={opponentHasError}
          onOpen={setActiveSection}
        >
          <FieldLabel>Opponent Deck</FieldLabel>
          <div className="relative">
            <TextInput
              value={opponentDeck}
              onChange={(event) => {
                setOpponentDeck(event.target.value)
                setOpponentFocused(true)
              }}
              onFocus={() => setOpponentFocused(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && opponentDeck.trim()) {
                  event.preventDefault()
                  selectOpponentDeck(
                    filteredOpponentOptions[0] ?? opponentDeck
                  )
                }
              }}
              aria-label="Opponent deck"
              placeholder="Search archetype or deck name"
              autoComplete="off"
              inputMode="text"
              enterKeyHint="next"
              className={`min-h-[56px] ${errorClass('opponentDeck')}`}
            />

            {opponentFocused && filteredOpponentOptions.length > 0 && (
              <div className="surface-card-glass absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 max-h-56 overflow-y-auto rounded-2xl border border-[var(--surface-border)] p-1 shadow-[0_18px_48px_rgba(0,0,0,0.44)]">
                {filteredOpponentOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOpponentDeck(option)}
                    className="motion-press type-card-title block w-full rounded-xl px-3 py-2.5 text-left text-[var(--text-primary)] hover:bg-white/10"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </GuidedSection>

        <GuidedSection
          id="result"
          title="Match Result"
          summary={
            resultComplete
              ? games.map((game, index) => `G${index + 1} ${game}`).join(' / ')
              : 'Choose Win, Loss, or Tie'
          }
          complete={resultComplete}
          active={activeSection === 'result'}
          focused={nextIncompleteSection === 'result'}
          invalid={gamesHaveError}
          onOpen={setActiveSection}
        >
          <SegmentedControl
            value={matchType}
            onChange={(nextMatchType) => {
              setMatchType(nextMatchType)
              clearGames()
            }}
            options={[
              { label: 'BO1', value: 'BO1' },
              { label: 'BO3', value: 'BO3' },
            ]}
          />

          <div className="space-y-2">
            {Array.from({ length: visibleGameCount }).map((_, index) => {
              const result = games[index]

              return (
                <div
                  key={index}
                  className={cn(
                    'card-row flex min-h-[56px] items-center justify-between rounded-2xl px-3',
                    result === 'W' && 'border-[rgba(47,116,59,0.35)] bg-[rgba(47,116,59,0.12)]',
                    result === 'L' && 'border-[rgba(160,24,24,0.35)] bg-[rgba(160,24,24,0.12)]',
                    result === 'T' && 'border-[rgba(220,192,65,0.35)] bg-[rgba(220,192,65,0.12)]'
                  )}
                >
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
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => toggleGameResult('W')}
              tone="success"
              size="lg"
              className="min-h-[60px] rounded-2xl bg-[var(--color-success)] text-base shadow-[0_14px_30px_rgba(47,116,59,0.18)]"
            >
              Win
            </Button>
            <Button
              onClick={() => toggleGameResult('L')}
              tone="danger"
              size="lg"
              className="min-h-[60px] rounded-2xl bg-[var(--color-error)] text-base text-white shadow-[0_14px_30px_rgba(160,24,24,0.18)] hover:bg-[#b32020]"
            >
              Loss
            </Button>
            <Button
              onClick={() => toggleGameResult('T')}
              tone="accent"
              size="lg"
              className="min-h-[60px] rounded-2xl text-base"
            >
              Tie
            </Button>
          </div>

          {games.length > 0 && (
            <Button
              onClick={() => setActiveSection('start')}
              tone="tertiary"
              className="w-full"
            >
              Continue to First/Second
            </Button>
          )}
        </GuidedSection>

        <GuidedSection
          id="start"
          title="Going First/Second"
          summary={
            games.length > 0
              ? games
                  .map((_, index) => `G${index + 1} ${gameStarts[index] ?? '1st'}`)
                  .join(' / ')
              : 'Add a result first'
          }
          complete={startComplete}
          active={activeSection === 'start'}
          focused={nextIncompleteSection === 'start'}
          onOpen={setActiveSection}
        >
          {games.length > 0 ? (
            <div className="space-y-2">
              {games.map((game, index) => (
                <div
                  key={`${game}-${index}`}
                  className="card-row flex min-h-[56px] items-center justify-between rounded-2xl px-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="type-card-title text-[var(--text-secondary)]">
                      Game {index + 1}
                    </span>
                    <ResultPill result={game} />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleGameStart(index)}
                    className="motion-press min-h-11 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-semibold text-[var(--text-secondary)] hover:bg-white/12 hover:text-white"
                  >
                    Went {gameStarts[index] ?? '1st'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyResultHint />
          )}
        </GuidedSection>

        <GuidedSection
          id="notes"
          title="Notes"
          summary={notes.trim() ? 'Notes added' : 'Optional'}
          complete={notesComplete}
          active={activeSection === 'notes'}
          focused={nextIncompleteSection === 'notes'}
          onOpen={setActiveSection}
        >
          <TextareaField
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            expandable
            rows={2}
            aria-label="Match notes"
            placeholder="Match Notes (optional)"
            enterKeyHint="done"
            className="min-h-[88px]"
          />
        </GuidedSection>
      </div>

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
          onClick={handleSaveMatch}
          tone="primary"
          size="lg"
          className="min-h-[56px] rounded-2xl shadow-[0_14px_30px_rgba(23,107,181,0.28)]"
        >
          {saveSuccess ? 'Saved!' : 'Save Match'}
        </Button>
      </div>

      {feedbackMessage && (
        <NestedPanel
          className={`rounded-2xl px-4 py-3 text-sm font-medium ${
            validationMessage
              ? 'border-[rgba(160,24,24,0.6)] bg-[rgba(160,24,24,0.18)] text-[#ffd1d1]'
              : 'border-[rgba(47,116,59,0.5)] bg-[rgba(47,116,59,0.16)] text-[#d6f0db] shadow-[0_16px_36px_rgba(47,116,59,0.08)]'
          }`}
        >
          <span className="flex items-center gap-2">
            {!validationMessage && (
              <span
                aria-hidden="true"
                className="motion-success-pop flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-success)] text-xs font-bold text-white"
              >
                ✓
              </span>
            )}
            <span>{feedbackMessage}</span>
          </span>
        </NestedPanel>
      )}
    </section>
  )
}
