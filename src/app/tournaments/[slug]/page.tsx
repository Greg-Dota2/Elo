import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  getTournamentBySlug,
  getPredictionsByTournament,
  getTournamentStats,
  getTeamAccuracy,
  sortMatchesByStatus,
} from '@/lib/queries'
import TournamentContent from '@/components/TournamentContent'
import type { MatchPrediction } from '@/lib/types'
import {
  fetchUpcomingTier1Matches,
  fetchRunningTier1Matches,
  fetchRecentTier1Matches,
  fetchTournamentStandings,
  fetchMatchesForSubTournament,
  type PSTeam,
} from '@/lib/pandascore'
import GroupStageView, { type GroupData } from '@/components/GroupStageView'
import PSBracketView from '@/components/PSBracketView'
import { fetchGroupsFromDB } from '@/lib/groupStageDB'
import { format, isSameDay } from 'date-fns'

export const revalidate = 300

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
      twitter: { card: t.logo_url ? 'summary_large_image' : 'summary', title, description, ...(t.logo_url ? { images: [t.logo_url] } : {}) },
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

  // Helper: build a GroupData entry from a sub-tournament ID + name + seed matches
  const buildGroupData = async (subId: number, subName: string, seedMatches: typeof psMatches): Promise<GroupData> => {
    const [standings, allMatches] = await Promise.all([
      fetchTournamentStandings(subId).catch(() => []),
      fetchMatchesForSubTournament(subId).catch(() => seedMatches),
    ])

    // Compute standings from finished matches as fallback
    const record = new Map<number, { team: PSTeam; wins: number; draws: number; losses: number }>()
    const ensure = (team: PSTeam) => {
      if (!record.has(team.id)) record.set(team.id, { team, wins: 0, draws: 0, losses: 0 })
    }
    for (const m of allMatches) {
      if (m.status !== 'finished' || m.results.length < 2) continue
      const [r1, r2] = m.results
      const t1 = m.opponents.find(o => o.opponent.id === r1.team_id)?.opponent
      const t2 = m.opponents.find(o => o.opponent.id === r2.team_id)?.opponent
      if (!t1 || !t2) continue
      ensure(t1); ensure(t2)
      if (r1.score > r2.score) { record.get(t1.id)!.wins++; record.get(t2.id)!.losses++ }
      else if (r2.score > r1.score) { record.get(t2.id)!.wins++; record.get(t1.id)!.losses++ }
      else { record.get(t1.id)!.draws++; record.get(t2.id)!.draws++ }
    }
    const computedStandings = Array.from(record.values())
      .sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws))
      .map((r, i) => ({ rank: i + 1, team: r.team, wins: r.wins, draws: r.draws, losses: r.losses, total: r.wins + r.draws + r.losses }))

    const apiHasData = standings.length > 1 && standings.some(s => s.wins > 0 || s.losses > 0)
    const derivedStandings = apiHasData ? standings
      : computedStandings.length > 1 ? computedStandings
      : (() => {
        const seen = new Map<number, PSTeam>()
        for (const m of allMatches) {
          for (const opp of m.opponents) {
            if (!seen.has(opp.opponent.id)) seen.set(opp.opponent.id, opp.opponent)
          }
        }
        return Array.from(seen.values()).map((team, i) => ({ rank: i + 1, team, wins: 0, draws: 0, losses: 0, total: 0 }))
      })()

    return { id: subId, name: subName, standings: derivedStandings, matches: allMatches }
  }

  // If this tournament has manually managed group stages in the DB, use them —
  // this lets admin-entered scores take effect immediately without waiting for PandaScore.
  const dbGroups = await fetchGroupsFromDB(tournament.slug)

  let groupsData: GroupData[]

  if (dbGroups.length > 0) {
    // DB takes priority: admin has set up stages manually
    groupsData = dbGroups
  } else if (Object.keys(scheduleByGroup).length > 0) {
    // Normal PandaScore path: running/upcoming matches tell us which sub-tournaments exist
    groupsData = await Promise.all(
      Object.entries(scheduleByGroup).map(([subId, upcomingMatches]) =>
        buildGroupData(Number(subId), upcomingMatches[0].tournament.name, upcomingMatches)
      )
    ).then(groups => groups.filter(g => g.standings.length > 1))
  } else {
    // PandaScore fallback: tournament is over — find sub-tournament IDs from recent finished matches
    const recentFinished = await fetchRecentTier1Matches(100).catch(() => [])
    const finishedPsMatches = recentFinished.filter(m => {
      const psSlug = `${m.league.name}-${m.serie.full_name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      return psSlug === tournament.slug
    })
    const finishedByGroup = finishedPsMatches.reduce<Record<string, typeof finishedPsMatches>>((acc, m) => {
      const key = String(m.tournament.id)
      if (!acc[key]) acc[key] = []
      acc[key].push(m)
      return acc
    }, {})
    groupsData = await Promise.all(
      Object.entries(finishedByGroup).map(([subId, matches]) =>
        buildGroupData(Number(subId), matches[0].tournament.name, matches)
      )
    ).then(groups => groups.filter(g => g.standings.length > 1))
  }

  const stages = groupByStage(predictions).map(s => ({ ...s, matches: sortMatchesByStatus(s.matches) }))

  // Map PandaScore match ID → DB match_date so the schedule section uses the correct date
  const psIdToDate = new Map<number, string>()
  const teamPairToDate = new Map<string, string>()
  for (const p of predictions) {
    if (p.pandascore_match_id && p.match_date) psIdToDate.set(p.pandascore_match_id, p.match_date)
    if (p.match_date && p.team_1?.name && p.team_2?.name) {
      const key = [p.team_1.name.toLowerCase(), p.team_2.name.toLowerCase()].sort().join('|')
      teamPairToDate.set(key, p.match_date)
    }
  }

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            ...(tournament.start_date ? [{
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: tournament.name,
              url: `https://dota2protips.com/tournaments/${slug}`,
              startDate: tournament.start_date,
              ...(tournament.end_date ? { endDate: tournament.end_date } : {}),
              ...(tournament.logo_url ? { image: tournament.logo_url } : {}),
              ...(tournament.overview ? { description: tournament.overview } : {}),
              location: tournament.location_type === 'lan' && tournament.location_name
                ? { '@type': 'Place', name: tournament.location_name }
                : { '@type': 'VirtualLocation', url: `https://dota2protips.com/tournaments/${slug}` },
              eventStatus: 'https://schema.org/EventScheduled',
            }] : []),
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Tournaments', item: 'https://dota2protips.com/tournaments' },
                { '@type': 'ListItem', position: 2, name: tournament.name, item: `https://dota2protips.com/tournaments/${slug}` },
              ],
            },
          ]),
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
      <GroupStageView groups={groupsData.filter(g => !/upper|lower|bracket|playoff|elimination|grand.?final/i.test(g.name) || /group/i.test(g.name))} />

      {/* ── Playoff Bracket (PandaScore) ── */}
      <PSBracketView groups={groupsData} />

      {/* ── Schedule (PandaScore) ── */}
      {groupsData.length > 0 && (() => {
        const psTeamSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

        // Merge all matches across groups, tag each with its group name, sort by time
        const allMatches = groupsData
          .flatMap(g => g.matches.map(m => ({ ...m, _groupName: g.name })))
          .sort((a, b) => {
            const ta = new Date(a.scheduled_at ?? a.begin_at ?? '').getTime()
            const tb = new Date(b.scheduled_at ?? b.begin_at ?? '').getTime()
            return ta - tb
          })

        // Helper: get Athens-timezone day key ('MMM d') from an ISO timestamp
        const athensDayLabel = (iso: string) => {
          const d = new Date(iso)
          // 'en-CA' locale gives YYYY-MM-DD; split to build a local-midnight Date for formatting
          const [y, mo, day] = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' }).split('-').map(Number)
          return format(new Date(y, mo - 1, day), 'MMM d')
        }

        // Group by day — prefer DB match_date for accuracy, fall back to PandaScore timestamp
        const byDay = new Map<string, typeof allMatches>()
        for (const m of allMatches) {
          let day: string
          const tA = m.opponents[0]?.opponent
          const tB = m.opponents[1]?.opponent
          const pairKey = tA && tB ? [tA.name.toLowerCase(), tB.name.toLowerCase()].sort().join('|') : null
          const dbDate = psIdToDate.get(m.id) ?? (pairKey ? teamPairToDate.get(pairKey) : undefined)
          if (dbDate) {
            // DB date is already a YYYY-MM-DD string in Athens local time
            const [y, mo, d] = dbDate.split('-').map(Number)
            day = format(new Date(y, mo - 1, d), 'MMM d')
          } else {
            const dateSource = (m.status === 'finished' && m.begin_at) ? m.begin_at : m.scheduled_at
            day = dateSource ? athensDayLabel(dateSource) : 'TBD'
          }
          if (!byDay.has(day)) byDay.set(day, [])
          byDay.get(day)!.push(m)
        }

        const firstMatch = allMatches[0]
        const league = firstMatch?.league

        // Today's label in Athens timezone — today's day is never collapsed
        const todayLabel = athensDayLabel(new Date().toISOString())

        // Sort a day's matches: running (live) first, then upcoming, finished at bottom
        const sortDayMatches = (matches: typeof allMatches) => {
          const p = (m: typeof allMatches[0]) => m.status === 'running' ? 0 : m.status === 'finished' ? 2 : 1
          return [...matches].sort((a, b) => {
            const diff = p(a) - p(b)
            if (diff !== 0) return diff
            return new Date(a.scheduled_at ?? '').getTime() - new Date(b.scheduled_at ?? '').getTime()
          })
        }

        // Split: past days (all finished, not today) collapse; today + days with live/upcoming stay expanded
        const activeDays: [string, typeof allMatches][] = []
        const finishedDays: [string, typeof allMatches][] = []
        for (const entry of byDay.entries()) {
          const [day, dayMatches] = entry
          const allFinished = dayMatches.every(m => m.status === 'finished')
          if (allFinished && day !== todayLabel) finishedDays.push([day, dayMatches])
          else activeDays.push([day, sortDayMatches(dayMatches)])
        }
        const totalFinished = finishedDays.reduce((n, [, ms]) => n + ms.length, 0)

        const renderDayRows = (dayMatches: typeof allMatches) =>
          dayMatches.map((m, i) => {
            const teamA = m.opponents[0]?.opponent
            const teamB = m.opponents[1]?.opponent
            const time = m.scheduled_at
              ? new Date(m.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })
              : '–'
            const scoreA = m.results.find(r => r.team_id === teamA?.id)?.score
            const scoreB = m.results.find(r => r.team_id === teamB?.id)?.score
            const isLiveMatch = m.status === 'running'
            const hasScore = (m.status === 'finished' || isLiveMatch) && scoreA !== undefined && scoreB !== undefined
            const aWon = hasScore && !isLiveMatch && scoreA! > scoreB!
            const bWon = hasScore && !isLiveMatch && scoreB! > scoreA!
            const drew = hasScore && !isLiveMatch && scoreA === scoreB
            return (
              <div key={m.id} className="px-5 py-2.5 flex items-center gap-3 text-sm" style={{ borderBottom: i < dayMatches.length - 1 ? '1px solid hsl(var(--border) / 0.4)' : 'none', background: i % 2 !== 0 ? 'hsl(var(--secondary) / 0.2)' : 'transparent' }}>
                <span className="w-12 text-xs shrink-0 tabular-nums text-muted-foreground">{time}</span>
                <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {teamA?.image_url && <img loading="lazy" src={teamA.image_url} alt={teamA.name} className="w-4 h-4 object-contain shrink-0" />}
                  {teamA ? (
                    <Link href={`/teams/${psTeamSlug(teamA.name)}`} className="font-semibold truncate hover:text-primary transition-colors text-foreground">{teamA.name}</Link>
                  ) : <span className="font-semibold truncate text-foreground">TBD</span>}
                </div>
                {hasScore ? (
                  <div className="flex flex-col items-center shrink-0 px-2">
                    <span className="text-sm font-black tabular-nums">
                      <span style={{ color: isLiveMatch ? 'hsl(var(--destructive))' : drew ? '#f59e0b' : aWon ? 'var(--correct)' : 'var(--wrong)' }}>{scoreA}</span>
                      <span className="text-muted-foreground/40">:</span>
                      <span style={{ color: isLiveMatch ? 'hsl(var(--destructive))' : drew ? '#f59e0b' : bWon ? 'var(--correct)' : 'var(--wrong)' }}>{scoreB}</span>
                    </span>
                    {isLiveMatch && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none" style={{ background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' }}>LIVE</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-black px-2 shrink-0 text-muted-foreground/40">VS</span>
                )}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {teamB?.image_url && <img loading="lazy" src={teamB.image_url} alt={teamB.name} className="w-4 h-4 object-contain shrink-0" />}
                  {teamB ? (
                    <Link href={`/teams/${psTeamSlug(teamB.name)}`} className="font-semibold truncate hover:text-primary transition-colors text-foreground">{teamB.name}</Link>
                  ) : <span className="font-semibold truncate text-foreground">TBD</span>}
                </div>
                <span className="text-[10px] shrink-0 tabular-nums text-muted-foreground/50">{m._groupName}</span>
                <span className="text-xs shrink-0 px-2 py-0.5 rounded" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))' }}>BO{m.number_of_games}</span>
              </div>
            )
          })

        return (
          <div className="mb-6">
            <p className="section-label mb-4">Schedule & Results</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card) / 0.6)', border: '1px solid hsl(var(--border) / 0.6)' }}>
              {league && (
                <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                  {league.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" src={league.image_url} alt={league.name} className="w-5 h-5 object-contain shrink-0" />
                  )}
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'hsl(var(--primary))' }}>{league.name}</p>
                </div>
              )}

              {/* Active days (upcoming / live) */}
              {activeDays.map(([day, dayMatches]) => (
                <div key={day}>
                  <div className="px-5 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: 'hsl(var(--secondary) / 0.35)', borderBottom: '1px solid hsl(var(--border) / 0.4)', color: 'hsl(var(--primary))' }}>
                    {day}
                  </div>
                  {renderDayRows(dayMatches)}
                </div>
              ))}

              {/* Finished days — collapsible */}
              {finishedDays.length > 0 && (
                <details className="group">
                  <summary
                    className="flex items-center justify-between gap-3 px-5 py-3 cursor-pointer select-none"
                    style={{ background: 'hsl(var(--secondary) / 0.2)', borderTop: activeDays.length > 0 ? '1px solid hsl(var(--border) / 0.5)' : 'none' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black tabular-nums shrink-0"
                        style={{ background: 'hsl(var(--muted))', color: 'var(--text-muted)' }}
                      >
                        {totalFinished}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        Completed matches ({finishedDays.map(([d]) => d).join(', ')})
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full group-open:opacity-0 transition-opacity" style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
                      Show ▾
                    </span>
                  </summary>
                  {finishedDays.map(([day, dayMatches]) => (
                    <div key={day}>
                      <div className="px-5 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: 'hsl(var(--secondary) / 0.35)', borderTop: '1px solid hsl(var(--border) / 0.4)', borderBottom: '1px solid hsl(var(--border) / 0.4)', color: 'hsl(var(--muted-foreground))' }}>
                        {day}
                      </div>
                      {renderDayRows(dayMatches)}
                    </div>
                  ))}
                </details>
              )}
            </div>
          </div>
        )
      })()}

      <TournamentContent
        tournament={tournament}
        stages={stages}
        stats={stats}
        teamAccuracy={teamAccuracy}
      />
    </div>
  )
}
