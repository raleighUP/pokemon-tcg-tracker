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
  const [notesOpen, setNotesOpen] = useState(true)

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

  const errorClass = (fieldName: string) =>
    invalidMatchFields.includes(fieldName)
      ? 'field-error-shake border-red-500 ring-2 ring-red-500/60'
      : 'border-slate-700'

  return (
    <Panel className="space-y-5">
      <SectionHeader
        title="Match Logger"
        description="Track the active event and log the current round."
      />

      <NestedPanel
        className={`overflow-hidden rounded-2xl bg-slate-950 p-0 shadow-xl shadow-black/20 ${
          eventHasError
            ? 'field-error-shake border-red-500 ring-2 ring-red-500/40'
            : 'border-slate-800'
        }`}
      >
        <div className="border-b border-white/10 bg-slate-800/80 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <StatusBadge className="bg-blue-500/15 px-2.5 py-1 text-blue-200">
              Active Event
            </StatusBadge>

            <button
              type="button"
              onClick={() => setEventOverlayOpen(true)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              {eventConfigured ? 'Edit Event' : 'Set Event'}
            </button>
          </div>

          <h3 className="truncate text-2xl font-bold text-white">
            {eventName || 'No event selected'}
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-slate-500">Deck</p>
              <p className="mt-1 truncate font-semibold text-slate-100">
                {selectedMatchDeck || 'Not selected'}
              </p>
            </div>

            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-slate-500">Format</p>
              <p className="mt-1 truncate font-semibold text-slate-100">
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
            className="min-h-[56px]"
          >
            {roundSuccess ? 'Next!' : 'Next Round'}
          </Button>

          <Button
            onClick={() => setEventOverlayOpen(true)}
            tone="secondary"
            size="lg"
            className="min-h-[56px]"
          >
            New Event
          </Button>
        </div>
      </NestedPanel>

      <NestedPanel className="space-y-4 rounded-2xl border-slate-800 bg-slate-950 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Round {currentRound}
            </p>
            <h3 className="mt-1 text-xl font-bold text-white">
              Log Match
            </h3>
          </div>

          <StatusBadge className="bg-white/10 px-2.5 py-1 text-slate-200">
            {matchType}
          </StatusBadge>
        </div>

        <TextInput
          value={opponentDeck}
          onChange={(e) => setOpponentDeck(e.target.value)}
          aria-label="Opponent deck"
          placeholder="Opponent Deck"
          autoComplete="off"
          list="opponent-archetype-options"
          className={`min-h-[56px] bg-slate-900 py-4 ${errorClass(
            'opponentDeck'
          )}`}
        />

        <datalist id="opponent-archetype-options">
          {opponentOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-900 p-1">
          <button
            onClick={() => {
              setMatchType('BO1')
              clearGames()
            }}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition duration-200 ${
              matchType === 'BO1'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Best of 1
          </button>

          <button
            onClick={() => {
              setMatchType('BO3')
              clearGames()
            }}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition duration-200 ${
              matchType === 'BO3'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Best of 3
          </button>
        </div>

        <div
          className={`rounded-2xl border bg-slate-900 p-3 ${
            gamesHaveError
              ? 'field-error-shake border-red-500 ring-2 ring-red-500/60'
              : 'border-slate-800'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-300">
              Games
            </p>

            <button
              type="button"
              onClick={clearGames}
              className="text-xs font-semibold text-slate-500 transition duration-200 hover:text-white"
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
                  className="flex min-h-[56px] items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-300">
                      Game {index + 1}
                    </span>

                    {result ? (
                      <ResultPill result={result} />
                    ) : (
                      <span className="text-xs text-slate-600">
                        Awaiting result
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleGameStart(index)}
                    aria-label={`Toggle Game ${index + 1} starting order`}
                    className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 transition duration-200 hover:bg-slate-800"
                  >
                    {gameStarts[index] ?? '1st'}
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
            className="min-h-[64px] text-lg"
          >
            Win
          </Button>

          <Button
            onClick={() => toggleGameResult('L')}
            tone="danger"
            size="lg"
            className="min-h-[64px] bg-red-600 text-lg text-white hover:bg-red-500"
          >
            Loss
          </Button>

          <Button
            onClick={() => toggleGameResult('T')}
            tone="accent"
            size="lg"
            className="min-h-[64px] text-lg"
          >
            Tie
          </Button>
        </div>
      </NestedPanel>

      <DisclosurePanel
        open={notesOpen}
        actionOpen={notesOpen}
        onToggle={() => setNotesOpen((current) => !current)}
        actionOpenLabel="Show"
        actionCloseLabel="Hide"
        className="border-slate-800"
        buttonClassName="px-4 py-3"
        contentClassName="px-4 pb-4"
        header={
          <span className="text-sm font-semibold text-slate-300">
            Match Notes
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
          className="min-h-[56px] bg-slate-900 py-4"
        />
      </DisclosurePanel>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={clearCurrentMatch}
          tone="secondary"
          size="lg"
          className="min-h-[56px]"
        >
          {clearSuccess ? 'Cleared!' : 'Clear Match'}
        </Button>

        <Button
          onClick={saveMatch}
          tone="purple"
          size="lg"
          className="min-h-[56px]"
        >
          {saveSuccess ? 'Saved!' : 'Save Match'}
        </Button>
      </div>

      {(saveSuccess || clearSuccess || validationMessage) && (
        <NestedPanel
          className={`rounded-2xl px-4 py-3 text-sm ${
            validationMessage
              ? 'border-red-500/60 bg-red-950/30 text-red-100'
              : 'border-green-500/40 bg-green-950/20 text-green-100'
          }`}
        >
          {validationMessage ||
            (saveSuccess
              ? 'Match saved. Ready for the next opponent.'
              : 'Current match fields cleared.')}
        </NestedPanel>
      )}

      {eventOverlayOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))] backdrop-blur-sm">
          <button
            aria-label="Close event setup"
            className="absolute inset-0 cursor-default"
            onClick={() => setEventOverlayOpen(false)}
          />

          <NestedPanel className="relative max-h-full w-full overflow-y-auto rounded-2xl border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/40">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Event Setup
                </p>
                <h3 className="mt-1 text-xl font-bold text-white">
                  Active Event
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setEventOverlayOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 transition duration-200 hover:bg-white/10 hover:text-white"
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
                  className={`bg-slate-900 py-4 ${errorClass(
                    'eventName'
                  )}`}
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
                    className={`bg-slate-900 py-4 ${errorClass(
                      'format'
                    )}`}
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
                    className={`bg-slate-900 py-4 ${errorClass(
                      'selectedMatchDeck'
                    )}`}
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
          </NestedPanel>
        </div>
      )}
    </Panel>
  )
}
