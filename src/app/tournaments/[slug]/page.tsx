import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  getTournamentBySlug,
  getPredictionsByTournament,
  getTournamentStats,
  getTeamAccuracy,
} from '@/lib/queries'
import TournamentContent from '@/components/TournamentContent'
import type { MatchPrediction } from '@/lib/types'
import {
  fetchUpcomingTier1Matches,
  fetchRunningTier1Matches,
  fetchTournamentStandings,
} from '@/lib/pandascore'
import GroupStageView, { type GroupData } from '@/components/GroupStageView'
import { format, isSameDay } from 'date-fns'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const t = await getTournamentBySlug(slug)
    const title = `${t.name} — Predictions & Analysis`
    const description = t.overview
      ? t.overview.slice(0, 155)
      : `Match predictions, analysis, and accuracy tracking for ${t.name} on Dota2ProTips.`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/tournaments/${slug}`,
        ...(t.logo_url ? { images: [{ url: t.logo_url, alt: t.name }] } : {}),
      },
      twitter: { card: 'summary', title, description },
      alternates: { canonical: `/tournaments/${slug}` },
    }
  } catch {
    return { title: 'Tournament Not Found' }
  }
}

interface Props {
  params: Promise<{ slug: string }>
}

function groupByStage(
  predictions: MatchPrediction[]
): { stageName: string; stageDate: string | null; stageOrder: number; matches: MatchPrediction[] }[] {
  const map = new Map<
    string,
    { stageName: string; stageDate: string | null; stageOrder: number; matches: MatchPrediction[] }
  >()

  for (const p of predictions) {
    const key = p.stage?.id ?? 'ungrouped'
    const stageName = p.stage?.name ?? 'Matches'
    const stageDate = p.stage?.stage_date ?? null
    const stageOrder = p.stage?.stage_order ?? 0

    if (!map.has(key)) {
      map.set(key, { stageName, stageDate, stageOrder, matches: [] })
    }
    map.get(key)!.matches.push(p)
  }

  return Array.from(map.values()).sort((a, b) => b.stageOrder - a.stageOrder)
}

export default async function TournamentPage({ params }: Props) {
  const { slug } = await params

  let tournament
  try {
    tournament = await getTournamentBySlug(slug)
  } catch {
    notFound()
  }

  const [predictions, stats, teamAccuracy, upcomingPS, runningPS] = await Promise.all([
    getPredictionsByTournament(tournament.id).catch(() => []),
    getTournamentStats(tournament.id).catch(() => null),
    getTeamAccuracy(tournament.id, 3).catch(() => []),
    fetchUpcomingTier1Matches(50).catch(() => []),
    fetchRunningTier1Matches(20).catch(() => []),
  ])

  // Filter PandaScore matches to this tournament by matching slug
  const psMatches = [...runningPS, ...upcomingPS].filter(m => {
    const psSlug = `${m.league.name}-${m.serie.full_name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    return psSlug === tournament.slug
  })

  // Group by PandaScore sub-tournament (group)
  const scheduleByGroup = psMatches.reduce<Record<string, typeof psMatches>>((acc, m) => {
    const key = String(m.tournament.id)
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  // Build group stage data: fetch standings per sub-tournament, fall back to teams from matches
  const groupsData: GroupData[] = await Promise.all(
    Object.entries(scheduleByGroup).map(async ([subId, matches]) => {
      const sub = matches[0].tournament
      const standings = await fetchTournamentStandings(Number(subId)).catch(() => [])

      // If no standings yet, derive team list from match opponents
      const derivedStandings = standings.length > 1 ? standings : (() => {
        const seen = new Map<number, typeof standings[0]['team']>()
        for (const m of matches) {
          for (const opp of m.opponents) {
            if (!seen.has(opp.opponent.id)) {
              seen.set(opp.opponent.id, opp.opponent)
            }
          }
        }
        return Array.from(seen.values()).map((team, i) => ({
          rank: i + 1,
          team,
          wins: 0,
          draws: 0,
          losses: 0,
          total: 0,
        }))
      })()

      return { id: Number(subId), name: sub.name, standings: derivedStandings, matches }
    })
  ).then(groups => groups.filter(g => g.standings.length > 1))

  const stages = groupByStage(predictions)

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Tournaments', item: 'https://dota2protips.com/tournaments' },
              { '@type': 'ListItem', position: 2, name: tournament.name, item: `https://dota2protips.com/tournaments/${slug}` },
            ],
          }),
        }}
      />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Link
          href="/tournaments"
          className="transition-colors duration-150 hover:text-white"
        >
          Tournaments
        </Link>
        <span style={{ color: 'var(--text-subtle)' }}>/</span>
        <span>{tournament.name}</span>
      </div>

      {/* ── Tournament header ── */}
      <div
        className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Subtle glow */}
        <div
          className="absolute top-0 right-0 w-64 h-32 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at top right, rgba(232,77,28,0.06) 0%, transparent 70%)',
          }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              {tournament.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tournament.logo_url}
                  alt={tournament.name}
                  className="w-10 h-10 object-contain rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', padding: '2px' }}
                />
              )}
              <span className="badge badge-accent">Tier 1</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-1">{tournament.name}</h1>
            {tournament.start_date && tournament.end_date && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {new Date(tournament.start_date).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}{' '}
                —{' '}
                {new Date(tournament.end_date).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Accuracy pill */}
          {stats && stats.total_predictions > 0 && (
            <div
              className="shrink-0 rounded-xl px-4 py-3 text-right"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <div
                className="text-2xl font-black tabular-nums leading-none"
                style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: (stats.accuracy_pct ?? 0) >= 60 ? 'var(--correct)' : 'var(--amber)' }}
              >
                {stats.accuracy_pct}%
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {stats.correct}/{stats.total_predictions} correct
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Telegram CTA */}
      {tournament.telegram_url && (
        <a
          href={tournament.telegram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full rounded-xl py-3 mb-6 font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ background: '#1d6fa4', color: '#fff', boxShadow: '0 2px 12px rgba(29,111,164,0.3)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.167l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.392z"/>
          </svg>
          Join Live Discussion on Telegram
        </a>
      )}

      {/* Overview */}
      {tournament.overview && (
        <div
          className="rounded-xl p-5 mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="section-label mb-2">Overview</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {tournament.overview}
          </p>
        </div>
      )}

      {/* Format */}
      {tournament.format && (
        <div
          className="rounded-xl p-5 mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="section-label mb-2">Format</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {tournament.format}
          </p>
        </div>
      )}

      {/* ── Group Stage ── */}
      <GroupStageView groups={groupsData} />

      {/* ── Upcoming Schedule (PandaScore) ── */}
      {Object.keys(scheduleByGroup).length > 0 && (
        <div className="mb-6">
          <p className="section-label mb-4">{runningPS.length > 0 ? 'Live & Upcoming Matches' : 'Upcoming Matches'}</p>
          <div className="grid gap-4">
            {Object.entries(scheduleByGroup).map(([, matches], blockIdx) => {
              const t = matches[0].tournament
              const league = matches[0].league
              const dates = matches.map(m => new Date(m.scheduled_at ?? m.begin_at ?? ''))
              const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
              const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
              const dateRange = isSameDay(minDate, maxDate)
                ? format(minDate, 'MMM d')
                : `${format(minDate, 'MMM d')} – ${format(maxDate, 'MMM d')}`
              return (
                <div key={t.id} className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card) / 0.6)', border: '1px solid hsl(var(--border) / 0.6)', animationDelay: `${blockIdx * 0.07}s` }}>
                  <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                    {league.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={league.image_url} alt={league.name} className="w-5 h-5 object-contain shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'hsl(var(--primary))' }}>{league.name}</p>
                      <p className="text-sm font-bold text-foreground truncate">{t.name}</p>
                    </div>
                    <span className="text-xs shrink-0 tabular-nums text-muted-foreground">{dateRange}</span>
                  </div>
                  {(() => {
                    // Group matches by day
                    const byDay = new Map<string, typeof matches>()
                    for (const m of matches) {
                      const day = m.scheduled_at ? format(new Date(m.scheduled_at), 'MMM d') : 'TBD'
                      if (!byDay.has(day)) byDay.set(day, [])
                      byDay.get(day)!.push(m)
                    }
                    return Array.from(byDay.entries()).map(([day, dayMatches]) => (
                      <div key={day}>
                        {/* Day header */}
                        <div className="px-5 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: 'hsl(var(--secondary) / 0.35)', borderBottom: '1px solid hsl(var(--border) / 0.4)', color: 'hsl(var(--primary))' }}>
                          {day}
                        </div>
                        {dayMatches.map((m, i) => {
                          const teamA = m.opponents[0]?.opponent
                          const teamB = m.opponents[1]?.opponent
                          const time = m.scheduled_at ? format(new Date(m.scheduled_at), 'HH:mm') : '–'
                          return (
                            <div key={m.id} className="px-5 py-2.5 flex items-center gap-3 text-sm" style={{ borderBottom: i < dayMatches.length - 1 ? '1px solid hsl(var(--border) / 0.4)' : 'none', background: i % 2 !== 0 ? 'hsl(var(--secondary) / 0.2)' : 'transparent' }}>
                              <span className="w-12 text-xs shrink-0 tabular-nums text-muted-foreground">{time}</span>
                              <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {teamA?.image_url && <img loading="lazy" src={teamA.image_url} alt={teamA.name} className="w-4 h-4 object-contain shrink-0" />}
                                <span className="font-semibold truncate text-foreground">{teamA?.name ?? 'TBD'}</span>
                              </div>
                              <span className="text-xs font-black px-2 shrink-0 text-muted-foreground/40">VS</span>
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {teamB?.image_url && <img loading="lazy" src={teamB.image_url} alt={teamB.name} className="w-4 h-4 object-contain shrink-0" />}
                                <span className="font-semibold truncate text-foreground">{teamB?.name ?? 'TBD'}</span>
                              </div>
                              <span className="text-xs shrink-0 px-2 py-0.5 rounded" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))' }}>BO{m.number_of_games}</span>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <TournamentContent
        tournament={tournament}
        stages={stages}
        stats={stats}
        teamAccuracy={teamAccuracy}
      />
    </div>
  )
}
