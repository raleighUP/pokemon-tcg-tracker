import { useState } from 'react'
import { Deck, Match } from '@/types'

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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [roundError, setRoundError] = useState(false)

  // ✅ VALIDATION (correct placement)
  const isRoundValid =
    editingMatch?.round !== undefined &&
    editingMatch?.round !== null &&
    String(editingMatch.round).trim() !== '' &&
    !isNaN(Number(editingMatch.round)) &&
    Number(editingMatch.round) > 0

  const isFormValid = isRoundValid

  if (matches.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4">
          Match History
        </h2>
        <p className="text-slate-400">No matches logged yet.</p>
      </div>
    )
  }

  // GROUP MATCHES BY EVENT
  const groupedMatches: Record<string, Match[]> = matches.reduce(
    (acc, match) => {
      if (!acc[match.eventName]) acc[match.eventName] = []
      acc[match.eventName].push(match)
      return acc
    },
    {} as Record<string, Match[]>
  )

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4">Match History</h2>

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
              const wins = match.games.filter((g) => g === 'W').length
              const losses = match.games.filter((g) => g === 'L').length

              if (wins > losses) totalWins++
              else if (losses > wins) totalLosses++
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
      defaultValue={sortedMatches[0]?.format}
      id={`event-format-${eventName}`}
      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
      placeholder="Format"
    />

    <select
      defaultValue={sortedMatches[0]?.deck}
      id={`event-deck-${eventName}`}
      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
    >
      {decks.map((deck) => (
        <option key={deck.id} value={deck.name}>
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
            eventName: updatedEventName,
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
        onClick={() => setEditingEvent(null)}
        className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold transition"
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <div className="grid grid-cols-2 gap-4 mb-4">
    {/* LEFT */}
    <div>
      <h3 className="text-xl font-bold text-yellow-400">
        {eventName}
      </h3>

      <p className="text-lg font-bold text-green-400 mt-1">
        {totalWins}-{totalLosses}
        {totalTies > 0 && `-${totalTies}`}
      </p>
    </div>

    {/* RIGHT */}
    <div className="text-right">
      <div className="flex items-center justify-end gap-2">
        <div>
          <p className="font-bold text-lg">
            {sortedMatches[0]?.deck}
          </p>

          <p className="text-slate-400 text-sm">
            {sortedMatches[0]?.format}
          </p>
        </div>

        {/* EVENT MENU */}
        <div className="relative">
          <button
            onClick={() =>
              setOpenMenuId(
                openMenuId === -sortedMatches[0].id
                  ? null
                  : -sortedMatches[0].id
              )
            }
            className="text-slate-400 hover:text-white text-lg font-bold px-2 transition"
          >
            ⋮
          </button>

          {openMenuId === -sortedMatches[0].id && (
            <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setEditingEvent(eventName)
                  setOpenMenuId(null)
                }}
                className="w-full text-left px-4 py-3 hover:bg-slate-700 text-sm transition"
              >
                Edit Event
              </button>

              <button
                onClick={() => {
                  deleteEvent(eventName)
                  setOpenMenuId(null)
                }}
                className="w-full text-left px-4 py-3 hover:bg-slate-700 text-red-400 text-sm transition"
              >
                Delete Event
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}

                {/* ROUNDS */}
                <div className="space-y-4">
                  {sortedMatches.map((match) => {
                    const wins = match.games.filter((g) => g === 'W').length
                    const losses = match.games.filter((g) => g === 'L').length

                    let roundResult: 'W' | 'L' | 'T' = 'T'

                    if (wins > losses) {
                      runningWins++
                      roundResult = 'W'
                    } else if (losses > wins) {
                      runningLosses++
                      roundResult = 'L'
                    } else {
                      runningTies++
                      roundResult = 'T'
                    }

                    return (
                      <div
                        key={match.id}
                        className={`rounded-xl p-4 border ${
                          roundResult === 'W'
                            ? 'bg-green-950 border-green-700'
                            : roundResult === 'L'
                            ? 'bg-red-950 border-red-700'
                            : 'bg-yellow-500/20 border-yellow-400'
                        }`}
                      >
                        {editingMatch?.id === match.id ? (
                          <div className="space-y-3">

                            {/* ROUND */}
                            <div>
                              <p
                                className={`mb-1 font-semibold transition ${
                                  roundError || !isRoundValid
                                    ? 'text-red-400'
                                    : 'text-slate-300'
                                }`}
                              >
                                Round Number
                              </p>

                              <input
                                type="text"
                                inputMode="numeric"
                                value={
                                  editingMatch.round === undefined ||
                                  editingMatch.round === null
                                    ? ''
                                    : String(editingMatch.round)
                                }
                                onChange={(e) => {
                                  const value = e.target.value

                                  if (value === '') {
                                    setEditingMatch({
                                      ...editingMatch,
                                      round: undefined as any,
                                    })
                                    setRoundError(false)
                                    return
                                  }

                                  if (/^\d+$/.test(value)) {
                                    setEditingMatch({
                                      ...editingMatch,
                                      round: Number(value),
                                    })
                                    setRoundError(false)
                                  }
                                }}
                                className={`w-full bg-slate-800 border rounded-xl px-4 py-3 transition ${
                                  roundError || !isRoundValid
                                    ? 'border-red-500 shake'
                                    : 'border-slate-700'
                                }`}
                              />
                            </div>

                            {/* OPPONENT */}
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

                            {/* MATCH TYPE */}
                            <select
                              value={editingMatch.matchType}
                              onChange={(e) =>
                                setEditingMatch({
                                  ...editingMatch,
                                  matchType: e.target.value as 'BO1' | 'BO3',
                                })
                              }
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
                            >
                              <option value="BO1">BO1</option>
                              <option value="BO3">BO3</option>
                            </select>

                            {/* SAVE */}
                            <div className="flex gap-2">
                              <button
                                disabled={!isFormValid}
                                onClick={() => {
                                  if (!isFormValid) {
                                    setRoundError(true)
                                    if (navigator.vibrate)
                                      navigator.vibrate(60)
                                    return
                                  }

                                  editMatch({
                                    ...editingMatch,
                                    round: Number(editingMatch.round),
                                  })

                                  setEditingMatch(null)
                                }}
                                className={`flex-1 py-3 rounded-xl font-semibold ${
                                  isFormValid
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : 'bg-green-900 opacity-50 cursor-not-allowed'
                                }`}
                              >
                                Save
                              </button>

                              <button
                                onClick={() => setEditingMatch(null)}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                         <div className="flex justify-between items-start">
  <div>
    <p className="text-blue-400 font-semibold">
      Round {match.round}
    </p>

    <p className="text-white font-semibold mt-1">
      vs {match.opponentDeck}
    </p>
  </div>

  <div className="text-right">
    <div className="flex items-center gap-2 justify-end">
      <p className="text-yellow-400 font-bold">
        {runningWins}-{runningLosses}
        {runningTies > 0 && `-${runningTies}`}
      </p>

      {/* ROUND MENU */}
      <div className="relative">
        <button
          onClick={() =>
            setOpenMenuId(
              openMenuId === match.id
                ? null
                : match.id
            )
          }
          className="text-slate-400 hover:text-white text-lg font-bold px-2 transition"
        >
          ⋮
        </button>

        {openMenuId === match.id && (
          <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={() => {
                setEditingMatch(match)
                setOpenMenuId(null)
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-700 text-sm transition"
            >
              Edit Round
            </button>

            <button
              onClick={() => {
                deleteMatch(match.id)
                setOpenMenuId(null)
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-700 text-red-400 text-sm transition"
            >
              Delete Round
            </button>
          </div>
        )}
      </div>
    </div>

    <p className="text-slate-400 text-sm mt-1">
      {match.matchType}
    </p>
  </div>
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
    </div>
  )
}