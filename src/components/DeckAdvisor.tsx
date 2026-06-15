'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  getSuggestedMeta,
  getSuggestedMetaSourceLabel,
} from '@/utils/major-meta'

import {
  Deck,
  AdvisorCandidateDeck,
  AdvisorResult,
} from '@/types'

import {
  EventType,
  getTournamentStructure,
} from '@/utils/tournament'

import {
  getMatchupSampleSize,
  getMatchupWinRate,
} from '@/utils/matchups'

import { getArchetypeOptions } from '@/utils/archetype-options'
import {
  Button,
  EmptyState,
  FieldLabel,
  KeyValueList,
  MatchupBadge,
  MetricRow,
  MetricTile,
  NestedPanel,
  NumberInput,
  Panel,
  RangeField,
  SectionHeader,
  SegmentedControl,
  SelectField,
  SourcePanel,
} from '@/components/ui'

type Props = {
  decks: Deck[]
}

type DeckAdvisorResult = AdvisorResult & {
  fieldCoverage: number | null
  fieldCoverageLabel: string
  fieldCoverageSampleSize: number
}

const ADVISOR_STORAGE_KEY = 'pokemon-advisor-data'

type StoredAdvisorData = {
  eventType?: EventType
  playerCount?: string
  metaInputMode?: 'percent' | 'players'
  metaDecks?: {
    name: string
    share: number
  }[]
  deckComfortById?: Record<number, number>
  candidateDecks?: AdvisorCandidateDeck[]
  candidateSource?: 'owned' | 'all'
}

function readStoredAdvisorData(): StoredAdvisorData {
  if (typeof window === 'undefined') return {}

  const savedData = localStorage.getItem(ADVISOR_STORAGE_KEY)

  if (!savedData) return {}

  try {
    const parsedData = JSON.parse(savedData)

    return parsedData && typeof parsedData === 'object'
      ? parsedData
      : {}
  } catch {
    localStorage.removeItem(ADVISOR_STORAGE_KEY)
    return {}
  }
}

function getMatchupBorderClass(winRate: number) {
  if (winRate > 55) {
    return 'border-green-500 bg-green-950/20'
  }

  if (winRate < 45) {
    return 'border-red-500 bg-red-950/20'
  }

  return 'border-yellow-500 bg-yellow-950/20'
}

function getFieldCoverageLabel(winRate: number | null) {
  if (winRate === null) {
    return 'Unknown'
  }

  if (winRate >= 55) {
    return 'Strong'
  }

  if (winRate >= 50) {
    return 'Stable'
  }

  if (winRate >= 45) {
    return 'Risky'
  }

  return 'Poor'
}

function getRecommendationInsight(result: AdvisorResult) {
  const totalSampleSize = [
    ...result.bestMatchups,
    ...result.worstMatchups,
  ].reduce((total, matchup) => total + matchup.sampleSize, 0)

  if (totalSampleSize < 20) {
    return 'Good meta read, but limited matchup sample size'
  }

  if (result.fieldWinRate >= 55 && result.comfort <= 2) {
    return 'Good meta read, but low player experience'
  }

  if (result.adjustedScore >= 60) {
    return 'High confidence recommendation'
  }

  if (result.fieldWinRate >= 55) {
    return 'Strong matchup spread against the predicted field'
  }

  if (result.comfort >= 4 && result.adjustedScore >= 54) {
    return 'Strong comfort pick'
  }

  if (result.comfortBonus < 0) {
    return 'Strong deck, but comfort is lowering the score'
  }

  return 'Balanced option into the expected field'
}

