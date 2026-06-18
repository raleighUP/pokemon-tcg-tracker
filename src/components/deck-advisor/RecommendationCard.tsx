import { useState } from 'react'
import {
  ContextActionSheet,
  DisclosureAction,
  DisclosurePanel,
  EmptyState,
  MetricRow,
  MetricTile,
  NestedPanel,
  StatusBadge,
  SwipeActionRow,
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
  const [contextOpen, setContextOpen] = useState(false)
  const isTopPick = rank === 1
  const detailTileClass =
    '[background:rgba(255,255,255,0.035)] border-white/8 shadow-none'
  const matchupPanelClass =
    'rounded-2xl border border-white/8 [background:rgba(12,12,14,0.42)] shadow-none'
  const matchupEmptyClass =
    'border border-white/6 [background:rgba(255,255,255,0.025)] px-3 py-3 text-xs text-[var(--text-muted)]'

  return (
    <>
      <SwipeActionRow
        open={false}
        onOpenChange={() => undefined}
        actions={[]}
        onContextOpen={() => setContextOpen(true)}
      >
        <DisclosurePanel
          open={detailsOpen}
          onToggle={() => setDetailsOpen((current) => !current)}
          showAction={false}
          className={cn(
            'motion-surface overflow-hidden rounded-[18px] p-0',
            isTopPick
              ? 'surface-card-glass border-[rgba(23,107,181,0.38)] shadow-[0_18px_46px_rgba(0,0,0,0.42)]'
              : 'surface-card-elevated'
          )}
          buttonClassName={cn(
            'p-4',
            isTopPick ? 'sm:p-5' : ''
          )}
          contentClassName="card-detail mx-4 mb-4 space-y-4 rounded-2xl border border-white/8 [background:rgba(255,255,255,0.018)] p-3"
          header={
            <div className="w-full">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      className={
                        isTopPick
                          ? 'bg-[rgba(23,107,181,0.2)] px-2.5 py-1 text-[#b7dcfb]'
                          : 'bg-white/10 px-2.5 py-1 text-[var(--text-secondary)]'
                      }
                    >
                      #{rank}
                    </StatusBadge>

                    <span className="type-metadata text-[var(--text-muted)]">
                      Comfort {result.comfort}/5
                    </span>
                  </div>

                  <p
                    className={`break-words text-white ${
                      isTopPick
                        ? 'text-[1.3rem] font-[780] leading-tight'
                        : 'type-section-title'
                    }`}
                  >
                    {result.deckName}
                  </p>

                  <p className="type-metadata mt-1 break-words text-[var(--text-muted)]">
                    {result.archetype}
                  </p>
                </div>

                <div className="w-[4.7rem] shrink-0 text-right sm:w-24">
                  <p
                    className={
                      isTopPick
                        ? 'text-[1.75rem] font-[780] leading-none text-white sm:text-[2rem]'
                        : 'text-[1.45rem] font-[780] leading-none text-white sm:text-[1.7rem]'
                    }
                  >
                    {result.fieldWinRate.toFixed(1)}%
                  </p>

                  <p className="type-metadata mt-1 text-[var(--text-muted)]">
                    field WR
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <p className="type-metadata min-w-0 truncate text-[var(--text-secondary)]">
                  {insight}
                </p>

                <DisclosureAction
                  open={detailsOpen}
                  openLabel="Show"
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
                className={detailTileClass}
                labelClassName="text-[var(--text-muted)]"
              />

              <MetricTile
                label="Comfort Impact"
                value={`${result.comfortBonus >= 0 ? '+' : ''}${result.comfortBonus.toFixed(
                  1
                )}%`}
                className={detailTileClass}
                labelClassName="text-[var(--text-muted)]"
              />

              <MetricTile
                label="Final Score"
                value={`${result.adjustedScore.toFixed(1)}%`}
                className={detailTileClass}
                labelClassName="text-[var(--text-muted)]"
              />

              <MetricTile
                label="Field Coverage"
                value={
                  result.fieldCoverage === null
                    ? 'Unknown'
                    : `${result.fieldCoverage.toFixed(1)}%`
                }
                detail={result.fieldCoverageLabel}
                className={detailTileClass}
                labelClassName="text-[var(--text-muted)]"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <NestedPanel variant="compact" className={matchupPanelClass}>
                <p className="mb-2 font-semibold text-[#64b572]">
                  Best Matchups
                </p>

                <div className="space-y-1">
                  {result.bestMatchups.length === 0 ? (
                    <EmptyState className={matchupEmptyClass}>
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
                            <span className="text-[var(--text-muted)]">
                              ({matchup.sampleSize})
                            </span>
                          </>
                        }
                      />
                    ))
                  )}
                </div>
              </NestedPanel>

              <NestedPanel variant="compact" className={matchupPanelClass}>
                <p className="mb-2 font-semibold text-[#d75d5d]">
                  Worst Matchups
                </p>

                <div className="space-y-1">
                  {result.worstMatchups.length === 0 ? (
                    <EmptyState className={matchupEmptyClass}>
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
                            <span className="text-[var(--text-muted)]">
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
      </SwipeActionRow>

      <ContextActionSheet
        open={contextOpen}
        onClose={() => setContextOpen(false)}
        title={result.deckName}
        subtitle={insight}
        ariaLabel="recommendation details"
        details={[
          { label: 'Rank', value: `#${rank}` },
          { label: 'Score', value: result.adjustedScore.toFixed(1) },
          { label: 'Field WR', value: `${result.fieldWinRate.toFixed(1)}%` },
          {
            label: 'Comfort Impact',
            value: `${result.comfortBonus >= 0 ? '+' : ''}${result.comfortBonus.toFixed(1)}%`,
          },
          {
            label: 'Field Coverage',
            value:
              result.fieldCoverage === null
                ? 'Unknown'
                : `${result.fieldCoverage.toFixed(1)}%`,
          },
        ]}
      >
        <div className="surface-card-elevated rounded-2xl border border-[var(--surface-border)] p-3">
          <p className="type-metadata mb-2 text-[var(--text-muted)]">
            Matchup Reasoning
          </p>
          <p className="type-helper text-[var(--text-secondary)]">
            {result.fieldCoverageLabel}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="surface-card-elevated rounded-2xl border border-[var(--surface-border)] p-3">
            <p className="type-metadata mb-2 text-[#64b572]">
              Best Matchups
            </p>
            <div className="space-y-2">
              {result.bestMatchups.length > 0 ? (
                result.bestMatchups.map((matchup) => (
                  <MetricRow
                    key={matchup.name}
                    label={matchup.name}
                    value={`${matchup.winRate.toFixed(1)}%`}
                  />
                ))
              ) : (
                <p className="type-helper text-[var(--text-muted)]">
                  No favorable sampled matchups above 50%.
                </p>
              )}
            </div>
          </div>

          <div className="surface-card-elevated rounded-2xl border border-[var(--surface-border)] p-3">
            <p className="type-metadata mb-2 text-[#d75d5d]">
              Worst Matchups
            </p>
            <div className="space-y-2">
              {result.worstMatchups.length > 0 ? (
                result.worstMatchups.map((matchup) => (
                  <MetricRow
                    key={matchup.name}
                    label={matchup.name}
                    value={`${matchup.winRate.toFixed(1)}%`}
                  />
                ))
              ) : (
                <p className="type-helper text-[var(--text-muted)]">
                  No unfavorable sampled matchups below 50%.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="surface-card-elevated rounded-2xl border border-[var(--surface-border)] p-3">
          <MetricRow
            label="Source Notes"
            value="Limitless matchup sample"
          />
        </div>
      </ContextActionSheet>
    </>
  )
}
