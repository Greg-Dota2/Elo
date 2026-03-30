import MatchCard from '@/components/MatchCard'
import StatsTable from '@/components/StatsTable'
import BracketView from '@/components/BracketView'
import TournamentTabsClient from '@/components/TournamentTabsClient'
import type { MatchPrediction, Tournament, TournamentStats, TeamAccuracy } from '@/lib/types'

interface Stage {
  stageName: string
  stageDate: string | null
  stageOrder: number
  matches: MatchPrediction[]
}

interface Props {
  tournament: Tournament
  stages: Stage[]
  stats: TournamentStats | null
  teamAccuracy: TeamAccuracy[]
}

function buildDateGroups(stages: Stage[]) {
  const allMatches = stages.flatMap(s => s.matches)
  const byDate = new Map<string, MatchPrediction[]>()
  for (const m of allMatches) {
    const dateKey = m.match_date ?? 'undated'
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey)!.push(m)
  }
  const now = Date.now()
  const priority = (m: MatchPrediction) => {
    if (m.score_team_1 !== null && m.score_team_2 !== null) return 2
    const start = m.match_date && m.match_time
      ? new Date(`${m.match_date}T${m.match_time}:00Z`).getTime()
      : null
    return start && now >= start ? 0 : 1
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, matches]) => ({ dateKey, matches: [...matches].sort((a, b) => priority(b) - priority(a)) }))
}

export default function TournamentContent({ tournament, stages, stats, teamAccuracy }: Props) {
  const dateGroups = buildDateGroups(stages)

  const picksContent = (
    <>
      {dateGroups.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-4xl mb-3">⚔️</p>
          <p className="font-semibold mb-1">No predictions yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Predictions will appear here as they&apos;re added.
          </p>
        </div>
      ) : (
        <>
          {dateGroups.map(({ dateKey, matches: dateMatches }) => (
            <div key={dateKey} className="mb-10">
              <div
                className="flex items-center justify-between mb-4 pb-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                  <h2 className="font-bold text-base">
                    {dateKey !== 'undated'
                      ? new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Europe/Athens',
                        })
                      : 'Matches'}
                  </h2>
                </div>
                {tournament.liquipedia_url && (
                  <a
                    href={tournament.liquipedia_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs transition-colors hover:text-white"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Liquipedia ↗
                  </a>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dateMatches.map((match) => (
                  <MatchCard key={match.id} match={match} tournament={tournament} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  )

  const bracketContent = <BracketView rounds={stages} />

  return (
    <>
      {/* Stats */}
      {stats && stats.total_predictions > 0 && (
        <div className="mb-6">
          <p className="section-label mb-4">Statistics</p>
          <StatsTable stats={stats} teamAccuracy={teamAccuracy} />
        </div>
      )}

      <TournamentTabsClient picks={picksContent} bracket={bracketContent} />
    </>
  )
}