export default function DeckAdvisor({ decks }: Props) {
  const storedAdvisorData = useMemo(
    () => readStoredAdvisorData(),
    []
  )

  const [eventType, setEventType] =
    useState<EventType>(
      storedAdvisorData.eventType ?? 'challenge'
    )

  const [playerCount, setPlayerCount] = useState(
    storedAdvisorData.playerCount ?? ''
  )

  const [metaInputMode, setMetaInputMode] =
    useState<'percent' | 'players'>(
      storedAdvisorData.metaInputMode ?? 'percent'
    )

  const [metaDecks, setMetaDecks] = useState(
    Array.isArray(storedAdvisorData.metaDecks)
      ? storedAdvisorData.metaDecks
      : [{ name: '', share: 0 }]
  )

  const [deckComfortById, setDeckComfortById] =
    useState<Record<number, number>>(
      storedAdvisorData.deckComfortById &&
        typeof storedAdvisorData.deckComfortById === 'object'
        ? storedAdvisorData.deckComfortById
        : {}
    )

  const legacyCandidateDecks = Array.isArray(
    storedAdvisorData.candidateDecks
  )
    ? storedAdvisorData.candidateDecks
    : null

  const [candidateSource, setCandidateSource] =
    useState<'owned' | 'all'>(
      storedAdvisorData.candidateSource ?? 'owned'
    )

  const resolvedDeckComfortById = useMemo(() => {
    if (!legacyCandidateDecks) {
      return deckComfortById
    }

    const migratedComfortById = { ...deckComfortById }

    decks.forEach((savedDeck) => {
      if (migratedComfortById[savedDeck.id] !== undefined) {
        return
      }

      const oldCandidate = legacyCandidateDecks.find(
        (candidate) => candidate.name === savedDeck.name
      )

      if (oldCandidate) {
        migratedComfortById[savedDeck.id] = oldCandidate.comfort
      }
    })

    return migratedComfortById
  }, [deckComfortById, decks, legacyCandidateDecks])

  useEffect(() => {
    const advisorData = {
      eventType,
      playerCount,
      metaInputMode,
      metaDecks,
      deckComfortById: resolvedDeckComfortById,
      candidateSource,
    }

    localStorage.setItem(
      ADVISOR_STORAGE_KEY,
      JSON.stringify(advisorData)
    )
  }, [
    eventType,
    playerCount,
    metaInputMode,
    metaDecks,
    resolvedDeckComfortById,
    candidateSource,
  ])

  const eventSize = Number(playerCount)

  const archetypeOptions = useMemo(
    () => getArchetypeOptions(),
    []
  )

  const suggestedMeta = useMemo(() => getSuggestedMeta(5), [])
  const suggestedMetaSourceLabel = useMemo(
    () => getSuggestedMetaSourceLabel(),
    []
  )

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

  const normalizedMetaDecks = useMemo(
    () =>
      metaDecks
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
        }),
    [eventSize, metaDecks, metaInputMode]
  )

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

  const topMetaCandidates: AdvisorCandidateDeck[] = useMemo(
    () =>
      [...normalizedMetaDecks]
        .sort(
          (a, b) =>
            b.normalizedShare - a.normalizedShare
        )
        .slice(0, 10)
        .map((metaDeck) => ({
          name: metaDeck.name,
          archetype: metaDeck.name,
          comfort: 3,
          owned: false,
          matchups: {},
        })),
    [normalizedMetaDecks]
  )

  const ownedCandidateDecks: (AdvisorCandidateDeck & {
    id: number
  })[] = useMemo(
    () =>
      decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        archetype: deck.variant || deck.archetype || deck.name,
        comfort: resolvedDeckComfortById[deck.id] ?? 3,
        owned: true,
        matchups: {},
      })),
    [decks, resolvedDeckComfortById]
  )

  const advisorCandidateDecks = useMemo(
    () =>
      candidateSource === 'all'
        ? topMetaCandidates
        : ownedCandidateDecks,
    [candidateSource, ownedCandidateDecks, topMetaCandidates]
  )

  const results: DeckAdvisorResult[] = useMemo(() => {
    const filledMetaDecks = normalizedMetaDecks

    const totalMetaShare = filledMetaDecks.reduce(
      (total, metaDeck) =>
        total + metaDeck.normalizedShare,
      0
    )

    if (totalMetaShare <= 0) return []

    const metaDeckNameSet = new Set(
      filledMetaDecks.map((metaDeck) => metaDeck.name)
    )

    return advisorCandidateDecks
      .filter(
        (deck) =>
          deck.name.trim() || deck.archetype.trim()
      )
      .map((deck) => {
        const deckIdentifier = deck.archetype || deck.name

        const fieldWinRate = filledMetaDecks.reduce(
          (total, metaDeck) => {
            const matchupWinRate = getMatchupWinRate(
              deckIdentifier,
              metaDeck.name
            )

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

        const matchupDetails = filledMetaDecks.map((metaDeck) => ({
          name: metaDeck.name,
          winRate: getMatchupWinRate(
            deckIdentifier,
            metaDeck.name
          ),
          sampleSize: getMatchupSampleSize(
            deckIdentifier,
            metaDeck.name
          ),
        }))

        const sampledMatchups = matchupDetails.filter(
          (matchup) => matchup.sampleSize > 0
        )

        const bestMatchups = sampledMatchups
          .filter((matchup) => matchup.winRate > 50)
          .sort((a, b) => b.winRate - a.winRate)
          .slice(0, 2)

        const worstMatchups = sampledMatchups
          .filter((matchup) => matchup.winRate < 50)
          .sort((a, b) => a.winRate - b.winRate)
          .slice(0, 2)

        const fieldCoverageMatchups = archetypeOptions
          .filter(
            (archetype) =>
              archetype !== deckIdentifier &&
              !metaDeckNameSet.has(archetype)
          )
          .map((archetype) => ({
            name: archetype,
            winRate: getMatchupWinRate(
              deckIdentifier,
              archetype
            ),
            sampleSize: getMatchupSampleSize(
              deckIdentifier,
              archetype
            ),
          }))
          .filter((matchup) => matchup.sampleSize > 0)

        const fieldCoverage =
          fieldCoverageMatchups.length > 0
            ? fieldCoverageMatchups.reduce(
                (total, matchup) => total + matchup.winRate,
                0
              ) / fieldCoverageMatchups.length
            : null

        return {
          deckName: deck.name || deck.archetype,
          archetype: deck.archetype,
          fieldWinRate,
          comfort: deck.comfort,
          adjustedScore,
          comfortBonus,
          bestMatchups,
          worstMatchups,
          fieldCoverage,
          fieldCoverageLabel:
            getFieldCoverageLabel(fieldCoverage),
          fieldCoverageSampleSize:
            fieldCoverageMatchups.length,
        }
      })
      .sort((a, b) => b.adjustedScore - a.adjustedScore)
  }, [
    advisorCandidateDecks,
    archetypeOptions,
    normalizedMetaDecks,
  ])

  return (
    <Panel className="space-y-6">
      <SectionHeader
        title="Deck Advisor"
        description="Build an expected tournament field and determine which deck gives you the best chance of success."
      />

      <div className="space-y-4">
        <SectionHeader title="Event Setup" level={3} />

        <div>
          <FieldLabel>
            Event Type
          </FieldLabel>

          <SelectField
            value={eventType}
            onChange={(e) =>
              setEventType(e.target.value as EventType)
            }
            className="bg-slate-950"
          >
            <option value="challenge">
              League Challenge
            </option>
            <option value="cup">League Cup</option>
            <option value="regional">
              Regional Championship
            </option>
          </SelectField>
        </div>

        <div>
          <FieldLabel>
            Estimated Players
          </FieldLabel>

          <NumberInput
            min="0"
            value={playerCount}
            onChange={(e) =>
              setPlayerCount(e.target.value)
            }
            placeholder="Example: 64"
            className="bg-slate-950"
          />
        </div>
      </div>

      {eventSize > 0 && (
        <NestedPanel>
          <SectionHeader
            title="Tournament Structure"
            level={3}
            className="mb-3"
          />

          {eventType === 'challenge' && (
            <KeyValueList
              className="text-sm"
              items={[
                {
                  label: 'Swiss Rounds',
                  value: structure.swissRounds,
                },
                {
                  label: 'Top Cut',
                  value: structure.topCutLabel,
                },
              ]}
            />
          )}

          {eventType === 'cup' && (
            <KeyValueList
              className="text-sm"
              items={[
                {
                  label: 'Swiss Rounds',
                  value: structure.swissRounds,
                },
                {
                  label: 'Elimination Rounds',
                  value: structure.singleEliminationRounds,
                },
                {
                  label: 'Top Cut',
                  value: structure.topCutLabel,
                },
                {
                  label: 'Total Event Length',
                  value: structure.totalEventLength,
                },
              ]}
            />
          )}

          {eventType === 'regional' && (
            <div className="space-y-1 text-sm">
              {structure.phaseOneRounds ? (
                <KeyValueList
                  items={[
                    {
                      label: 'Phase 1 Rounds',
                      value: structure.phaseOneRounds,
                    },
                    {
                      label: 'Phase 2 Threshold',
                      value: `${structure.phaseTwoThreshold} Match Points`,
                    },
                    {
                      label: 'Phase 2 Rounds',
                      value: structure.phaseTwoRounds,
                    },
                    {
                      label: 'Total Swiss',
                      value: structure.totalSwissRounds,
                    },
                    {
                      label: 'Top Cut',
                      value: structure.topCutLabel,
                    },
                  ]}
                />
              ) : (
                <KeyValueList
                  items={[
                    {
                      label: 'Swiss Rounds',
                      value: structure.swissRounds,
                    },
                    {
                      label: 'Top Cut',
                      value: structure.topCutLabel,
                    },
                  ]}
                />
              )}
            </div>
          )}
        </NestedPanel>
      )}

      <div className="space-y-3">
        <SectionHeader title="Expected Meta" level={3} />

        <Button
          onClick={() => {
            setMetaInputMode('percent')
            setMetaDecks(suggestedMeta)
          }}
          tone="primary"
          className="w-full"
        >
          Use Suggested Meta
        </Button>

        <SourcePanel
          sources={[
            {
              label: 'Meta Source',
              value: suggestedMetaSourceLabel,
            },
            {
              label: 'Matchup Source',
              value: '20 large online Limitless tournaments',
            },
          ]}
        />

        <SegmentedControl
          value={metaInputMode}
          onChange={setMetaInputMode}
          options={[
            { label: 'Percent', value: 'percent' },
            { label: 'Players', value: 'players' },
          ]}
          buttonClassName="py-2"
        />

        {metaDecks.map((deck, index) => (
          <div key={index} className="space-y-3">
            <SelectField
              value={deck.name}
              onChange={(e) => {
                const updated = [...metaDecks]
                updated[index].name = e.target.value
                setMetaDecks(updated)
              }}
              className="bg-slate-950"
            >
              <option value="">Select archetype</option>

              {archetypeOptions.map((archetype) => (
                <option key={archetype} value={archetype}>
                  {archetype}
                </option>
              ))}
            </SelectField>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <NumberInput
                value={deck.share || ''}
                onChange={(e) => {
                  const rawValue = e.target.value
                  const nextShare =
                    rawValue === '' ? 0 : Number(rawValue)

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
                    metaInputMode === 'players' && eventSize > 0
                      ? Math.max(0, eventSize - otherDecksTotal)
                      : Math.max(0, 100 - otherDecksTotal)

                  const cappedShare = Math.min(
                    Math.max(
                      Number.isFinite(nextShare) ? nextShare : 0,
                      0
                    ),
                    maxAllowed
                  )

                  const updated = [...metaDecks]
                  updated[index].share = cappedShare
                  setMetaDecks(updated)
                }}
                placeholder={
                  metaInputMode === 'percent' ? 'Meta %' : 'Players'
                }
                className="bg-slate-950"
              />

              <Button
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
                tone="danger"
              >
                Clear
              </Button>
            </div>
          </div>
        ))}

        <Button
          onClick={() =>
            setMetaDecks([
              ...metaDecks,
              { name: '', share: 0 },
            ])
          }
          tone="secondary"
          size="sm"
        >
          + Add Meta Deck
        </Button>

        <NestedPanel className="space-y-2 text-sm">
          <KeyValueList
            items={[
              {
                label: 'Predicted Meta',
                value: `${enteredMetaTotal}${
                  metaInputMode === 'percent' ? '%' : ' players'
                }`,
              },
              {
                label: 'Other',
                value: `${otherMetaTotal}${
                  metaInputMode === 'percent' ? '%' : ' players'
                }`,
              },
              {
                label: 'Total Field',
                value: `${maxMetaTotal}${
                  metaInputMode === 'percent' ? '%' : ' players'
                }`,
              },
            ]}
          />

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
        </NestedPanel>
      </div>

      <div className="space-y-3">
        <SectionHeader title="Advisor Mode" level={3} />

        <SegmentedControl
          value={candidateSource}
          onChange={setCandidateSource}
          options={[
            { label: 'Owned Decks', value: 'owned' },
            { label: 'Top Meta', value: 'all' },
          ]}
        />

        <p className="text-xs text-slate-400">
          {candidateSource === 'owned'
            ? 'Rank only the decks you have saved in the app.'
            : 'Rank the top expected meta archetypes using neutral comfort.'}
        </p>
      </div>

      {candidateSource === 'owned' && (
        <div className="space-y-3">
          <SectionHeader title="Owned Decks" level={3} />

          {ownedCandidateDecks.length === 0 ? (
            <EmptyState>
              Save a deck first to get owned-deck recommendations.
            </EmptyState>
          ) : (
            ownedCandidateDecks.map((deck) => (
              <div
                key={deck.id}
                className="border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="space-y-2">
                  <p className="font-semibold">{deck.name}</p>

                  {deck.archetype && (
                    <p className="text-xs text-slate-400">
                      {deck.archetype}
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel>
                    Comfort: {deck.comfort}/5
                  </FieldLabel>

                  <RangeField
                    min="1"
                    max="5"
                    value={deck.comfort}
                    onChange={(e) => {
                      const nextComfort = Number(e.target.value)

                      setDeckComfortById((currentComfortById) => ({
                        ...currentComfortById,
                        [deck.id]: nextComfort,
                      }))
                    }}
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
                    Add expected meta decks above to see matchup rates.
                  </p>
                ) : (
                  metaDecks
                    .filter((metaDeck) => metaDeck.name.trim())
                    .map((metaDeck) => {
                      const matchupWinRate = getMatchupWinRate(
                        deck.archetype || deck.name,
                        metaDeck.name
                      )

                      const sampleSize = getMatchupSampleSize(
                        deck.archetype || deck.name,
                        metaDeck.name
                      )

                      return (
                        <MatchupBadge
                          key={metaDeck.name}
                          label={`vs ${metaDeck.name}`}
                          value={`${matchupWinRate.toFixed(1)}%`}
                          detail={
                            sampleSize > 0
                              ? `${sampleSize} Limitless matches`
                              : 'No data found — using 50/50 default'
                          }
                          className={`border rounded-xl px-4 py-3 ${getMatchupBorderClass(
                            matchupWinRate
                          )}`}
                        />
                      )
                    })
                )}
                </div>
              </div>
            )))}

        </div>
      )}

      <div className="space-y-3">
        <SectionHeader title="Recommendations" level={3} />

        {results.length === 0 ? (
          <EmptyState>
            Add expected meta decks to see recommendations.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={`${result.deckName}-${index}`}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-bold">
                      #{index + 1} {result.deckName}
                    </p>

                    <p className="text-sm text-slate-400">
                      Comfort: {result.comfort}/5
                    </p>

                    <p className="text-xs text-blue-300 mt-1 max-w-xl">
                      {getRecommendationInsight(result)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold">
                      {result.adjustedScore.toFixed(1)}%
                    </p>

                    <p className="text-xs text-slate-400">
                      Final Score
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <MetricTile
                    label="Field WR"
                    value={`${result.fieldWinRate.toFixed(1)}%`}
                  />

                  <MetricTile
                    label="Comfort Impact"
                    value={`${result.comfortBonus >= 0 ? '+' : ''}${result.comfortBonus.toFixed(
                      1
                    )}%`}
                  />

                  <MetricTile
                    label="Final Score"
                    value={`${result.adjustedScore.toFixed(1)}%`}
                  />

                  <MetricTile
                    label="Field Coverage"
                    value={
                      result.fieldCoverage === null
                        ? 'Unknown'
                        : `${result.fieldCoverage.toFixed(1)}%`
                    }
                    detail={result.fieldCoverageLabel}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-900 rounded-xl p-3">
                    <p className="font-semibold text-green-400 mb-2">
                      Best Matchups
                    </p>

                    <div className="space-y-1">
                      {result.bestMatchups.length === 0 ? (
                        <p className="text-slate-500 text-xs">
                          No favorable sampled matchups above 50%.
                        </p>
                      ) : (
                        result.bestMatchups.map((matchup) => (
                          <MetricRow
                            key={matchup.name}
                            label={matchup.name}
                            labelClassName="text-white"
                            value={
                              <>
                                {matchup.winRate.toFixed(1)}%{' '}
                                <span className="text-slate-500">
                                  ({matchup.sampleSize})
                                </span>
                              </>
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-3">
                    <p className="font-semibold text-red-400 mb-2">
                      Worst Matchups
                    </p>

                    <div className="space-y-1">
                      {result.worstMatchups.length === 0 ? (
                        <p className="text-slate-500 text-xs">
                          No unfavorable sampled matchups below 50%.
                        </p>
                      ) : (
                        result.worstMatchups.map((matchup) => (
                          <MetricRow
                            key={matchup.name}
                            label={matchup.name}
                            labelClassName="text-white"
                            value={
                              <>
                                {matchup.winRate.toFixed(1)}%{' '}
                                <span className="text-slate-500">
                                  ({matchup.sampleSize})
                                </span>
                              </>
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}
