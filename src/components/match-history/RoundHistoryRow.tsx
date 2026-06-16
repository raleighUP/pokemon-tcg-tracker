import { useState } from 'react'
import { Match } from '@/types'
import {
  DisclosureAction,
  DisclosureContent,
  IconButton,
  NestedPanel,
  ResultPill,
  StatusBadge,
  cn,
} from '@/components/ui'
import RoundEditForm from './RoundEditForm'

type RoundResult = 'W' | 'L' | 'T'

type Props = {
  match: Match
  roundResult: RoundResult
  runningRecord: {
    wins: number
    losses: number
    ties: number
  }
  editingMatch: Match | null
  openMenuId: number | null
  openNotesId: number | null
  isRoundValid: boolean
  isFormValid: boolean
  setEditingMatch: (match: Match | null) => void
  setOpenMenuId: (id: number | null) => void
  setOpenNotesId: (id: number | null) => void
  editMatch: (match: Match) => void
  deleteMatch: (id: number) => void
}

const roundToneClasses: Record<RoundResult, string> = {
  W: 'bg-green-500/15 text-green-200 ring-green-400/30',
  L: 'bg-red-500/15 text-red-200 ring-red-400/30',
  T: 'bg-yellow-400/15 text-yellow-100 ring-yellow-300/30',
}

const resultLabels: Record<RoundResult, string> = {
  W: 'Win',
  L: 'Loss',
  T: 'Tie',
}

export default function RoundHistoryRow({
  match,
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
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const actionsOpen = openMenuId === match.id
  const notesOpen = openNotesId === match.id
  const hasNotes = Boolean(match.notes?.trim())
  const runningRecordLabel = `${runningRecord.wins}-${runningRecord.losses}${
    runningRecord.ties > 0 ? `-${runningRecord.ties}` : ''
  }`

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
    <div className="bg-black/15">
      <div className="relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 flex w-36 items-stretch justify-end">
          <button
            onClick={() => {
              setEditingMatch(match)
              setOpenMenuId(null)
            }}
            className="motion-press w-16 bg-blue-600/90 text-xs font-bold text-white hover:bg-blue-500"
          >
            Edit
          </button>

          <button
            onClick={() => {
              deleteMatch(match.id)
              setOpenMenuId(null)
            }}
            className="motion-press w-20 bg-red-700/90 text-xs font-bold text-white hover:bg-red-600"
          >
            Delete
          </button>
        </div>

        <div
          className={cn(
            'motion-surface relative bg-black/28 px-4 py-3.5',
            actionsOpen ? '-translate-x-36' : 'translate-x-0'
          )}
          onTouchStart={(event) => {
            setTouchStartX(event.touches[0].clientX)
          }}
          onTouchEnd={(event) => {
            if (touchStartX === null) return

            const deltaX = event.changedTouches[0].clientX - touchStartX

            if (deltaX < -40) {
              setOpenMenuId(match.id)
            }

            if (deltaX > 40) {
              setOpenMenuId(null)
            }

            setTouchStartX(null)
          }}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge
                  className={`px-2.5 py-1 ring-1 ${roundToneClasses[roundResult]}`}
                >
                  {resultLabels[roundResult]}
                </StatusBadge>

                <span className="type-metadata text-[var(--text-muted)]">
                  Round {match.round}
                </span>

                {hasNotes && (
                  <span className="type-metadata rounded-full bg-white/7 px-2 py-1 text-[var(--text-subtle)]">
                    Notes
                  </span>
                )}
              </div>

              <p className="type-card-title truncate text-[var(--text-primary)]">
                {match.opponentDeck}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {match.games.map((game, index) => (
                  <span
                    key={`${game}-${index}`}
                    className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.045] px-2 py-1"
                  >
                    <span className="type-metadata text-[var(--text-subtle)]">
                      G{index + 1}
                    </span>
                    <ResultPill
                      result={game}
                      className="h-5 min-w-5 px-1 text-[10px]"
                    />
                    <span className="type-metadata text-[var(--text-muted)]">
                      {match.gameStarts[index] ?? '1st'}
                    </span>
                  </span>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-3">
                {hasNotes && (
                  <button
                    onClick={() =>
                      setOpenNotesId(notesOpen ? null : match.id)
                    }
                    className="motion-press rounded-full hover:text-blue-200"
                  >
                    <DisclosureAction
                      open={notesOpen}
                      openLabel="View notes"
                      closeLabel="Hide notes"
                    />
                  </button>
                )}

                <p className="type-metadata text-[var(--text-subtle)]">
                  Swipe left for actions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[1.35rem] font-[760] leading-none text-slate-100">
                  {runningRecordLabel}
                </p>
                <p className="type-metadata mt-1 text-[var(--text-subtle)]">
                  record
                </p>
              </div>

              <IconButton
                onClick={() =>
                  setOpenMenuId(actionsOpen ? null : match.id)
                }
                className="h-11 w-11 rounded-xl text-lg font-bold leading-none text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Round actions"
              >
                ...
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      <DisclosureContent open={notesOpen && hasNotes}>
        <NestedPanel className="mx-4 mb-4 mt-1 rounded-2xl border-white/8 bg-white/[0.035] p-3">
          <p className="type-metadata mb-2 text-[var(--text-subtle)]">
            Round notes
          </p>
          <div className="type-helper whitespace-pre-wrap text-[var(--text-secondary)]">
            {match.notes}
          </div>
        </NestedPanel>
      </DisclosureContent>
    </div>
  )
}
