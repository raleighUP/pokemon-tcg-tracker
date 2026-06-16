import { getMatchupSampleSize, getMatchupWinRate } from '@/utils/matchups'
import {
  EmptyState,
  FieldLabel,
  MatchupBadge,
  NestedPanel,
  RangeField,
} from '@/components/ui'
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
            className="space-y-3"
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
                            : 'No data found - using 50/50 default'
                        }
                        tone={getMatchupTone(
                          matchupWinRate
                        )}
                      />
                    )
                  })
              )}
            </div>
          </NestedPanel>
        ))
      )}
    </div>
  )
}
