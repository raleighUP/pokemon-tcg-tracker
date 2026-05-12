import { Deck } from '@/types'

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

  toggleGameResult: (result: string) => void

  saveMatch: () => void
  matchType: 'BO1' | 'BO3'
  setMatchType: (value: 'BO1' | 'BO3') => void

  clearGames: () => void
  startNewEvent: () => void
  nextRound: () => void
  clearEvent: () => void
  clearCurrentMatch: () => void
roundSuccess: boolean
eventSuccess: boolean
clearSuccess: boolean
  saveSuccess: boolean
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
  toggleGameResult,
  clearGames,
  saveMatch,
  clearCurrentMatch,
  startNewEvent,
  nextRound,
  clearEvent,
  saveSuccess,
roundSuccess,
eventSuccess,
clearSuccess,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
     <div className="relative mb-4">
  <h2 className="text-2xl font-bold mb-4">
    Log Match
  </h2>

  {saveSuccess && (
    <div className="absolute top-0 right-0 bg-green-500/20 border border-green-500 text-green-300 px-3 py-1 rounded-lg text-sm font-semibold animate-pulse pointer-events-none">
      Match Saved ✓
    </div>
  )}

  {!saveSuccess && roundSuccess && (
    <div className="absolute top-0 right-0 bg-purple-500/20 border border-purple-500 text-purple-300 px-3 py-1 rounded-lg text-sm font-semibold animate-pulse pointer-events-none">
      Next Round →
    </div>
  )}

  {!saveSuccess &&
    !roundSuccess &&
    eventSuccess && (
      <div className="absolute top-0 right-0 bg-blue-500/20 border border-blue-500 text-blue-300 px-3 py-1 rounded-lg text-sm font-semibold animate-pulse pointer-events-none">
        New Event ✓
      </div>
    )}

  {!saveSuccess &&
    !roundSuccess &&
    !eventSuccess &&
    clearSuccess && (
      <div className="absolute top-0 right-0 bg-red-500/20 border border-red-500 text-red-300 px-3 py-1 rounded-lg text-sm font-semibold animate-pulse pointer-events-none">
        Match Cleared ✕
      </div>
    )}
</div> 

      <div className="space-y-4">

        {/* SAVE SUCCESS FEEDBACK */}
        {/* EVENT */}
        <div className="space-y-2">
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Event Name"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={startNewEvent}
              className="bg-blue-500 hover:bg-blue-600 py-2 rounded-lg font-semibold"
            >
              New Event
            </button>

            <button
              onClick={nextRound}
              className="bg-purple-500 hover:bg-purple-600 py-2 rounded-lg font-semibold"
            >
              Next Round
            </button>
          </div>
        </div>

        {/* FORMAT */}
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        >
          <option value="">Select Format</option>
          <option value="Perfect Order">Perfect Order</option>
          <option value="Standard">Standard</option>
          <option value="Expanded">Expanded</option>
          <option value="Gym Leader Challenge">Gym Leader Challenge</option>
        </select>

        {/* DECK */}
        <select
          value={selectedMatchDeck}
          onChange={(e) => setSelectedMatchDeck(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        >
          <option value="">Select Your Deck</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.name}>
              {deck.name}
            </option>
          ))}
        </select>

        {/* OPPONENT */}
        <input
          type="text"
          value={opponentDeck}
          onChange={(e) => setOpponentDeck(e.target.value)}
          placeholder="Opponent Deck"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        />

        {/* MATCH TYPE */}
        <div>

          <div className="flex gap-2">
            <button
              onClick={() => setMatchType('BO1')}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                matchType === 'BO1'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-white'
              }`}
            >
              Best of 1
            </button>

            <button
              onClick={() => setMatchType('BO3')}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                matchType === 'BO3'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-white'
              }`}
            >
              Best of 3
            </button>
          </div>
        </div>

        {/* GAME INPUTS */}
        <div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => toggleGameResult('W')}
              className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg font-semibold"
            >
              Win
            </button>

            <button
              onClick={() => toggleGameResult('L')}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold"
            >
              Loss
            </button>

            <button
              onClick={() => toggleGameResult('T')}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
            >
              Tie
            </button>
          </div>
        </div>

        {/* CURRENT MATCH */}
        <div className="bg-slate-800 rounded-xl p-4">

          <div className="space-y-2">
            {Array.from({
              length: matchType === 'BO1' ? 1 : 3,
            }).map((_, index) => {
              const result = games[index]

              return (
                <div
                  key={index}
                  className="flex items-center justify-between bg-slate-700 rounded-lg px-4 py-2"
                >
                  <span className="font-medium">
                    Game {index + 1}
                  </span>

                  <span
                    className={`font-bold ${
                      result === 'W'
                        ? 'text-green-400'
                        : result === 'L'
                        ? 'text-red-400'
                        : result === 'T'
                        ? 'text-yellow-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {result || '-'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={clearCurrentMatch}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition"
          >
            Clear Match
          </button>

         <button
  onClick={saveMatch}
  className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-xl hover:scale-[1.02] transition"
>
  Save Match
</button> 
        </div>
      </div>
    </div>
  )
}