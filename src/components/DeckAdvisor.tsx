'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  getSuggestedMeta,
  getSuggestedMetaSourceLabel,
} from '@/utils/major-meta'

import {
  Deck,
  AdvisorCandidateDeck,
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
  DisclosurePanel,
  EmptyState,
  KeyValueList,
  MetricRow,
  NestedPanel,
  SectionHeader,
  SegmentedControl,
  Sheet,
} from '@/components/ui'
import AdvisorModeControl from './deck-advisor/AdvisorModeControl'
import AdvisorEventSetup from './deck-advisor/AdvisorEventSetup'
import ExpectedMetaEditor from './deck-advisor/ExpectedMetaEditor'
import RecommendationCard from './deck-advisor/RecommendationCard'
import {
  getFieldCoverageLabel,
  getRecommendationInsight,
} from './deck-advisor/helpers'
import {
  CandidateSource,
  DeckAdvisorResult,
  MetaInputMode,
} from './deck-advisor/types'

type Props = {
  decks: Deck[]
}

const ADVISOR_STORAGE_KEY = 'pokemon-advisor-data'

type StoredAdvisorData = {
  eventType?: EventType
  playerCount?: string
  eventConfigured?: boolean
  metaInputMode?: MetaInputMode
  metaDecks?: {
    name: string
    share: number
  }[]
  candidateDecks?: AdvisorCandidateDeck[]
  candidateSource?: CandidateSource
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStoredAdvisorData(
  value: unknown
): StoredAdvisorData {
  if (!isRecord(value)) return {}

  const eventType =
    value.eventType === 'challenge' ||
    value.eventType === 'cup' ||
    value.eventType === 'regional'
      ? value.eventType
      : undefined

  const metaInputMode =
    value.metaInputMode === 'percent' ||
    value.metaInputMode === 'players'
      ? value.metaInputMode
      : undefined

  const candidateSource =
    value.candidateSource === 'owned' ||
    value.candidateSource === 'all'
      ? value.candidateSource
      : undefined

  const metaDecks = Array.isArray(value.metaDecks)
    ? value.metaDecks
        .map((metaDeck) => {
          if (!isRecord(metaDeck)) return null

          const name =
            typeof metaDeck.name === 'string'
              ? metaDeck.name
              : ''

          const share = Number(metaDeck.share)

          return {
            name,
            share: Number.isFinite(share)
              ? Math.max(0, share)
              : 0,
          }
        })
        .filter(
          (
            metaDeck
          ): metaDeck is {
            name: string
            share: number
          } => metaDeck !== null
        )
    : undefined

  const candidateDecks = Array.isArray(value.candidateDecks)
    ? value.candidateDecks.filter(isRecord).map((candidate) => ({
        name:
          typeof candidate.name === 'string'
            ? candidate.name
            : '',
        archetype:
          typeof candidate.archetype === 'string'
            ? candidate.archetype
            : '',
        comfort: Math.min(
          5,
          Math.max(1, Number(candidate.comfort) || 3)
        ),
        owned: candidate.owned === true,
        matchups: {},
      }))
    : undefined

  return {
    eventType,
    playerCount:
      typeof value.playerCount === 'string'
        ? value.playerCount
        : undefined,
    eventConfigured:
      typeof value.eventConfigured === 'boolean'
        ? value.eventConfigured
        : undefined,
    metaInputMode,
    metaDecks:
      metaDecks && metaDecks.length > 0
        ? metaDecks
        : undefined,
    candidateDecks,
    candidateSource,
  }
}

function readStoredAdvisorData(): StoredAdvisorData {
  if (typeof window === 'undefined') return {}

  const savedData = localStorage.getItem(ADVISOR_STORAGE_KEY)

  if (!savedData) return {}

  try {
    const parsedData = JSON.parse(savedData)

    return normalizeStoredAdvisorData(parsedData)
  } catch {
    localStorage.removeItem(ADVISOR_STORAGE_KEY)
    return {}
  }
}

function normalizeDeckIdentifier(value: string | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function getEventTypeLabel(eventType: EventType) {
  if (eventType === 'challenge') return 'League Challenge'
  if (eventType === 'cup') return 'League Cup'
  return 'Regional Championship'
}

export default function DeckAdvisor({ decks }: Props) {
  const storedAdvisorData = useMemo(
    () => readStoredAdvisorData(),
    []
  )

  const [advisorSetupOpen, setAdvisorSetupOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [eventConfigured, setEventConfigured] = useState(
    storedAdvisorData.eventConfigured === true
  )

  const [eventType, setEventType] =
    useState<EventType>(
      storedAdvisorData.eventType ?? 'challenge'
    )

  const [playerCount, setPlayerCount] = useState(
    storedAdvisorData.playerCount ?? ''
  )

  const [metaInputMode, setMetaInputMode] =
    useState<MetaInputMode>(
      storedAdvisorData.metaInputMode ?? 'percent'
    )

  const [metaDecks, setMetaDecks] = useState(
    Array.isArray(storedAdvisorData.metaDecks)
      ? storedAdvisorData.metaDecks
      : []
  )

  const [candidateSource, setCandidateSource] =
    useState<CandidateSource>(
      storedAdvisorData.candidateSource ?? 'owned'
    )

  useEffect(() => {
    const advisorData = {
      eventType,
      playerCount,
      eventConfigured,
      metaInputMode,
      metaDecks,
      candidateSource,
    }

    localStorage.setItem(
      ADVISOR_STORAGE_KEY,
      JSON.stringify(advisorData)
    )
  }, [
    eventType,
    playerCount,
    eventConfigured,
    metaInputMode,
    metaDecks,
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

  const handleMetaInputModeChange = (nextMode: MetaInputMode) => {
    if (nextMode === metaInputMode) return

    setMetaDecks(
      metaDecks.map((metaDeck) => {
        if (nextMode === 'players') {
          const playerShare =
            eventSize > 0
              ? (metaDeck.share / 100) * eventSize
              : metaDeck.share

          return {
            ...metaDeck,
            share: Math.max(0, Math.round(playerShare)),
          }
        }

        const percentShare =
          eventSize > 0
            ? (metaDeck.share / eventSize) * 100
            : metaDeck.share

        return {
          ...metaDeck,
          share: Math.max(
            0,
            Math.round(percentShare * 10) / 10
          ),
        }
      })
    )

    setMetaInputMode(nextMode)
  }

  const clearAdvisorData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADVISOR_STORAGE_KEY)
    }

    setEventConfigured(false)
    setAdvisorSetupOpen(false)
    setSourcesOpen(false)
    setEventType('challenge')
    setPlayerCount('')
    setMetaInputMode('percent')
    setMetaDecks([])
    setCandidateSource('owned')
  }

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
    const playerCountShare =
      eventSize > 0
        ? (metaDeck.normalizedShare / 100) * eventSize
        : 0

    return {
      name: metaDeck.name,
      enteredValue: metaDeck.share,
      normalizedShare: metaDeck.normalizedShare,
      playerCountShare,
    }
  })

  const ownedDeckIdentifierSet = useMemo(() => {
    const identifiers = new Set<string>()

    decks.forEach((deck) => {
      const deckIdentifiers = [deck.name, deck.archetype, deck.variant]

      deckIdentifiers.forEach((identifier) => {
        const normalizedIdentifier = normalizeDeckIdentifier(identifier)

        if (normalizedIdentifier) {
          identifiers.add(normalizedIdentifier)
        }
      })
    })

    return identifiers
  }, [decks])

  const topMetaCandidates: AdvisorCandidateDeck[] = useMemo(
    () =>
      [...normalizedMetaDecks]
        .filter(
          (metaDeck) =>
            !ownedDeckIdentifierSet.has(
              normalizeDeckIdentifier(metaDeck.name)
            )
        )
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
    [normalizedMetaDecks, ownedDeckIdentifierSet]
  )

  const ownedCandidateDecks = useMemo(
    () =>
      decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        archetype: deck.variant || deck.archetype || deck.name,
        comfort: deck.comfort ?? 3,
        owned: true,
        matchups: {},
      })),
    [decks]
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

  const hasRecommendations = results.length > 0
  const topRecommendation = results[0]
  const visibleMetaBreakdown = metaBreakdown
    .slice()
    .sort((a, b) => b.normalizedShare - a.normalizedShare)
  const previewMetaBreakdown = visibleMetaBreakdown.slice(0, 5)
  const hasFullMeta = visibleMetaBreakdown.length > previewMetaBreakdown.length
  const tournamentStructureItems =
    eventType === 'cup'
      ? [
          {
            label: 'Swiss',
            value: `${structure.swissRounds} rounds`,
          },
          {
            label: 'Elimination',
            value: `${structure.singleEliminationRounds} rounds`,
          },
          { label: 'Top Cut', value: structure.topCutLabel },
          {
            label: 'Total Event Length',
            value: structure.totalEventLength,
          },
        ]
      : eventType === 'regional' && structure.phaseOneRounds
        ? [
            {
              label: 'Phase 1',
              value: `${structure.phaseOneRounds} rounds`,
            },
            {
              label: 'Phase 2 Threshold',
              value: `${structure.phaseTwoThreshold} Match Points`,
            },
            {
              label: 'Phase 2',
              value: `${structure.phaseTwoRounds} rounds`,
            },
            {
              label: 'Total Swiss',
              value: `${structure.totalSwissRounds} rounds`,
            },
            { label: 'Top Cut', value: structure.topCutLabel },
          ]
        : [
            {
              label: 'Swiss',
              value: `${structure.swissRounds} rounds`,
            },
            { label: 'Top Cut', value: structure.topCutLabel },
          ]
  const eventSummarySection = (
    <NestedPanel className="space-y-4 rounded-[18px] p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <p className="type-section-title min-w-0 break-words text-left text-[var(--text-primary)]">
          {getEventTypeLabel(eventType)}
        </p>

        <MetricRow
          label="Players"
          value={eventSize}
          className="min-w-16 flex-col items-end gap-1 text-right"
        />
      </div>

      <NestedPanel variant="compact" className="space-y-3">
        <p className="text-sm font-semibold text-white">
          Tournament Structure
        </p>
        <KeyValueList
          className="text-sm"
          items={tournamentStructureItems}
        />
      </NestedPanel>
    </NestedPanel>
  )
  const expectedMetaSection = (
    <NestedPanel className="rounded-[18px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <SectionHeader title="Expected Meta" level={3} />
        <Button
          tone="tertiary"
          size="sm"
          onClick={() => setAdvisorSetupOpen(true)}
          className="min-h-9 shrink-0 px-2"
        >
          Edit
        </Button>
      </div>

      <SegmentedControl
        value={metaInputMode}
        onChange={handleMetaInputModeChange}
        options={[
          { label: '% of Field', value: 'percent' },
          { label: '# Players', value: 'players' },
        ]}
        className="mb-3"
      />

      {previewMetaBreakdown.length > 0 ? (
        <div className="space-y-2">
          {[
            ...previewMetaBreakdown,
            ...(otherMetaTotal > 0
              ? [
                  {
                    name: 'Other',
                    normalizedShare:
                      metaInputMode === 'players' && eventSize > 0
                        ? (otherMetaTotal / eventSize) * 100
                        : otherMetaTotal,
                    playerCountShare:
                      metaInputMode === 'players'
                        ? otherMetaTotal
                        : eventSize > 0
                          ? (otherMetaTotal / 100) * eventSize
                          : 0,
                  },
                ]
              : []),
          ].map((metaDeck) => {
            const valueLabel =
              metaInputMode === 'percent'
                ? `${metaDeck.normalizedShare.toFixed(1)}%`
                : `${Math.round(metaDeck.playerCountShare)} players`

            return (
              <div key={metaDeck.name} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="type-card-title min-w-0 truncate text-[var(--text-primary)]">
                    {metaDeck.name}
                  </span>
                  <span className="type-metadata shrink-0 text-[var(--text-secondary)]">
                    {valueLabel}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{
                      width: `${Math.min(
                        100,
                        metaDeck.normalizedShare
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )
          })}

          {hasFullMeta && (
            <button
              type="button"
              onClick={() => setAdvisorSetupOpen(true)}
              className="motion-press type-card-title w-full rounded-xl py-2 text-left text-[#6fb2ed] hover:bg-[rgba(23,107,181,0.1)]"
            >
              View full meta
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <EmptyState>
            Add expected archetypes to preview the field.
          </EmptyState>

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
        </div>
      )}
    </NestedPanel>
  )

  const recommendationSection = (
    <div className="space-y-3">
      <SectionHeader title="Recommended Decks" level={3} />

      <AdvisorModeControl
        candidateSource={candidateSource}
        setCandidateSource={setCandidateSource}
      />

      {hasRecommendations ? (
        <div className="space-y-3">
          <RecommendationCard
            result={topRecommendation}
            rank={1}
            insight={getRecommendationInsight(topRecommendation)}
          />

          {results.length > 1 && (
            <div className="space-y-3">
              <p className="type-metadata px-1 text-[var(--text-muted)]">
                Alternatives
              </p>

              {results.slice(1).map((result, index) => (
                <RecommendationCard
                  key={`${result.deckName}-${index + 1}`}
                  result={result}
                  rank={index + 2}
                  insight={getRecommendationInsight(result)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <NestedPanel className="space-y-4 rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="type-section-title text-[var(--text-primary)]">
                Add expected meta to get a deck pick.
              </p>

              <p className="type-helper mt-2 text-[var(--text-muted)]">
                Suggested meta is the fastest starting point before manual tuning.
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              setMetaInputMode('percent')
              setMetaDecks(suggestedMeta)
            }}
            tone="primary"
            size="lg"
            className="w-full"
          >
            Use Suggested Meta
          </Button>
        </NestedPanel>
      )}
    </div>
  )

  const sourcesSection = (
    <DisclosurePanel
      title="Sources"
      description="Meta and matchup data"
      open={sourcesOpen}
      onToggle={() => setSourcesOpen((current) => !current)}
      actionOpenLabel="Show"
      actionCloseLabel="Hide"
      contentClassName="border-t border-white/10 p-4"
    >
      <KeyValueList
        className="text-sm"
        items={[
          { label: 'Meta', value: suggestedMetaSourceLabel },
          { label: 'Matchups', value: '20 large Limitless events' },
        ]}
      />
    </DisclosurePanel>
  )

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader title="Advisor" />

        <div className="flex shrink-0 items-center gap-2">
          <Button
            tone="tertiary"
            onClick={clearAdvisorData}
            className="min-h-11 px-3"
          >
            Clear All
          </Button>

          <Button
            tone="primary"
            onClick={() => setAdvisorSetupOpen(true)}
            className="min-h-11 px-4"
          >
            New Event
          </Button>
        </div>
      </div>

      {eventConfigured && eventSize > 0 && (
        <>
          {eventSummarySection}
          {expectedMetaSection}
          {recommendationSection}

          {sourcesSection}
        </>
      )}

      <Sheet
        open={advisorSetupOpen}
        onClose={() => setAdvisorSetupOpen(false)}
        ariaLabel="advisor setup"
        className="items-start overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(5.75rem+env(safe-area-inset-top))]"
        contentClassName="mb-auto max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[26px] p-0"
      >
        <div className="space-y-5 p-4">
          <div className="space-y-3">
            <SectionHeader title="Tournament Setup" level={3} />
            <AdvisorEventSetup
              eventType={eventType}
              setEventType={setEventType}
              playerCount={playerCount}
              setPlayerCount={setPlayerCount}
              eventSize={eventSize}
              structure={structure}
            />
          </div>

          <div className="space-y-3">
            <SectionHeader title="Full Meta Editor" level={3} />
            <ExpectedMetaEditor
              archetypeOptions={archetypeOptions}
              eventSize={eventSize}
              metaDecks={metaDecks}
              setMetaDecks={setMetaDecks}
              metaInputMode={metaInputMode}
              setMetaInputMode={handleMetaInputModeChange}
              suggestedMeta={suggestedMeta}
            />
          </div>

          <Button
            tone="primary"
            className="w-full"
            disabled={eventSize <= 0}
            onClick={() => {
              setEventConfigured(true)
              setAdvisorSetupOpen(false)
            }}
          >
            Submit
          </Button>
        </div>
      </Sheet>
    </section>
  )
}
