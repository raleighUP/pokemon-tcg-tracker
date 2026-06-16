import { Deck, Match } from '@/types'
import {
  Button,
  DisclosureAction,
  DisclosureContent,
  IconButton,
  MenuItem,
  NestedPanel,
  OverflowMenu,
  StatusBadge,
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

  return (
    <NestedPanel className="overflow-hidden rounded-[8px] border-slate-700/80 bg-slate-900/90 p-0 shadow-xl shadow-black/20">
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
        <div className="border-b border-white/10 bg-slate-800/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <StatusBadge className="bg-blue-500/15 px-2.5 py-1 text-blue-200">
                  {eventRecord}
                </StatusBadge>

                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {sortedMatches.length} rounds
                </span>
              </div>

              <h3 className="truncate text-xl font-bold text-white">
                {eventName}
              </h3>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                <span className="max-w-full truncate font-semibold text-slate-200">
                  {firstMatch?.deck}
                </span>
                <span>{firstMatch?.format}</span>
              </div>

              <Button
                onClick={toggleCollapsed}
                tone="secondary"
                size="sm"
                className="mt-3 rounded-full border border-white/10 bg-white/5 px-3 hover:border-white/20 hover:bg-white/10"
                aria-expanded={!isCollapsed}
              >
                <DisclosureAction
                  open={!isCollapsed}
                  openLabel="Show rounds"
                  closeLabel="Hide rounds"
                  className="text-slate-300"
                />
              </Button>
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
                className="h-11 w-11 rounded-[8px] text-lg font-bold leading-none text-slate-400 hover:bg-white/10 hover:text-white"
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
        </div>
      )}

      <DisclosureContent
        open={!isCollapsed || editingEvent === eventName}
        innerClassName="divide-y divide-white/10"
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
    </NestedPanel>
  )
}
