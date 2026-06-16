import { Match } from '@/types'
import {
  Button,
  FieldLabel,
  NumberInput,
  TextareaField,
  TextInput,
  ValidationMessage,
} from '@/components/ui'

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
        <FieldLabel className="text-slate-400">
          Round
        </FieldLabel>

        <NumberInput
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
          invalid={!isRoundValid}
          className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        {!isRoundValid && (
          <ValidationMessage>
            Enter a round number before saving.
          </ValidationMessage>
        )}
      </div>

      <div>
        <FieldLabel className="text-slate-400">
          Opponent Deck
        </FieldLabel>

        <TextInput
          value={editingMatch.opponentDeck}
          onChange={(e) =>
            setEditingMatch({
              ...editingMatch,
              opponentDeck: e.target.value,
            })
          }
        />
      </div>

      <div>
        <FieldLabel className="text-slate-400">
          Notes
        </FieldLabel>

        <TextareaField
          value={editingMatch.notes || ''}
          onChange={(e) =>
            setEditingMatch({
              ...editingMatch,
              notes: e.target.value,
            })
          }
          className="min-h-[100px]"
        />
      </div>

      <div>
        <FieldLabel className="text-slate-400">
          Game Results
        </FieldLabel>

        <div className="flex gap-2 flex-wrap">
          {editingMatch.games.map((game, index) => (
            <Button
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
              size="sm"
              className={`${
                game === 'W'
                  ? 'bg-green-500'
                  : game === 'L'
                  ? 'bg-red-500'
                  : 'bg-yellow-500 text-black'
              }`}
            >
              Game {index + 1}: {game}
            </Button>
          ))}

          {editingMatch.games.length === 2 &&
            !(
              editingMatch.games[0] === editingMatch.games[1] &&
              editingMatch.games[0] !== 'T'
            ) && (
              <Button
                onClick={() => {
                  setEditingMatch({
                    ...editingMatch,
                    games: [...editingMatch.games, 'W'],
                  })
                }}
                tone="ghost"
                size="sm"
              >
                + Game 3
              </Button>
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
        <Button
          onClick={() => {
            if (!isRoundValid) {
              return
            }

            editMatch(editingMatch)
            setEditingMatch(null)
          }}
          disabled={!isFormValid}
          tone="success"
          className="flex-1"
        >
          Save Changes
        </Button>

        <Button
          onClick={() => {
            setEditingMatch(null)
          }}
          tone="secondary"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
