import { getMatchupSampleSize, getMatchupWinRate } from '@/utils/matchups'
import {
  DisclosurePanel,
  EmptyState,
  FieldLabel,
  MatchupBadge,
  NestedPanel,
  RangeField,
} from '@/components/ui'
import { useState } from 'react'
import {
  AdvisorMetaDeckInput,
  MatchupTone,
  OwnedAdvisorCandidateDeck,
} from './types'

type Props = {
  ownedCandidateDecks: OwnedAdvisorCandidateDeck[]
  metaDecks: AdvisorMetaDeckInput[]
  setDeckComfortById: (
    update: (currentComfortById: Record<number, number>) => Record<number, number>
  ) => void
  getMatchupTone: (winRate: number) => MatchupTone
}

export default function OwnedDeckComfortList({
  ownedCandidateDecks,
  metaDecks,
  setDeckComfortById,
  getMatchupTone,
}: Props) {
  const [openDeckId, setOpenDeckId] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {ownedCandidateDecks.length === 0 ? (
        <EmptyState>
          Save a deck first to get owned-deck recommendations.
        </EmptyState>
      ) : (
        ownedCandidateDecks.map((deck) => (
          <NestedPanel
            key={deck.id}
            className="space-y-4 rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="type-card-title truncate text-white">
                  {deck.name}
                </p>

                {deck.archetype && (
                  <p className="type-metadata mt-1 text-[var(--text-muted)]">
                    {deck.archetype}
                  </p>
                )}
              </div>

              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
                {deck.comfort}/5
              </span>
            </div>

            <div>
              <FieldLabel>
                Comfort
              </FieldLabel>

              <RangeField
                min="1"
                max="5"
                value={deck.comfort}
                aria-label={`${deck.name} comfort`}
                onChange={(e) => {
                  const nextComfort = Number(e.target.value)

                  setDeckComfortById((currentComfortById) => ({
                    ...currentComfortById,
                    [deck.id]: nextComfort,
                  }))
                }}
              />
            </div>

            <DisclosurePanel
              title="Matchups"
              open={openDeckId === deck.id}
              onToggle={() =>
                setOpenDeckId((currentDeckId) =>
                  currentDeckId === deck.id ? null : deck.id
                )
              }
              buttonClassName="px-0 py-0"
              contentClassName="space-y-2 pt-3"
              className="border-0 bg-transparent p-0"
            >
              {metaDecks.filter((metaDeck) =>
                metaDeck.name.trim()
              ).length === 0 ? (
                <p className="type-helper text-[var(--text-muted)]">
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
                            : 'No matchup sample yet'
                        }
                        tone={getMatchupTone(
                          matchupWinRate
                        )}
                      />
                    )
                  })
              )}
            </DisclosurePanel>
          </NestedPanel>
        ))
      )}
    </div>
  )
}
