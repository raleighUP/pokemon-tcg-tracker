import { Match } from '@/types'

type Props = {
  matches: Match[]
}

export default function MatchHistory({
  matches,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-4">
        Match History
      </h2>

      {matches.length === 0 ? (
        <p className="text-slate-400">
          No matches logged yet.
        </p>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const wins = match.games.filter(
              (g) => g === 'W'
            ).length

            const losses = match.games.filter(
              (g) => g === 'L'
            ).length

            return (
              <div
                key={match.id}
                className="bg-slate-800 rounded-xl p-4"
              >
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="font-semibold">
                      {match.deck}
                    </p>

                    <p className="text-slate-400 text-sm">
                      vs {match.opponentDeck}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">
                      {wins}-{losses}
                    </p>

                    <p className="text-slate-400 text-sm">
                      {match.format}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {match.games.map((game, index) => (
                    <div
                      key={index}
                      className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                        game === 'W'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                    >
                      {game}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}