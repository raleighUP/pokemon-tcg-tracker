'use client'

import { useMemo, useState } from 'react'

import {
  Deck,
  AdvisorCandidateDeck,
  AdvisorResult,
} from '@/types'

import {
  EventType,
  getTournamentStructure,
} from '@/utils/tournament'

type Props = {
  decks: Deck[]
}

export default function DeckAdvisor({ decks }: Props) {
  const [eventType, setEventType] =
    useState<EventType>('challenge')

  const [playerCount, setPlayerCount] = useState('')

  const [metaInputMode, setMetaInputMode] =
    useState<'percent' | 'players'>('percent')

  const [metaDecks, setMetaDecks] = useState([
    { name: '', share: 0 },
  ])

  const [candidateDecks, setCandidateDecks] =
    useState<AdvisorCandidateDeck[]>([
      {
        name: '',
        archetype: '',
        comfort: 3,
        owned: true,
        matchups: {},
      },
    ])

  const eventSize = Number(playerCount)

  const structure = useMemo(() => {
    return getTournamentStructure(eventType, eventSize)
  }, [eventType, eventSize])

  const enteredMetaTotal = metaDecks.reduce((total, metaDeck) => {
    const value = Number(metaDeck.share)

    if (!Number.isFinite(value)) {
      return total
    }

    return total + value
  }, 0)

  const maxMetaTotal =
    metaInputMode === 'players' && eventSize > 0
      ? eventSize
      : 100

  const otherMetaTotal = Math.max(
    0,
    maxMetaTotal - enteredMetaTotal
  )

  const normalizedMetaDecks = metaDecks
    .filter(
      (metaDeck) =>
        metaDeck.name.trim() && metaDeck.share > 0
    )
    .map((metaDeck) => {
      const normalizedShare =
        metaInputMode === 'players' && eventSize > 0
          ? (metaDeck.share / eventSize) * 100
          : metaDeck.share

      return {
        ...metaDeck,
        normalizedShare,
      }
    })

  const metaBreakdown = normalizedMetaDecks.map((metaDeck) => {
    const roundedPlayers =
      eventSize > 0
        ? Math.round(
            (metaDeck.normalizedShare / 100) * eventSize
          )
        : 0

    return {
      name: metaDeck.name,
      enteredValue: metaDeck.share,
      normalizedShare: metaDeck.normalizedShare,
      roundedPlayers,
    }
  })

  const results: AdvisorResult[] = useMemo(() => {
    const filledMetaDecks = normalizedMetaDecks

    const totalMetaShare = filledMetaDecks.reduce(
      (total, metaDeck) =>
        total + metaDeck.normalizedShare,
      0
    )

    if (totalMetaShare <= 0) return []

    return candidateDecks
      .filter(
        (deck) =>
          deck.name.trim() || deck.archetype.trim()
      )
      .map((deck) => {
        const fieldWinRate = filledMetaDecks.reduce(
          (total, metaDeck) => {
            const matchupWinRate =
              deck.matchups[metaDeck.name] ?? 50

            return (
              total +
              (metaDeck.normalizedShare / totalMetaShare) *
                matchupWinRate
            )
          },
          0
        )

        const comfortBonus = (deck.comfort - 3) * 2
        const adjustedScore = fieldWinRate + comfortBonus

        return {
          deckName: deck.name || deck.archetype,
          archetype: deck.archetype,
          fieldWinRate,
          comfort: deck.comfort,
          adjustedScore,
        }
      })
      .sort((a, b) => b.adjustedScore - a.adjustedScore)
  }, [
    candidateDecks,
    metaDecks,
    metaInputMode,
    playerCount,
    normalizedMetaDecks,
  ])

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Deck Advisor
        </h2>

        <p className="text-slate-400 text-sm mt-1">
          Build an expected tournament field and determine
          which deck gives you the best chance of success.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg">
          Event Setup
        </h3>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Event Type
          </label>

          <select
            value={eventType}
            onChange={(e) =>
              setEventType(e.target.value as EventType)
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"
          >
            <option value="challenge">
              League Challenge
            </option>
            <option value="cup">League Cup</option>
            <option value="regional">
              Regional Championship
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Estimated Players
          </label>

          <input
            type="number"
            min="0"
            value={playerCount}
            onChange={(e) =>
              setPlayerCount(e.target.value)
            }
            placeholder="Example: 64"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"
          />
        </div>
      </div>

      {eventSize > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <h3 className="font-bold mb-3">
            Tournament Structure
          </h3>

          {eventType === 'challenge' && (
            <div className="space-y-1 text-sm">
              <p>
                Swiss Rounds:{' '}
                <span className="font-bold">
                  {structure.swissRounds}
                </span>
              </p>

              <p>
                Top Cut:{' '}
                <span className="font-bold">
                  {structure.topCutLabel}
                </span>
              </p>
            </div>
          )}

          {eventType === 'cup' && (
            <div className="space-y-1 text-sm">
              <p>
                Swiss Rounds:{' '}
                <span className="font-bold">
                  {structure.swissRounds}
                </span>
              </p>

              <p>
                Elimination Rounds:{' '}
                <span className="font-bold">
                  {structure.singleEliminationRounds}
                </span>
              </p>

              <p>
                Top Cut:{' '}
                <span className="font-bold">
                  {structure.topCutLabel}
                </span>
              </p>

              <p>
                Total Event Length:{' '}
                <span className="font-bold">
                  {structure.totalEventLength}
                </span>
              </p>
            </div>
          )}

          {eventType === 'regional' && (
            <div className="space-y-1 text-sm">
              {structure.phaseOneRounds ? (
                <>
                  <p>
                    Phase 1 Rounds:{' '}
                    <span className="font-bold">
                      {structure.phaseOneRounds}
                    </span>
                  </p>

                  <p>
                    Phase 2 Threshold:{' '}
                    <span className="font-bold">
                      {structure.phaseTwoThreshold}{' '}
                      Match Points
                    </span>
                  </p>

                  <p>
                    Phase 2 Rounds:{' '}
                    <span className="font-bold">
                      {structure.phaseTwoRounds}
                    </span>
                  </p>

                  <p>
                    Total Swiss:{' '}
                    <span className="font-bold">
                      {structure.totalSwissRounds}
                    </span>
                  </p>

                  <p>
                    Top Cut:{' '}
                    <span className="font-bold">
                      {structure.topCutLabel}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Swiss Rounds:{' '}
                    <span className="font-bold">
                      {structure.swissRounds}
                    </span>
                  </p>

                  <p>
                    Top Cut:{' '}
                    <span className="font-bold">
                      {structure.topCutLabel}
                    </span>
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-bold text-lg">
          Expected Meta
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMetaInputMode('percent')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              metaInputMode === 'percent'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            Percent
          </button>

          <button
            type="button"
            onClick={() => setMetaInputMode('players')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              metaInputMode === 'players'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            Players
          </button>
        </div>

        {metaDecks.map((deck, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_120px_auto] gap-3"
          >
            <input
              value={deck.name}
              onChange={(e) => {
                const updated = [...metaDecks]
                updated[index].name = e.target.value
                setMetaDecks(updated)
              }}
              placeholder="Deck name"
              className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"
            />

            <input
              type="number"
              value={deck.share || ''}
              onChange={(e) => {
                const rawValue = e.target.value
                const nextShare =
                  rawValue === ''
                    ? 0
                    : Number(rawValue)

                const otherDecksTotal = metaDecks.reduce(
                  (total, metaDeck, metaIndex) => {
                    if (metaIndex === index) return total

                    const share = Number(metaDeck.share)

                    if (!Number.isFinite(share)) {
                      return total
                    }

                    return total + share
                  },
                  0
                )

                const maxAllowed =
                  metaInputMode === 'players' &&
                  eventSize > 0
                    ? Math.max(
                        0,
                        eventSize - otherDecksTotal
                      )
                    : Math.max(
                        0,
                        100 - otherDecksTotal
                      )

                const cappedShare = Math.min(
                  Math.max(
                    Number.isFinite(nextShare)
                      ? nextShare
                      : 0,
                    0
                  ),
                  maxAllowed
                )

                const updated = [...metaDecks]
                updated[index].share = cappedShare
                setMetaDecks(updated)
              }}
              placeholder={
                metaInputMode === 'percent'
                  ? 'Meta %'
                  : 'Players'
              }
              className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"
            />

            <button
              type="button"
              onClick={() => {
                const updated = metaDecks.filter(
                  (_, metaIndex) => metaIndex !== index
                )

                setMetaDecks(
                  updated.length > 0
                    ? updated
                    : [{ name: '', share: 0 }]
                )
              }}
              className="bg-red-900/40 hover:bg-red-900/70 text-red-200 rounded-xl px-3 py-2 text-sm"
            >
              Clear
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setMetaDecks([
              ...metaDecks,
              { name: '', share: 0 },
            ])
          }
          className="bg-slate-800 hover:bg-slate-700 rounded-xl px-4 py-2 text-sm"
        >
          + Add Meta Deck
        </button>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">
              Predicted Meta
            </span>

            <span className="font-bold">
              {enteredMetaTotal}
              {metaInputMode === 'percent'
                ? '%'
                : ' players'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">
              Other
            </span>

            <span className="font-bold">
              {otherMetaTotal}
              {metaInputMode === 'percent'
                ? '%'
                : ' players'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">
              Total Field
            </span>

            <span className="font-bold">
              {maxMetaTotal}
              {metaInputMode === 'percent'
                ? '%'
                : ' players'}
            </span>
          </div>

          {metaBreakdown.length > 0 && (
            <div className="border-t border-slate-800 pt-3 mt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-400">
                Meta Breakdown
              </p>

              {metaBreakdown.map((deck) => (
                <div
                  key={deck.name}
                  className="flex justify-between gap-3 text-xs"
                >
                  <span className="text-slate-400">
                    {deck.name}
                  </span>

                  <span className="font-semibold text-right">
                    {metaInputMode === 'percent'
                      ? `${deck.normalizedShare.toFixed(
                          1
                        )}% • ${deck.roundedPlayers} players`
                      : `${deck.enteredValue} players • ${deck.normalizedShare.toFixed(
                          1
                        )}%`}
                  </span>
                </div>
              ))}

              {otherMetaTotal > 0 && (
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-slate-400">
                    Other
                  </span>

                  <span className="font-semibold text-right">
                    {metaInputMode === 'percent'
                      ? `${otherMetaTotal}% • ${
                          eventSize > 0
                            ? Math.round(
                                (otherMetaTotal / 100) *
                                  eventSize
                              )
                            : 0
                        } players`
                      : `${otherMetaTotal} players • ${
                          eventSize > 0
                            ? (
                                (otherMetaTotal /
                                  eventSize) *
                                100
                              ).toFixed(1)
                            : '0.0'
                        }%`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-lg">
          Candidate Decks
        </h3>

        {candidateDecks.map((deck, index) => (
          <div
            key={index}
            className="border border-slate-800 rounded-xl p-4 space-y-3"
          >
            <select
              value={deck.name}
              onChange={(e) => {
                const updated = [...candidateDecks]

                updated[index].name = e.target.value
                updated[index].archetype = e.target.value

                setCandidateDecks(updated)
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"
            >
              <option value="">
                Select a saved deck
              </option>

              {decks.map((savedDeck) => (
                <option
                  key={savedDeck.id}
                  value={savedDeck.name}
                >
                  {savedDeck.name}
                </option>
              ))}
            </select>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Comfort: {deck.comfort}/5
              </label>

              <input
                type="range"
                min="1"
                max="5"
                value={deck.comfort}
                onChange={(e) => {
                  const updated = [...candidateDecks]

                  updated[index].comfort = Number(
                    e.target.value
                  )

                  setCandidateDecks(updated)
                }}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-300">
                Matchup Win Rates
              </p>

              {metaDecks.filter((metaDeck) =>
                metaDeck.name.trim()
              ).length === 0 ? (
                <p className="text-sm text-slate-500">
                  Add expected meta decks above to enter
                  matchup rates.
                </p>
              ) : (
                metaDecks
                  .filter((metaDeck) =>
                    metaDeck.name.trim()
                  )
                  .map((metaDeck) => (
                    <div
                      key={metaDeck.name}
                      className="grid grid-cols-2 gap-3 items-center"
                    >
                      <span className="text-sm text-slate-300">
                        vs {metaDeck.name}
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={
                          deck.matchups[metaDeck.name] ?? ''
                        }
                        onChange={(e) => {
                          const updated = [
                            ...candidateDecks,
                          ]

                          updated[index].matchups[
                            metaDeck.name
                          ] = Number(e.target.value)

                          setCandidateDecks(updated)
                        }}
                        placeholder="50"
                        className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2"
                      />
                    </div>
                  ))
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setCandidateDecks([
              ...candidateDecks,
              {
                name: '',
                archetype: '',
                comfort: 3,
                owned: true,
                matchups: {},
              },
            ])
          }
          className="bg-slate-800 hover:bg-slate-700 rounded-xl px-4 py-2 text-sm"
        >
          + Add Candidate Deck
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-lg">
          Recommendations
        </h3>

        {results.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Add expected meta decks and candidate decks to
            see recommendations.
          </p>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={`${result.deckName}-${index}`}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-bold">
                      #{index + 1} {result.deckName}
                    </p>

                    <p className="text-sm text-slate-400">
                      Comfort: {result.comfort}/5
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold">
                      {result.adjustedScore.toFixed(1)}%
                    </p>

                    <p className="text-xs text-slate-400">
                      Adjusted Score
                    </p>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-300">
                  Field WR:{' '}
                  {result.fieldWinRate.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}