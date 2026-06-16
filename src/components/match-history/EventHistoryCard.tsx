import { Deck, Match } from '@/types'
import {
  DisclosureAction,
  DisclosureContent,
  IconButton,
  MetricTile,
  MenuItem,
  OverflowMenu,
  StatusBadge,
  cn,
} from '@/components/ui'
import EventEditForm from './EventEditForm'
import RoundHistoryRow from './RoundHistoryRow'

type RoundResult = 'W' | 'L' | 'T'

type Props = {
  eventName: string
  matches: Match[]
  decks: Deck[]
  editingEvent: string | null
  editingMatch: Match | null
  openMenuId: number | null
  openNotesId: number | null
  isRoundValid: boolean
  isFormValid: boolean
  isCollapsed: boolean
  toggleCollapsed: () => void
  setEditingEvent: (value: string | null) => void
  setEditingMatch: (match: Match | null) => void
  setOpenMenuId: (id: number | null) => void
  setOpenNotesId: (id: number | null) => void
  editEvent: (
    oldEventName: string,
    updatedData: {
      eventName: string
      format: string
      deck: string
    }
  ) => void
  editMatch: (match: Match) => void
  deleteEvent: (eventName: string) => void
  deleteMatch: (id: number) => void
}

function getRoundResult(match: Match): RoundResult {
  const wins = match.games.filter((game) => game === 'W').length
  const losses = match.games.filter((game) => game === 'L').length

  if (wins > losses) return 'W'
  if (losses > wins) return 'L'

  return 'T'
}

export default function EventHistoryCard({
  eventName,
  matches,
  decks,
  editingEvent,
  editingMatch,
  openMenuId,
  openNotesId,
  isRoundValid,
  isFormValid,
  isCollapsed,
  toggleCollapsed,
  setEditingEvent,
  setEditingMatch,
  setOpenMenuId,
  setOpenNotesId,
  editEvent,
  editMatch,
  deleteEvent,
  deleteMatch,
}: Props) {
  const sortedMatches = [...matches].sort((a, b) => a.round - b.round)
  const firstMatch = sortedMatches[0]

  if (!firstMatch) return null

  let totalWins = 0
  let totalLosses = 0
  let totalTies = 0

  sortedMatches.forEach((match) => {
    const roundResult = getRoundResult(match)

    if (roundResult === 'W') totalWins++
    else if (roundResult === 'L') totalLosses++
    else totalTies++
  })

  let runningWins = 0
  let runningLosses = 0
  let runningTies = 0

  const eventRecord = `${totalWins}-${totalLosses}${
    totalTies > 0 ? `-${totalTies}` : ''
  }`
  const eventWinRate =
    sortedMatches.length === 0
      ? 0
      : (totalWins / sortedMatches.length) * 100
  const notesCount = sortedMatches.filter((match) =>
    match.notes?.trim()
  ).length
  const summaryTone =
    totalWins > totalLosses
      ? 'text-green-200'
      : totalLosses > totalWins
      ? 'text-red-200'
      : 'text-yellow-100'

  return (
    <div className="surface-secondary card-workflow motion-surface overflow-hidden rounded-[28px] border p-0">
      {editingEvent === eventName ? (
        <EventEditForm
          eventName={eventName}
          initialFormat={firstMatch?.format}
          initialDeck={firstMatch?.deck}
          decks={decks}
          onSave={(oldEventName, updatedData) => {
            editEvent(oldEventName, updatedData)
            setEditingEvent(null)
          }}
          onCancel={() => setEditingEvent(null)}
        />
      ) : (
        <div className="border-b border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge
                  className={cn(
                    'px-2.5 py-1 ring-1',
                    totalWins > totalLosses
                      ? 'bg-green-500/15 text-green-200 ring-green-400/30'
                      : totalLosses > totalWins
                      ? 'bg-red-500/15 text-red-200 ring-red-400/30'
                      : 'bg-yellow-400/15 text-yellow-100 ring-yellow-300/30'
                  )}
                >
                  {eventRecord}
                </StatusBadge>

                <span className="type-metadata text-[var(--text-muted)]">
                  {sortedMatches.length} rounds
                </span>
              </div>

              <h3 className="truncate text-[1.45rem] font-[760] leading-tight text-white">
                {eventName}
              </h3>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <span className="type-card-title max-w-full truncate text-[var(--text-secondary)]">
                  {firstMatch?.deck}
                </span>
                <span className="type-metadata text-[var(--text-muted)]">
                  {firstMatch?.format}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MetricTile
                  label="Win Rate"
                  value={`${eventWinRate.toFixed(0)}%`}
                  valueClassName={summaryTone}
                />

                <MetricTile
                  label="Rounds"
                  value={sortedMatches.length}
                />

                <MetricTile
                  label="Notes"
                  value={notesCount}
                />
              </div>
            </div>

            <div className="relative flex-shrink-0">
              <IconButton
                onClick={() =>
                  setOpenMenuId(
                    openMenuId === -firstMatch.id
                      ? null
                    : -firstMatch.id
                  )
                }
                className="h-11 w-11 rounded-xl text-lg font-bold leading-none text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Event actions"
              >
                ...
              </IconButton>

              <OverflowMenu
                open={openMenuId === -firstMatch.id}
                onClose={() => setOpenMenuId(null)}
              >
                <MenuItem
                  onClick={() => {
                    setEditingEvent(eventName)
                    setOpenMenuId(null)
                  }}
                >
                  Edit Event
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    deleteEvent(eventName)
                    setOpenMenuId(null)
                  }}
                  tone="danger"
                >
                  Delete Event
                </MenuItem>
              </OverflowMenu>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            className="motion-press mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-left hover:bg-white/[0.07]"
            aria-expanded={!isCollapsed}
          >
            <span className="type-metadata text-[var(--text-muted)]">
              Event review
            </span>

            <DisclosureAction
              open={!isCollapsed}
              openLabel="Show rounds"
              closeLabel="Hide rounds"
              className="text-[var(--text-secondary)]"
            />
          </button>
        </div>
      )}

      <DisclosureContent
        open={!isCollapsed || editingEvent === eventName}
        innerClassName="divide-y divide-white/[0.07]"
      >
        {sortedMatches.map((match) => {
          const roundResult = getRoundResult(match)

          if (roundResult === 'W') runningWins++
          else if (roundResult === 'L') runningLosses++
          else runningTies++

          return (
            <RoundHistoryRow
              key={match.id}
              match={match}
              roundResult={roundResult}
              runningRecord={{
                wins: runningWins,
                losses: runningLosses,
                ties: runningTies,
              }}
              editingMatch={editingMatch}
              openMenuId={openMenuId}
              openNotesId={openNotesId}
              isRoundValid={isRoundValid}
              isFormValid={isFormValid}
              setEditingMatch={setEditingMatch}
              setOpenMenuId={setOpenMenuId}
              setOpenNotesId={setOpenNotesId}
              editMatch={editMatch}
              deleteMatch={deleteMatch}
            />
          )
        })}
      </DisclosureContent>
    </div>
  )
}
