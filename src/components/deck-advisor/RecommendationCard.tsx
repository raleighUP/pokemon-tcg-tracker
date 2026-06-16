import { useState } from 'react'
import {
  DisclosureAction,
  DisclosurePanel,
  EmptyState,
  MetricRow,
  MetricTile,
  NestedPanel,
  StatusBadge,
  cn,
} from '@/components/ui'
import { DeckAdvisorResult } from './types'

type Props = {
  result: DeckAdvisorResult
  rank: number
  insight: string
}

export default function RecommendationCard({
  result,
  rank,
  insight,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const isTopPick = rank === 1

  return (
    <DisclosurePanel
      open={detailsOpen}
      onToggle={() => setDetailsOpen((current) => !current)}
      showAction={false}
      className={cn(
        'motion-surface overflow-hidden rounded-2xl p-0',
        isTopPick ? 'card-hero' : 'card-data'
      )}
      buttonClassName={cn(
        'p-4',
        isTopPick ? 'sm:p-5' : ''
      )}
      contentClassName="card-detail space-y-4 border-t border-white/10 px-4 pb-4 pt-4"
      header={
        <div className="w-full">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge
                  className={
                    isTopPick
                      ? 'bg-blue-500/20 px-2.5 py-1 text-blue-200'
                      : 'bg-white/10 px-2.5 py-1 text-slate-300'
                  }
                >
                  {isTopPick ? 'Recommended' : `#${rank}`}
                </StatusBadge>

                <span className="type-metadata text-[var(--text-muted)]">
                  Comfort {result.comfort}/5
                </span>
              </div>

              <p
                className={`truncate text-white ${
                  isTopPick
                    ? 'text-[1.7rem] font-[780] leading-tight'
                    : 'type-section-title'
                }`}
              >
                {result.deckName}
              </p>

              <p className="mt-2 max-w-xl text-sm leading-5 text-blue-100/90">
                {insight}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p
                className={
                  isTopPick
                    ? 'text-[2.15rem] font-[780] leading-none text-white'
                    : 'type-metric-value'
                }
              >
                {result.adjustedScore.toFixed(1)}
              </p>

              <p className="type-metadata mt-1 text-[var(--text-muted)]">
                Score
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MetricTile
              label="Field WR"
              value={`${result.fieldWinRate.toFixed(1)}%`}
            />

            <MetricTile
              label="Comfort"
              value={`${result.comfortBonus >= 0 ? '+' : ''}${result.comfortBonus.toFixed(
                1
              )}%`}
            />
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <p className="type-metadata text-[var(--text-muted)]">
              Decision detail
            </p>

            <DisclosureAction
              open={detailsOpen}
              openLabel="Inspect"
              closeLabel="Hide"
            />
          </div>
        </div>
      }
    >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <NestedPanel className="card-detail border-0 p-3">
                <p className="mb-2 font-semibold text-green-400">
                  Best Matchups
                </p>

                <div className="space-y-1">
                  {result.bestMatchups.length === 0 ? (
                    <EmptyState className="border-0 bg-transparent p-0 text-xs text-slate-500">
                      No favorable sampled matchups above 50%.
                    </EmptyState>
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
              </NestedPanel>

              <NestedPanel className="card-detail border-0 p-3">
                <p className="mb-2 font-semibold text-red-400">
                  Worst Matchups
                </p>

                <div className="space-y-1">
                  {result.worstMatchups.length === 0 ? (
                    <EmptyState className="border-0 bg-transparent p-0 text-xs text-slate-500">
                      No unfavorable sampled matchups below 50%.
                    </EmptyState>
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
              </NestedPanel>
            </div>
    </DisclosurePanel>
  )
}
