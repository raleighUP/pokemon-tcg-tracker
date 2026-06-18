import { getMatchupSampleSize, getMatchupWinRate } from '@/utils/matchups'
import {
  Sheet,
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
  const openDeck = ownedCandidateDecks.find((deck) => deck.id === openDeckId)

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
            variant="compact"
            className="space-y-3 rounded-2xl p-3"
          >
            <button
              type="button"
              onClick={() => setOpenDeckId(deck.id)}
              className="motion-press flex w-full items-center justify-between gap-3 rounded-xl text-left"
            >
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

              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {deck.comfort}/5
              </span>
            </button>

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
          </NestedPanel>
        ))
      )}

      <Sheet
        open={Boolean(openDeck)}
        onClose={() => setOpenDeckId(null)}
        ariaLabel="owned deck matchups"
        className="items-start overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(5.75rem+env(safe-area-inset-top))]"
        contentClassName="mb-auto overflow-hidden rounded-[26px] p-0"
      >
        {openDeck && (
          <div className="space-y-4 p-4">
            <div>
              <h3 className="type-section-title text-white">
                {openDeck.name}
              </h3>
              <p className="type-metadata mt-1 text-[var(--text-muted)]">
                {openDeck.archetype} - Comfort {openDeck.comfort}/5
              </p>
            </div>

            <div className="space-y-2">
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
                      openDeck.archetype || openDeck.name,
                      metaDeck.name
                    )

                    const sampleSize = getMatchupSampleSize(
                      openDeck.archetype || openDeck.name,
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
                        tone={getMatchupTone(matchupWinRate)}
                      />
                    )
                  })
              )}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
