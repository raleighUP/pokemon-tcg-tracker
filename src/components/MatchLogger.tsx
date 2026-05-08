import { Deck } from '@/types'

type Props = {
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
}

export default function MatchLogger({
  selectedMatchDeck,
  setSelectedMatchDeck,
  opponentDeck,
  setOpponentDeck,
  format,
  setFormat,
  decks,
  games,
  toggleGameResult,
  saveMatch,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-4">
        Log Match
      </h2>

      <div className="space-y-4">

        <select
          value={selectedMatchDeck}
          onChange={(e) =>
            setSelectedMatchDeck(e.target.value)
          }
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        >
          <option value="">Select Your Deck</option>

          {decks.map((deck) => (
            <option key={deck.id} value={deck.name}>
              {deck.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={opponentDeck}
          onChange={(e) =>
            setOpponentDeck(e.target.value)
          }
          placeholder="Opponent Deck"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        />

        <input
          type="text"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          placeholder="Format"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        />

        <div>
          <p className="mb-2 text-slate-300">
            Add Game Results
          </p>

          <div className="flex gap-2">
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
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-slate-300 mb-2">
            Current Match:
          </p>

          <div className="flex gap-2">
            {games.map((game, index) => (
              <div
                key={index}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  game === 'W'
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
              >
                {game}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={saveMatch}
          className="w-full bg-yellow-400 text-black font-semibold py-3 rounded-xl hover:scale-[1.02] transition"
        >
          Save Match
        </button>
      </div>
    </div>
  )
}