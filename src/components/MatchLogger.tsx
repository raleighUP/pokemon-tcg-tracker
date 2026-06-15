import { Deck } from '@/types'
import {
  Panel,
  SectionHeader,
  SelectField,
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
  const visibleGameCount =
    matchType === 'BO1' ? 1 : Math.min(games.length + 1, 3)

  const errorClass = (fieldName: string) =>
    invalidMatchFields.includes(fieldName)
      ? 'field-error-shake border-red-500 ring-2 ring-red-500/60'
      : 'border-slate-700'

  return (
    <Panel>
      <SectionHeader title="Log Match" className="mb-6" />

      <div className="space-y-4">
        <TextInput
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="Event Name"
          autoComplete="organization"
          className={`py-4 ${errorClass(
            'eventName'
          )}`}
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={startNewEvent}
            className="rounded-xl bg-blue-500 px-4 py-4 font-bold hover:bg-blue-600"
          >
            {eventSuccess ? 'Started!' : 'New Event'}
          </button>

          <button
            onClick={nextRound}
            className="rounded-xl bg-purple-500 px-4 py-4 font-bold hover:bg-purple-600"
          >
            {roundSuccess ? 'Next!' : 'Next Round'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={`py-4 ${errorClass(
              'format'
            )}`}
          >
            <option value="">Format</option>
            <option value="TEF-POR">TEF-POR</option>
            <option value="Gym Leader Challenge">Gym Leader Challenge</option>
            <option value="Expanded">Expanded</option>
          </SelectField>

          <SelectField
            value={selectedMatchDeck}
            onChange={(e) => setSelectedMatchDeck(e.target.value)}
            className={`py-4 ${errorClass(
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

        <TextInput
          value={opponentDeck}
          onChange={(e) => setOpponentDeck(e.target.value)}
          placeholder="Opponent Deck"
          autoComplete="off"
          className={`py-4 ${errorClass(
            'opponentDeck'
          )}`}
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setMatchType('BO1')
              clearGames()
            }}
            className={`rounded-xl px-4 py-3 font-bold ${
              matchType === 'BO1'
                ? 'bg-yellow-400 text-black'
                : 'bg-slate-800 text-white'
            }`}
          >
            Best of 1
          </button>

          <button
            onClick={() => {
              setMatchType('BO3')
              clearGames()
            }}
            className={`rounded-xl px-4 py-3 font-bold ${
              matchType === 'BO3'
                ? 'bg-yellow-400 text-black'
                : 'bg-slate-800 text-white'
            }`}
          >
            Best of 3
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-slate-300">
            Add Game Results
          </h3>

          <div className="grid grid-cols-[1fr_140px] gap-4">
            <div
              className={`rounded-xl border bg-slate-900 p-3 ${errorClass(
                'games'
              )}`}
            >
              <div className="space-y-3">
                {Array.from({ length: visibleGameCount }).map((_, index) => {
                  const result = games[index]

                  return (
                    <div
                      key={index}
                      className="flex min-h-[64px] items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          Game {index + 1}
                        </span>

                        {result && (
                          <span
                            className={`text-sm font-bold ${
                              result === 'W'
                                ? 'text-green-300'
                                : result === 'L'
                                ? 'text-red-300'
                                : 'text-yellow-300'
                            }`}
                          >
                            {result}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleGameStart(index)}
                        className="rounded-full border border-slate-600 bg-slate-900 px-4 py-1 text-sm font-semibold hover:bg-slate-700"
                      >
                        {gameStarts[index] ?? '1st'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
              <div className="grid gap-3">
                <button
                  onClick={() => toggleGameResult('W')}
                  className="min-h-[64px] rounded-xl bg-green-500 px-4 py-4 text-lg font-bold hover:bg-green-600"
                >
                  Win
                </button>

                <button
                  onClick={() => toggleGameResult('L')}
                  className="min-h-[64px] rounded-xl bg-red-500 px-4 py-4 text-lg font-bold hover:bg-red-600"
                >
                  Loss
                </button>

                <button
                  onClick={() => toggleGameResult('T')}
                  className="min-h-[64px] rounded-xl bg-yellow-400 px-4 py-4 text-lg font-bold text-black hover:bg-yellow-500"
                >
                  Tie
                </button>

                <button
                  onClick={clearGames}
                  className="min-h-[64px] rounded-xl bg-slate-700 px-4 py-4 text-lg font-bold hover:bg-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        <TextareaField
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          expandable
          rows={1}
          placeholder="Match Notes (optional)"
          className="min-h-[56px] py-4"
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={clearCurrentMatch}
            className="rounded-xl bg-slate-700 px-4 py-4 font-bold hover:bg-slate-600"
          >
            {clearSuccess ? 'Cleared!' : 'Clear Match'}
          </button>

          <button
            onClick={saveMatch}
            className="rounded-xl bg-purple-500 px-4 py-4 font-bold hover:bg-purple-600"
          >
            {saveSuccess ? 'Saved!' : 'Save Match'}
          </button>
        </div>
      </div>
    </Panel>
  )
}
