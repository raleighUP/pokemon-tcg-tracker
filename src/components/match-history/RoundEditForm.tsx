import { Match } from '@/types'

type Props = {
  editingMatch: Match
  isRoundValid: boolean
  isFormValid: boolean
  setEditingMatch: (match: Match | null) => void
  editMatch: (match: Match) => void
}

export default function RoundEditForm({
  editingMatch,
  isRoundValid,
  isFormValid,
  setEditingMatch,
  editMatch,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-slate-400 block mb-1">
          Round
        </label>

        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={editingMatch.round ?? ''}
          onChange={(e) => {
            setEditingMatch({
              ...editingMatch,
              round:
                e.target.value === ''
                  ? ('' as unknown as number)
                  : Number(e.target.value),
            })
          }}
          className={`w-full bg-slate-800 border rounded-xl px-4 py-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            !isRoundValid
              ? 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500'
              : 'border-slate-700'
          }`}
        />

        {!isRoundValid && (
          <p className="text-red-400 text-sm mt-1">
            Enter a round number before saving.
          </p>
        )}
      </div>

      <div>
        <label className="text-sm text-slate-400 block mb-1">
          Opponent Deck
        </label>

        <input
          type="text"
          value={editingMatch.opponentDeck}
          onChange={(e) =>
            setEditingMatch({
              ...editingMatch,
              opponentDeck: e.target.value,
            })
          }
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
        />
      </div>

      <div>
        <label className="text-sm text-slate-400 block mb-1">
          Notes
        </label>

        <textarea
          value={editingMatch.notes || ''}
          onChange={(e) =>
            setEditingMatch({
              ...editingMatch,
              notes: e.target.value,
            })
          }
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 min-h-[100px]"
        />
      </div>

      <div>
        <label className="text-sm text-slate-400 block mb-2">
          Game Results
        </label>

        <div className="flex gap-2 flex-wrap">
          {editingMatch.games.map((game, index) => (
            <button
              key={index}
              onClick={() => {
                const updatedGames = [...editingMatch.games]

                updatedGames[index] =
                  game === 'W'
                    ? 'L'
                    : game === 'L'
                    ? 'T'
                    : 'W'

                setEditingMatch({
                  ...editingMatch,
                  games: updatedGames,
                })
              }}
              className={`px-4 py-2 rounded-xl font-semibold ${
                game === 'W'
                  ? 'bg-green-500'
                  : game === 'L'
                  ? 'bg-red-500'
                  : 'bg-yellow-500 text-black'
              }`}
            >
              Game {index + 1}: {game}
            </button>
          ))}

          {editingMatch.games.length === 2 &&
            !(
              editingMatch.games[0] === editingMatch.games[1] &&
              editingMatch.games[0] !== 'T'
            ) && (
              <button
                onClick={() => {
                  setEditingMatch({
                    ...editingMatch,
                    games: [...editingMatch.games, 'W'],
                  })
                }}
                className="px-4 py-2 rounded-xl font-semibold bg-slate-700 hover:bg-slate-600 transition"
              >
                + Game 3
              </button>
            )}
        </div>

        {editingMatch.games.length === 2 &&
          !(
            editingMatch.games[0] === editingMatch.games[1] &&
            editingMatch.games[0] !== 'T'
          ) && (
            <p className="text-slate-400 text-sm mt-2">
              This match is not finalized yet. Add Game 3 if needed.
            </p>
          )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => {
            if (!isRoundValid) {
              return
            }

            editMatch(editingMatch)
            setEditingMatch(null)
          }}
          disabled={!isFormValid}
          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 py-3 rounded-xl font-semibold transition"
        >
          Save Changes
        </button>

        <button
          onClick={() => {
            setEditingMatch(null)
          }}
          className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
