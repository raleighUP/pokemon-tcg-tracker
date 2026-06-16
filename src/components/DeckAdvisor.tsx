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
  NestedPanel,
  Panel,
  SectionHeader,
  StatusBadge,
} from '@/components/ui'
import AdvisorModeControl from './deck-advisor/AdvisorModeControl'
import AdvisorEventSetup from './deck-advisor/AdvisorEventSetup'
import ExpectedMetaEditor from './deck-advisor/ExpectedMetaEditor'
import OwnedDeckComfortList from './deck-advisor/OwnedDeckComfortList'
import RecommendationCard from './deck-advisor/RecommendationCard'
import {
  getFieldCoverageLabel,
  getMatchupTone,
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
  metaInputMode?: MetaInputMode
  metaDecks?: {
    name: string
    share: number
  }[]
  deckComfortById?: Record<number, number>
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

  const deckComfortById = isRecord(value.deckComfortById)
    ? Object.entries(value.deckComfortById).reduce<
        Record<number, number>
      >((comfortById, [deckId, comfort]) => {
        const normalizedDeckId = Number(deckId)
        const normalizedComfort = Number(comfort)

        if (
          !Number.isFinite(normalizedDeckId) ||
          !Number.isFinite(normalizedComfort)
        ) {
          return comfortById
        }

        comfortById[normalizedDeckId] = Math.min(
          5,
          Math.max(1, normalizedComfort)
        )

        return comfortById
      }, {})
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
    metaInputMode,
    metaDecks:
      metaDecks && metaDecks.length > 0
        ? metaDecks
        : undefined,
    deckComfortById,
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

export default function DeckAdvisor({ decks }: Props) {
  const storedAdvisorData = useMemo(
    () => readStoredAdvisorData(),
    []
  )

  const [comfortOpen, setComfortOpen] = useState(true)

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
    useState<CandidateSource>(
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

  const ownedCandidateDecks = useMemo(
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

  const hasRecommendations = results.length > 0
  const topRecommendation = results[0]

  const recommendationSection = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader title="Recommendation" level={3} />

        {hasRecommendations && (
          <StatusBadge className="bg-blue-500/15 px-2.5 py-1 text-blue-200">
            {candidateSource === 'owned' ? 'Owned' : 'Top Meta'}
          </StatusBadge>
        )}
      </div>

      <NestedPanel className="rounded-2xl bg-slate-950">
        <KeyValueList
          className="text-sm"
          items={[
            {
              label: 'Expected Field',
              value:
                normalizedMetaDecks.length > 0
                  ? `${normalizedMetaDecks.length} decks`
                  : 'Not set',
            },
            {
              label: 'Event',
              value:
                eventSize > 0
                  ? `${eventType} - ${eventSize} players`
                  : eventType,
            },
            {
              label: 'Mode',
              value:
                candidateSource === 'owned'
                  ? 'Owned Decks'
                  : 'Top Meta',
            },
          ]}
        />
      </NestedPanel>

      {hasRecommendations ? (
        <div className="space-y-3">
          <RecommendationCard
            result={topRecommendation}
            rank={1}
            insight={getRecommendationInsight(topRecommendation)}
          />

          {results.length > 1 && (
            <div className="space-y-3">
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
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
        <NestedPanel className="space-y-4 rounded-2xl border-slate-800 bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <StatusBadge className="bg-white/10 px-2.5 py-1 text-slate-300">
                Waiting on Field
              </StatusBadge>

              <p className="mt-3 text-xl font-bold text-white">
                Add expected meta to get a deck pick.
              </p>

              <p className="mt-2 text-sm text-slate-400">
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

  return (
    <Panel className="space-y-6">
      <SectionHeader
        title="Deck Advisor"
      />

      <NestedPanel className="space-y-4 rounded-2xl border-slate-800 bg-slate-950">
        <SectionHeader title="Event Setup" level={3} />

        <AdvisorEventSetup
          eventType={eventType}
          setEventType={setEventType}
          playerCount={playerCount}
          setPlayerCount={setPlayerCount}
          eventSize={eventSize}
          structure={structure}
        />
      </NestedPanel>

      <NestedPanel className="space-y-4 rounded-2xl border-slate-800 bg-slate-950">
        <SectionHeader title="Meta Selection" level={3} />

        <ExpectedMetaEditor
          archetypeOptions={archetypeOptions}
          eventSize={eventSize}
          metaDecks={metaDecks}
          setMetaDecks={setMetaDecks}
          metaInputMode={metaInputMode}
          setMetaInputMode={setMetaInputMode}
          suggestedMeta={suggestedMeta}
          suggestedMetaSourceLabel={suggestedMetaSourceLabel}
          enteredMetaTotal={enteredMetaTotal}
          otherMetaTotal={otherMetaTotal}
          maxMetaTotal={maxMetaTotal}
          metaBreakdown={metaBreakdown}
        />
      </NestedPanel>

      <DisclosurePanel
        title="Candidate Decks"
        open={comfortOpen}
        onToggle={() => setComfortOpen((current) => !current)}
        contentClassName="border-t border-white/10 p-4"
      >
        <div className="space-y-6">
          <AdvisorModeControl
            candidateSource={candidateSource}
            setCandidateSource={setCandidateSource}
          />

          {candidateSource === 'owned' ? (
            <OwnedDeckComfortList
              ownedCandidateDecks={ownedCandidateDecks}
              metaDecks={metaDecks}
              setDeckComfortById={setDeckComfortById}
              getMatchupTone={getMatchupTone}
            />
          ) : (
            <EmptyState>
              Top Meta mode ranks expected archetypes with neutral comfort.
            </EmptyState>
          )}
        </div>
      </DisclosurePanel>

      {recommendationSection}
    </Panel>
  )
}
