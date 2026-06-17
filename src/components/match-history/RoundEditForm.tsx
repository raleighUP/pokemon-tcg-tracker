import { Match } from '@/types'
import {
  Button,
  FieldLabel,
  NestedPanel,
  NumberInput,
  StatusBadge,
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
    <NestedPanel variant="compact" className="space-y-4 p-4">
      <div>
        <StatusBadge className="bg-[rgba(23,107,181,0.15)] text-[#b7dcfb]">
          Edit Round
        </StatusBadge>
        <h3 className="type-section-title mt-2 text-[var(--text-primary)]">
          Round {editingMatch.round || ''}
        </h3>
      </div>

      <div>
        <FieldLabel>
          Round
        </FieldLabel>

        <NumberInput
          min="1"
          value={editingMatch.round ?? ''}
          aria-label="Round"
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
          inputMode="numeric"
          enterKeyHint="next"
          className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        {!isRoundValid && (
          <ValidationMessage>
            Enter a round number before saving.
          </ValidationMessage>
        )}
      </div>

      <div>
        <FieldLabel>
          Opponent Deck
        </FieldLabel>

        <TextInput
          value={editingMatch.opponentDeck}
          aria-label="Opponent deck"
          onChange={(e) =>
            setEditingMatch({
              ...editingMatch,
              opponentDeck: e.target.value,
            })
          }
          inputMode="search"
          enterKeyHint="next"
        />
      </div>

      <div>
        <FieldLabel>
          Notes
        </FieldLabel>

        <TextareaField
          value={editingMatch.notes || ''}
          aria-label="Notes"
          onChange={(e) =>
            setEditingMatch({
              ...editingMatch,
              notes: e.target.value,
            })
          }
          enterKeyHint="done"
          className="min-h-[100px]"
        />
      </div>

      <div>
        <FieldLabel>
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
              className={`rounded-full px-4 ${
                game === 'W'
                  ? 'bg-[var(--color-success)] text-white'
                  : game === 'L'
                  ? 'bg-[var(--color-error)] text-white'
                  : 'bg-[var(--color-warning)] text-black'
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
            <p className="type-helper mt-2 text-[var(--text-muted)]">
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
          tone="primary"
          className="min-h-[52px] flex-1 rounded-2xl"
        >
          Save Changes
        </Button>

        <Button
          onClick={() => {
            setEditingMatch(null)
          }}
          tone="secondary"
          className="min-h-[52px] flex-1 rounded-2xl"
        >
          Cancel
        </Button>
      </div>
    </NestedPanel>
  )
}
