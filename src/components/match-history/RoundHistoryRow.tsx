import { useState } from 'react'
import { Match } from '@/types'
import {
  ContextActionSheet,
  DisclosureContent,
  NestedPanel,
  ResultPill,
  StatusBadge,
  SwipeActionRow,
} from '@/components/ui'
import RoundEditForm from './RoundEditForm'

type RoundResult = 'W' | 'L' | 'T'

type Props = {
  match: Match
  openKey: string
  roundLabel: string
  roundResult: RoundResult
  runningRecord: {
    wins: number
    losses: number
    ties: number
  }
  editingMatch: Match | null
  openMenuId: number | null
  openNotesId: string | null
  isRoundValid: boolean
  isFormValid: boolean
  setEditingMatch: (match: Match | null) => void
  setOpenMenuId: (id: number | null) => void
  setOpenNotesId: (id: string | null) => void
  editMatch: (match: Match) => void
  deleteMatch: (id: number) => void
}

const roundToneClasses: Record<RoundResult, string> = {
  W: 'bg-[rgba(47,116,59,0.16)] text-[#b8dfbe] ring-[rgba(47,116,59,0.35)]',
  L: 'bg-[rgba(160,24,24,0.16)] text-[#e9b6b6] ring-[rgba(160,24,24,0.35)]',
  T: 'bg-[rgba(220,192,65,0.14)] text-[#f4e392] ring-[rgba(220,192,65,0.35)]',
}

const resultLabels: Record<RoundResult, string> = {
  W: 'Win',
  L: 'Loss',
  T: 'Tie',
}

function DiceMark({ active }: { active: boolean }) {
  return (
    <span
      aria-label={active ? 'Won dice roll' : 'Did not win dice roll'}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
          : 'border-white/10 bg-white/5 text-[var(--text-muted)]'
      }`}
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
  runningRecord,
  editingMatch,
  openMenuId,
  openNotesId,
  isRoundValid,
  isFormValid,
  setEditingMatch,
  setOpenMenuId,
  setOpenNotesId,
  editMatch,
  deleteMatch,
}: Props) {
  const [contextOpen, setContextOpen] = useState(false)
  const actionsOpen = openMenuId === match.id
  const detailsOpen = openNotesId === openKey
  const hasNotes = Boolean(match.notes?.trim())
  const runningRecordLabel = `${runningRecord.wins}-${runningRecord.losses}${
    runningRecord.ties > 0 ? `-${runningRecord.ties}` : ''
  }`

  const startEdit = () => {
    setEditingMatch(match)
    setOpenMenuId(null)
  }

  const confirmDelete = () => {
    if (window.confirm(`Delete round ${match.round}?`)) {
      deleteMatch(match.id)
    }
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
    <div className="rounded-2xl bg-black/15">
      <SwipeActionRow
        open={actionsOpen}
        onOpenChange={(open) => setOpenMenuId(open ? match.id : null)}
        onContextOpen={() => setContextOpen(true)}
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
        className="rounded-2xl"
        contentClassName="rounded-2xl"
      >
        <button
          type="button"
          onClick={() => setOpenNotesId(detailsOpen ? null : openKey)}
          className="motion-press grid min-h-[58px] w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-black/28 px-3 py-2.5 text-left hover:bg-white/[0.04]"
          aria-expanded={detailsOpen}
        >
          <span className="flex flex-col items-start gap-1">
            <span className="type-metadata text-[var(--text-secondary)]">
              {roundLabel}
            </span>
            {hasNotes && (
              <span
                aria-hidden="true"
                className={`ml-0.5 h-2 w-2 border-b-2 border-r-2 border-[var(--text-muted)] transition-transform duration-[var(--motion-base)] ${
                  detailsOpen ? 'rotate-[-135deg]' : 'rotate-45'
                }`}
              />
            )}
          </span>

          <span className="min-w-0">
            <span className="type-card-title block truncate text-[var(--text-primary)]">
              {match.opponentDeck}
            </span>
            <span className="scrollbar-none mt-1 flex flex-nowrap gap-1.5 overflow-x-auto pr-1">
              {match.games.map((game, index) => (
                <span
                  key={`${game}-${index}`}
                  className="inline-flex shrink-0 items-center gap-1"
                >
                  <ResultPill
                    result={game}
                    className="h-6 min-w-6 px-1.5 text-[11px]"
                  />
                  <DiceMark active={Boolean(match.diceRollWins?.[index])} />
                </span>
              ))}
            </span>
          </span>

          <span className="flex items-center gap-2">
            <StatusBadge
              className={`px-2.5 py-1 ring-1 ${roundToneClasses[roundResult]}`}
            >
              {resultLabels[roundResult]}
            </StatusBadge>
          </span>
        </button>
      </SwipeActionRow>

      <DisclosureContent open={detailsOpen}>
        <NestedPanel className="mx-3 mb-3 mt-1 rounded-2xl border-white/8 bg-white/[0.035] p-3">
          <div className="space-y-2">
            {match.games.map((game, index) => (
              <div
                key={`${game}-${index}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="type-metadata text-[var(--text-muted)]">
                  Game {index + 1}
                </span>
                <span className="flex items-center gap-2">
                  <ResultPill
                    result={game}
                    className="h-6 min-w-6 px-1.5 text-[11px]"
                  />
                  <span className="type-metadata text-[var(--text-secondary)]">
                    Went {match.gameStarts[index] ?? '1st'}
                  </span>
                  <DiceMark active={Boolean(match.diceRollWins?.[index])} />
                </span>
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

      <ContextActionSheet
        open={contextOpen}
        onClose={() => setContextOpen(false)}
        title={`Round ${match.round}`}
        subtitle={match.opponentDeck}
        ariaLabel="round actions"
        details={[
          { label: 'Result', value: match.finalResult },
          { label: 'Running Record', value: runningRecordLabel },
          { label: 'Match Type', value: match.matchType },
          { label: 'Notes', value: hasNotes ? 'Yes' : 'None' },
        ]}
        actions={[
          {
            label: 'Edit',
            tone: 'secondary',
            onSelect: startEdit,
          },
          {
            label: 'Delete',
            tone: 'danger',
            onSelect: confirmDelete,
          },
        ]}
      >
        <div className="surface-card-elevated rounded-2xl border border-[var(--surface-border)] p-3">
          <p className="type-metadata mb-2 text-[var(--text-muted)]">
            Games
          </p>
          <div className="space-y-2">
            {match.games.map((game, index) => (
              <div
                key={`${game}-${index}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="type-card-title text-[var(--text-primary)]">
                  Game {index + 1}
                </span>
                <span className="type-metadata text-[var(--text-muted)]">
                  {game} - went {match.gameStarts[index] ?? '1st'}
                </span>
              </div>
            ))}
          </div>

          {hasNotes && (
            <div className="type-helper mt-3 whitespace-pre-wrap border-t border-white/10 pt-3 text-[var(--text-secondary)]">
              {match.notes}
            </div>
          )}
        </div>
      </ContextActionSheet>
    </div>
  )
}
