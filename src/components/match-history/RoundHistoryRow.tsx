import { useState } from 'react'
import { Match } from '@/types'
import {
  DisclosureAction,
  DisclosureContent,
  IconButton,
  NestedPanel,
  ResultPill,
  StatusBadge,
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
      <div className="bg-slate-900/70 p-4">
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
    <div className="bg-slate-900/70">
      <div className="relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 flex w-36 items-stretch justify-end">
          <button
            onClick={() => {
              setEditingMatch(match)
              setOpenMenuId(null)
            }}
            className="w-16 bg-blue-600/90 text-xs font-bold text-white transition duration-200 hover:bg-blue-500"
          >
            Edit
          </button>

          <button
            onClick={() => {
              deleteMatch(match.id)
              setOpenMenuId(null)
            }}
            className="w-20 bg-red-700/90 text-xs font-bold text-white transition duration-200 hover:bg-red-600"
          >
            Delete
          </button>
        </div>

        <div
          className={`relative bg-slate-900/95 px-4 py-3 transition-transform duration-200 ease-out ${
            actionsOpen ? '-translate-x-36' : 'translate-x-0'
          }`}
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
              <div className="mb-1 flex items-center gap-2">
                <StatusBadge
                  className={`ring-1 ${roundToneClasses[roundResult]}`}
                >
                  {roundResult}
                </StatusBadge>

                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Round {match.round}
                </span>
              </div>

              <p className="truncate text-sm font-semibold text-white">
                {match.opponentDeck}
              </p>

              {hasNotes && (
                <button
                  onClick={() =>
                    setOpenNotesId(notesOpen ? null : match.id)
                  }
                  className="mt-1 transition duration-200 hover:text-blue-200"
                >
                  <DisclosureAction
                    open={notesOpen}
                    openLabel="View notes"
                    closeLabel="Hide notes"
                  />
                </button>
              )}

              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Swipe left
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="mb-1 flex justify-end gap-1">
                  {match.games.map((game, index) => (
                    <ResultPill
                      key={index}
                      result={game}
                      className="h-6 min-w-6 px-1.5 text-[11px]"
                    />
                  ))}
                </div>

                <p className="text-lg font-bold leading-none text-slate-100">
                  {runningRecordLabel}
                </p>
              </div>

              <IconButton
                onClick={() =>
                  setOpenMenuId(actionsOpen ? null : match.id)
                }
                className="h-11 w-11 rounded-[8px] text-lg font-bold leading-none text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Round actions"
              >
                ...
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      <DisclosureContent open={notesOpen && hasNotes}>
        <NestedPanel className="mx-4 mb-4 mt-1 border-slate-700/80 bg-slate-950/80 p-3 text-sm text-slate-300">
          <div className="whitespace-pre-wrap">{match.notes}</div>
        </NestedPanel>
      </DisclosureContent>
    </div>
  )
}
