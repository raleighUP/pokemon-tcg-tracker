import { useState } from 'react'
import { Match } from '@/types'
import {
  ConfirmationDialog,
  DisclosureContent,
  NestedPanel,
  ResultPill,
  StatusBadge,
  SwipeActionRow,
} from '@/components/ui'
import RoundEditForm from './RoundEditForm'
import DeckIdentity from '@/components/DeckIdentity'
import {
  getMatchDisplayResult,
  type RoundResult,
} from '@/utils/match-results'

type Props = {
  match: Match
  openKey: string
  roundLabel: string
  roundResult: RoundResult
  editingMatch: Match | null
  actionsOpen: boolean
  openNotesId: string | null
  isRoundValid: boolean
  isFormValid: boolean
  setEditingMatch: (match: Match | null) => void
  setActionsOpen: (open: boolean) => void
  setOpenNotesId: (id: string | null) => void
  editMatch: (match: Match) => void
  deleteMatch: (id: number) => void
}

const roundToneClasses: Record<RoundResult, string> = {
  W: 'bg-[var(--success-soft)] text-[var(--success-text)] ring-[var(--success-border)]',
  L: 'bg-[var(--loss-soft)] text-[var(--loss-text)] ring-[var(--loss-border)]',
  T: 'bg-[var(--tie-soft)] text-[var(--tie-text)] ring-[var(--tie-border)]',
}

const roundCardToneClasses: Record<RoundResult, string> = {
  W: 'border-[var(--success-border)] bg-[var(--success-soft)]',
  L: 'border-[var(--loss-border)] bg-[var(--loss-soft)]',
  T: 'border-[var(--tie-border)] bg-[var(--tie-soft)]',
}

const resultLabels: Record<RoundResult, string> = {
  W: 'Win',
  L: 'Loss',
  T: 'Tie',
}

function DiceMark() {
  return (
    <span
      aria-label="Won opening toss"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-3 w-3"
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
    </span>
  )
}

export default function RoundHistoryRow({
  match,
  openKey,
  roundLabel,
  roundResult,
  editingMatch,
  actionsOpen,
  openNotesId,
  isRoundValid,
  isFormValid,
  setEditingMatch,
  setActionsOpen,
  setOpenNotesId,
  editMatch,
  deleteMatch,
}: Props) {
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
  const detailsOpen = openNotesId === openKey
  const hasNotes = Boolean(match.notes?.trim())
  const displayResult = getMatchDisplayResult(match)

  const startEdit = () => {
    setEditingMatch(match)
    setActionsOpen(false)
  }

  const confirmDelete = () => {
    setDeleteConfirmationOpen(true)
  }

  if (editingMatch?.id === match.id) {
    return (
      <div className="bg-black/20 p-4">
        <RoundEditForm
          editingMatch={editingMatch}
          isRoundValid={isRoundValid}
          isFormValid={isFormValid}
          setEditingMatch={setEditingMatch}
          editMatch={editMatch}
        />
      </div>
    )
  }

  return (
    <div className={`overflow-hidden rounded-2xl border ${roundCardToneClasses[roundResult]}`}>
      <SwipeActionRow
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        actions={[
          {
            label: 'Edit',
            tone: 'edit',
            onSelect: startEdit,
          },
          {
            label: 'Delete',
            tone: 'delete',
            onSelect: confirmDelete,
          },
        ]}
        surface="solid"
        contentClassName="bg-transparent"
      >
        <button
          type="button"
          onClick={() => setOpenNotesId(detailsOpen ? null : openKey)}
          className="grid min-h-[58px] w-full grid-cols-[1.65rem_minmax(0,1fr)_auto] items-center gap-1.5 rounded-2xl px-2.5 py-2 text-left transition-colors duration-[var(--motion-fast)] hover:bg-white/[0.04] sm:gap-2 sm:px-3"
          aria-expanded={detailsOpen}
          aria-label={`${roundLabel}, ${match.alternateOutcome === 'bye' ? 'No opponent' : match.opponentDeck}, ${displayResult}, ${resultLabels[roundResult]}. ${detailsOpen ? 'Hide' : 'Show'} round details`}
        >
          <span className="flex flex-col items-start gap-1">
            <span className="type-metadata text-[var(--text-secondary)]">
              {roundLabel}
            </span>
          </span>

          <span className="min-w-0">
            <DeckIdentity
              name={
                match.alternateOutcome === 'bye'
                  ? 'No opponent'
                  : match.opponentDeck
              }
              spriteSource={match.opponentDeck}
              size="standard"
              maxSprites={3}
              spritePosition="end"
              bareSprites
              className="type-card-title text-[var(--text-primary)]"
            />
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            <StatusBadge
              className={`whitespace-nowrap px-2 py-1 ring-1 ${roundToneClasses[roundResult]}`}
            >
              {match.alternateOutcome
                ? displayResult.toUpperCase()
                : displayResult}
            </StatusBadge>
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 border-b-2 border-r-2 border-[var(--text-muted)] transition-transform duration-[var(--motion-base)] ${
                detailsOpen ? 'rotate-[-135deg]' : 'rotate-45'
              }`}
            />
          </span>
        </button>
      </SwipeActionRow>

      <DisclosureContent open={detailsOpen}>
        <NestedPanel className="mx-2 mb-2 mt-0 rounded-xl border-white/8 bg-white/[0.035] p-3 sm:mx-3 sm:mb-3">
          <div className="space-y-2">
            {match.alternateOutcome && (
              <div className="type-helper text-[var(--text-secondary)]">
                {match.alternateOutcome === 'intentionalDraw'
                  ? 'Intentional draw — no games played.'
                  : match.alternateOutcome === 'noShow'
                    ? 'Opponent no show — tournament win, no games played.'
                    : 'Bye — tournament win, no opponent or games recorded.'}
              </div>
            )}
            {match.games.map((game, index) => (
              <div
                key={`${game}-${index}`}
                className="grid grid-cols-[3.5rem_1.5rem_minmax(0,1fr)_auto] items-center gap-2"
              >
                <span className="type-metadata text-[var(--text-muted)]">
                  Game {index + 1}
                </span>
                {match.diceRollWins?.[index] ? <DiceMark /> : <span />}
                <span className="type-metadata truncate text-[var(--text-secondary)]">
                  Went {match.gameStarts[index] ?? '1st'}
                </span>
                <ResultPill result={game} className="h-6 min-w-6 px-1.5 text-[11px]" />
              </div>
            ))}

            {hasNotes && (
              <div className="type-helper whitespace-pre-wrap border-t border-white/10 pt-2 text-[var(--text-secondary)]">
                {match.notes}
              </div>
            )}
          </div>
        </NestedPanel>
      </DisclosureContent>

      <ConfirmationDialog
        open={deleteConfirmationOpen}
        onClose={() => setDeleteConfirmationOpen(false)}
        onConfirm={() => deleteMatch(match.id)}
        title={`Delete round ${match.round}?`}
        description="This removes the round and its game results. This action cannot be undone."
      />

    </div>
  )
}
