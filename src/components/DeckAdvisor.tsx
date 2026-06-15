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
  EmptyState,
  Panel,
  SectionHeader,
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

  return (
    <Panel className="space-y-6">
      <SectionHeader
        title="Deck Advisor"
        description="Build an expected tournament field and determine which deck gives you the best chance of success."
      />

      <AdvisorEventSetup
        eventType={eventType}
        setEventType={setEventType}
        playerCount={playerCount}
        setPlayerCount={setPlayerCount}
        eventSize={eventSize}
        structure={structure}
      />

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

      <AdvisorModeControl
        candidateSource={candidateSource}
        setCandidateSource={setCandidateSource}
      />

      {candidateSource === 'owned' && (
        <OwnedDeckComfortList
          ownedCandidateDecks={ownedCandidateDecks}
          metaDecks={metaDecks}
          setDeckComfortById={setDeckComfortById}
          getMatchupTone={getMatchupTone}
        />
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
              <RecommendationCard
                key={`${result.deckName}-${index}`}
                result={result}
                rank={index + 1}
                insight={getRecommendationInsight(result)}
              />
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}
