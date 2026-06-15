import { useState } from 'react'
import { Deck, Match } from '@/types'
import {
  EmptyState,
  OverlayCard,
  Panel,
  ResultPill,
  SectionHeader,
  StatusBadge,
} from '@/components/ui'

type Props = {
  matches: Match[]

  deleteMatch: (id: number) => void
  deleteEvent: (eventName: string) => void

  editMatch: (match: Match) => void

  editEvent: (
    oldEventName: string,
    updatedData: {
      eventName: string
      format: string
      deck: string
    }
  ) => void

  editingMatch: Match | null
  setEditingMatch: (match: Match | null) => void

  editingEvent: string | null
  setEditingEvent: (value: string | null) => void

  decks: Deck[]
}

export default function MatchHistory({
  matches,
  deleteMatch,
  deleteEvent,
  editMatch,
  editEvent,
  editingMatch,
  setEditingMatch,
  editingEvent,
  setEditingEvent,
  decks,
}: Props) {
  const [openMenuId, setOpenMenuId] =
    useState<number | null>(null)

  const [openNotesId, setOpenNotesId] =
    useState<number | null>(null)

  const isRoundValid =
    editingMatch?.round !== undefined &&
    editingMatch?.round !== null &&
    String(editingMatch.round).trim() !== '' &&
    !isNaN(Number(editingMatch.round)) &&
    Number(editingMatch.round) > 0

  const isFormValid = isRoundValid

  if (matches.length === 0) {
    return (
      <Panel>
        <SectionHeader
          title="Match History"
          className="mb-4"
        />

        <EmptyState>
          No matches logged yet.
        </EmptyState>
      </Panel>
    )
  }

  const groupedMatches: Record<string, Match[]> =
    matches.reduce((acc, match) => {
      if (!acc[match.eventName]) {
        acc[match.eventName] = []
      }

      acc[match.eventName].push(match)

      return acc
    }, {} as Record<string, Match[]>)

  return (
    <Panel>
      <SectionHeader
        title="Match History"
        className="mb-4"
      />

      <div className="space-y-6">
        {Object.entries(groupedMatches)
          .reverse()
          .map(([eventName, eventMatches]) => {
            const sortedMatches = [...eventMatches].sort(
              (a, b) => a.round - b.round
            )

            let totalWins = 0
            let totalLosses = 0
            let totalTies = 0

            sortedMatches.forEach((match) => {
              const wins = match.games.filter(
                (g) => g === 'W'
              ).length

              const losses = match.games.filter(
                (g) => g === 'L'
              ).length

              if (wins > losses) totalWins++
              else if (losses > wins)
                totalLosses++
              else totalTies++
            })

            let runningWins = 0
            let runningLosses = 0
            let runningTies = 0

            return (
              <div
                key={eventName}
                className="bg-slate-800 rounded-2xl p-5 border border-slate-700"
              >
                {/* HEADER */}
                {editingEvent === eventName ? (
                  <div className="bg-slate-900 rounded-xl p-4 mb-4 border border-slate-700 space-y-3">
                    <input
                      type="text"
                      defaultValue={eventName}
                      id={`event-name-${eventName}`}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
                      placeholder="Event Name"
                    />

                    <input
                      type="text"
                      defaultValue={
                        sortedMatches[0]?.format
                      }
                      id={`event-format-${eventName}`}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
                      placeholder="Format"
                    />

                    <select
                      defaultValue={
                        sortedMatches[0]?.deck
                      }
                      id={`event-deck-${eventName}`}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
                    >
                      {decks.map((deck) => (
                        <option
                          key={deck.id}
                          value={deck.name}
                        >
                          {deck.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const updatedEventName = (
                            document.getElementById(
                              `event-name-${eventName}`
                            ) as HTMLInputElement
                          ).value

                          const updatedFormat = (
                            document.getElementById(
                              `event-format-${eventName}`
                            ) as HTMLInputElement
                          ).value

                          const updatedDeck = (
                            document.getElementById(
                              `event-deck-${eventName}`
                            ) as HTMLSelectElement
                          ).value

                          editEvent(eventName, {
                            eventName:
                              updatedEventName,
                            format: updatedFormat,
                            deck: updatedDeck,
                          })

                          setEditingEvent(null)
                        }}
                        className="flex-1 bg-green-500 hover:bg-green-600 py-3 rounded-xl font-semibold transition"
                      >
                        Save Event
                      </button>

                      <button
                        onClick={() =>
                          setEditingEvent(null)
                        }
                        className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    {/* TOP ROW */}
                    <div className="relative flex items-center mb-1">
                      <h3 className="text-xl font-bold text-yellow-400 text-left pr-10">
                        {eventName}
                      </h3>

                      <div className="absolute right-0">
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId ===
                                  -sortedMatches[0].id
                                  ? null
                                  : -sortedMatches[0].id
                              )
                            }
                            className="flex items-center justify-center text-slate-400 hover:text-white text-2xl font-bold w-9 h-9 leading-none transition rounded-lg hover:bg-slate-700"
                          >
                            ⋮
                          </button>

                        {openMenuId === -sortedMatches[0].id && (
  <>
    <button
      aria-label="Close menu"
      onClick={() => setOpenMenuId(null)}
      className="fixed inset-0 z-10 cursor-default"
    />

    <OverlayCard className="absolute right-0 top-10 w-40">
      <button
        onClick={() => {
          setEditingEvent(eventName)

          setOpenMenuId(null)
        }}
        className="w-full text-left px-4 py-3 hover:bg-slate-700 text-sm"
      >
        Edit Event
      </button>

      <button
        onClick={() => {
          deleteEvent(eventName)

          setOpenMenuId(null)
        }}
        className="w-full text-left px-4 py-3 hover:bg-slate-700 text-red-400 text-sm"
      >
        Delete Event
      </button>
    </OverlayCard>
  </>
)}  
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM ROW */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusBadge className="bg-transparent p-0 text-lg text-green-400 whitespace-nowrap">
                          {totalWins}-{totalLosses}
                          {totalTies > 0 &&
                            `-${totalTies}`}
                        </StatusBadge>

                        <p className="font-bold text-base truncate">
                          {
                            sortedMatches[0]
                              ?.deck
                          }
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-slate-400 text-sm whitespace-nowrap">
                          {
                            sortedMatches[0]
                              ?.format
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ROUNDS */}
                <div className="space-y-4">
                  {sortedMatches.map((match) => {
                    const wins =
                      match.games.filter(
                        (g) => g === 'W'
                      ).length

                    const losses =
                      match.games.filter(
                        (g) => g === 'L'
                      ).length

                    let roundResult:
                      | 'W'
                      | 'L'
                      | 'T' = 'T'

                    if (wins > losses) {
                      runningWins++
                      roundResult = 'W'
                    } else if (
                      losses > wins
                    ) {
                      runningLosses++
                      roundResult = 'L'
                    } else {
                      runningTies++
                      roundResult = 'T'
                    }

                    return (
                      <div key={match.id}>
                        <div
                          className={`rounded-xl p-4 border ${
                            roundResult === 'W'
                              ? 'bg-green-950 border-green-700'
                              : roundResult === 'L'
                              ? 'bg-red-950 border-red-700'
                              : 'bg-yellow-500/20 border-yellow-400'
                          }`}
                        >
                          {editingMatch?.id ===
match.id ? (
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
            opponentDeck:
              e.target.value,
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
          const updatedGames = [
            ...editingMatch.games,
          ]

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
        editingMatch.games[0] ===
          editingMatch.games[1] &&
        editingMatch.games[0] !== 'T'
      ) && (
        <button
          onClick={() => {
            setEditingMatch({
              ...editingMatch,
              games: [
                ...editingMatch.games,
                'W',
              ],
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
      editingMatch.games[0] ===
        editingMatch.games[1] &&
      editingMatch.games[0] !== 'T'
    ) && (
      <p className="text-slate-400 text-sm mt-2">
        This match is not finalized yet.
        Add Game 3 if needed.
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
) : (
                            <div className="grid grid-cols-[1fr_auto] gap-1 items-start">
                              {/* LEFT SIDE */}
<div className="min-w-0 pr-1">
  <p className="text-blue-400 font-semibold">
    Round {match.round}
  </p>

  <p className="text-white font-semibold mt-1">
    vs {match.opponentDeck}
  </p>
</div>

{/* RIGHT SIDE */}
<div className="flex items-center gap-0 flex-shrink-0 ml-2">
                                <div className="flex flex-col items-end text-right min-w-[72px]">
                                <div className="flex justify-end gap-1 mb-1">
  {match.games.map((game, index) => (
    <ResultPill key={index} result={game} />
  ))}
</div>  

                                  <p className="text-yellow-400 font-bold text-2xl leading-tight mt-1">
                                    {runningWins}-
                                    {
                                      runningLosses
                                    }
                                    {runningTies >
                                      0 &&
                                      `-${runningTies}`}
                                  </p>
                                </div>

                                {/* MENU */}
                                <div className="relative">
                                  <button
                                    onClick={() =>
                                      setOpenMenuId(
                                        openMenuId ===
                                          match.id
                                          ? null
                                          : match.id
                                      )
                                    }
                                    className="flex items-center justify-center text-slate-400 hover:text-white text-3xl font-bold w-10 h-10 leading-none transition rounded-xl hover:bg-slate-700"
                                  >
                                    ⋮
                                  </button>

                                {openMenuId === match.id && (
  <>
    <button
      aria-label="Close menu"
      onClick={() => setOpenMenuId(null)}
      className="fixed inset-0 z-10 cursor-default"
    />

    <OverlayCard className="absolute right-0 mt-2 w-40">
      <button
        onClick={() => {
          setEditingMatch(match)

          setOpenMenuId(null)
        }}
        className="w-full text-left px-4 py-3 hover:bg-slate-700 text-sm"
      >
        Edit Round
      </button>

      <button
        onClick={() => {
          setOpenNotesId(
            openNotesId === match.id
              ? null
              : match.id
          )

          setOpenMenuId(null)
        }}
        className="w-full text-left px-4 py-3 hover:bg-slate-700 text-sm"
      >
        {openNotesId === match.id
          ? 'Hide Notes'
          : 'View Notes'}
      </button>

      <button
        onClick={() => {
          deleteMatch(match.id)

          setOpenMenuId(null)
        }}
        className="w-full text-left px-4 py-3 hover:bg-slate-700 text-red-400 text-sm"
      >
        Delete Round
      </button>
    </OverlayCard>
  </>
)}  
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {openNotesId ===
                          match.id &&
                          match.notes && (
                            <div className="mt-3 bg-slate-900 border border-slate-700 rounded-xl p-4 whitespace-pre-wrap text-slate-300">
  {match.notes}
</div>
                          )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>
    </Panel>
  )
}
