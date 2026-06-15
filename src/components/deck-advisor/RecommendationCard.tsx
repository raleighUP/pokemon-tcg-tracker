import {
  EmptyState,
  MetricRow,
  MetricTile,
  NestedPanel,
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
  return (
    <NestedPanel className="space-y-4">
      <div className="flex justify-between gap-4">
        <div>
          <p className="font-bold">
            #{rank} {result.deckName}
          </p>

          <p className="text-sm text-slate-400">
            Comfort: {result.comfort}/5
          </p>

          <p className="text-xs text-blue-300 mt-1 max-w-xl">
            {insight}
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
        <NestedPanel className="border-0 bg-slate-900 p-3">
          <p className="font-semibold text-green-400 mb-2">
            Best Matchups
          </p>

          <div className="space-y-1">
            {result.bestMatchups.length === 0 ? (
              <EmptyState className="text-slate-500 text-xs">
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

        <NestedPanel className="border-0 bg-slate-900 p-3">
          <p className="font-semibold text-red-400 mb-2">
            Worst Matchups
          </p>

          <div className="space-y-1">
            {result.worstMatchups.length === 0 ? (
              <EmptyState className="text-slate-500 text-xs">
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
    </NestedPanel>
  )
}
