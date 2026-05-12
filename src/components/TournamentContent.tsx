import type React from 'react'
import MatchCard from '@/components/MatchCard'
import StatsTable from '@/components/StatsTable'
import BracketView from '@/components/BracketView'
import TournamentTabsClient from '@/components/TournamentTabsClient'
import type { MatchPrediction, Tournament, TournamentStats, TeamAccuracy } from '@/lib/types'
import type { H2HData } from '@/lib/queries'

interface Stage {
  stageName: string
  stageDate: string | null
  stageOrder: number
  matches: MatchPrediction[]
}

interface LiveScoreEntry { nameA: string; nameB: string; scoreA: number; scoreB: number }

interface Props {
  tournament: Tournament
  stages: Stage[]
  stats: TournamentStats | null
  teamAccuracy: TeamAccuracy[]
  h2hMap?: Record<string, H2HData>
  liveScoreMap?: Map<string, LiveScoreEntry>
  bracketExtra?: React.ReactNode
  locale?: 'en' | 'ru'
}

const ANALYSIS_PREVIEW = 800

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.lastIndexOf(' ', max)
  return (cut > 0 ? text.slice(0, cut) : text.slice(0, max)) + '…'
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
    .map(([dateKey, matches]) => ({ dateKey, matches: [...matches].sort((a, b) => priority(a) - priority(b)) }))
}

const L10N = {
  en: {
    noPredictions: 'No predictions yet',
    noPredictionsHint: "Predictions will appear here as they're added.",
    predictions: 'Predictions',
    matchPredictions: 'Match Predictions',
    dateLocale: 'en-US',
  },
  ru: {
    noPredictions: 'Прогнозов пока нет',
    noPredictionsHint: 'Прогнозы появятся здесь по мере добавления.',
    predictions: 'Прогнозы',
    matchPredictions: 'Прогнозы на матчи',
    dateLocale: 'ru-RU',
  },
}

export default function TournamentContent({ tournament, stages, stats, teamAccuracy, h2hMap, liveScoreMap, bracketExtra, locale = 'en' }: Props) {
  const T = L10N[locale]
  function resolveLiveScore(match: MatchPrediction) {
    if (!liveScoreMap) return undefined
    const t1 = match.team_1?.name ?? ''
    const t2 = match.team_2?.name ?? ''
    let entry = match.pandascore_match_id ? liveScoreMap.get(String(match.pandascore_match_id)) : undefined
    if (!entry) {
      const pairKey = [t1.toLowerCase(), t2.toLowerCase()].sort().join('|')
      entry = liveScoreMap.get(pairKey)
    }
    if (!entry) return undefined
    const aL = entry.nameA.toLowerCase(), t1L = t1.toLowerCase()
    const t1IsA = aL === t1L || t1L.includes(aL) || aL.includes(t1L)
    return { score1: t1IsA ? entry.scoreA : entry.scoreB, score2: t1IsA ? entry.scoreB : entry.scoreA }
  }
  const dateGroups = buildDateGroups(stages)

  const picksContent = (
    <>
      {dateGroups.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-4xl mb-3">⚔️</p>
          <p className="font-semibold mb-1">{T.noPredictions}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {T.noPredictionsHint}
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
                      ? `${new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(T.dateLocale, {
                          month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Europe/Athens',
                        })} — ${T.predictions}`
                      : T.matchPredictions}
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
                {dateMatches.map((match) => {
                  const cardMatch = match.pre_analysis || match.post_commentary ? {
                    ...match,
                    pre_analysis: match.pre_analysis ? truncateAtWord(match.pre_analysis, ANALYSIS_PREVIEW) : null,
                    post_commentary: match.post_commentary ? truncateAtWord(match.post_commentary, ANALYSIS_PREVIEW) : null,
                  } : match
                  const teamPrefix = locale === 'ru' ? '/ru/teams' : '/teams'
                  const tournamentPrefix = locale === 'ru' ? '/ru/tournaments' : '/tournaments'
                  return <MatchCard key={match.id} match={cardMatch} tournament={tournament} h2h={h2hMap?.[match.id]} liveScore={resolveLiveScore(match)} locale={locale} teamPrefix={teamPrefix} tournamentPrefix={tournamentPrefix} />
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  )

  const bracketStages = stages.filter(s => {
    const n = s.stageName.toLowerCase()
    return n.includes('upper') || n.includes('lower') || n.includes('grand final') || /\bub\b/.test(n) || /\blb\b/.test(n)
  })
  const bracketContent = (
    <>
      {bracketExtra}
      {bracketStages.length > 0 && <BracketView rounds={bracketStages} />}
    </>
  )

  return (
    <>
      {/* Stats */}
      {stats && stats.total_predictions > 0 && (
        <div className="mb-6">
          <h2 className="section-label mb-4">Statistics</h2>
          <StatsTable stats={stats} teamAccuracy={teamAccuracy} locale={locale} />
        </div>
      )}

      <TournamentTabsClient picks={picksContent} bracket={bracketContent} />
    </>
  )
}
