import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  getTournamentBySlug,
  getPredictionsByTournament,
  getTournamentStats,
  getTeamAccuracy,
  getH2HForTeams,
  buildH2HMap,
  sortMatchesByStatus,
} from '@/lib/queries'
import TournamentContent from '@/components/TournamentContent'
import type { MatchPrediction } from '@/lib/types'
import { type GroupData } from '@/components/GroupStageView'
import PrizeTable from '@/components/PrizeTable'
import ParticipantsGrid, { type ParticipantWithRoster } from '@/components/ParticipantsGrid'
import { createAdminClient } from '@/lib/supabase/admin'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'
import { renderWithLinks } from '@/lib/renderLinks'
import LiveGroupStage from '@/components/LiveGroupStage'
import LiveSchedule from '@/components/LiveSchedule'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const t = await getTournamentBySlug(slug)
    const title = `${t.name} — Predictions, Schedule & Teams`
    let description = t.meta_description || ''
    if (!description) {
      const parts: string[] = []
      if (t.prize_pool_usd) parts.push(`$${t.prize_pool_usd.toLocaleString('en-US')} prize pool`)
      if (t.participants?.length) parts.push(`${t.participants.length} teams`)
      if (t.location_type === 'lan' && t.location_name) parts.push(`LAN — ${t.location_name}`)
      else if (t.location_type === 'online') parts.push('online tournament')
      if (t.start_date && t.end_date) {
        const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
        parts.push(`${fmt(t.start_date)} – ${fmt(t.end_date)}`)
      }
      description = parts.length
        ? `${t.name}: ${parts.join(', ')}. Match-by-match predictions, analysis, and accuracy tracking on Dota2ProTips.`
        : (t.overview?.slice(0, 155) || `Match predictions, analysis, and accuracy tracking for ${t.name} on Dota2ProTips.`)
    }
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
      alternates: {
        canonical: `https://www.dota2protips.com/tournaments/${slug}`,
        languages: {
          'en': `https://www.dota2protips.com/tournaments/${slug}`,
          'ru': `https://www.dota2protips.com/ru/tournaments/${slug}`,
          'x-default': `https://www.dota2protips.com/tournaments/${slug}`,
        },
      },
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
  if (slug !== slug.toLowerCase()) redirect(`/tournaments/${slug.toLowerCase()}`)

  let tournament
  try {
    tournament = await getTournamentBySlug(slug)
  } catch {
    notFound()
  }

  // Look up PandaScore sub-tournament IDs for this tournament (if configured)
  const tier1Entry = TIER1_TOURNAMENTS.find(t => t.slug === tournament.slug) as
    | (typeof TIER1_TOURNAMENTS[0] & { ps_group_stage_id?: number; ps_playoff_id?: number })
    | undefined

  const isOver = tournament.end_date ? new Date(tournament.end_date + 'T23:59:59Z') < new Date() : false

  const [predictions, stats, teamAccuracy] = await Promise.all([
    getPredictionsByTournament(tournament.id).catch(() => []),
    getTournamentStats(tournament.id).catch(() => null),
    getTeamAccuracy(tournament.id, 3).catch(() => []),
  ])

  const archivedGroups = tournament.group_stage_data
    ? (tournament.group_stage_data as GroupData[])
    : null

  const allTeamIds = [...new Set(predictions.flatMap(p => [p.team_1_id, p.team_2_id]))]
  const h2hMatches = await getH2HForTeams(allTeamIds).catch(() => [])
  const h2hMap = buildH2HMap(predictions, h2hMatches)

  const stages = groupByStage(predictions).map(s => ({ ...s, matches: sortMatchesByStatus(s.matches) }))

  // Build name → {slug, logo_url} map for PrizeTable team lookups
  const teamNameMap = new Map<string, { slug: string | null; logo_url: string | null }>()
  for (const p of predictions) {
    if (p.team_1) teamNameMap.set(p.team_1.name, { slug: p.team_1.slug, logo_url: p.team_1.logo_url })
    if (p.team_2) teamNameMap.set(p.team_2.name, { slug: p.team_2.slug, logo_url: p.team_2.logo_url })
  }

  // Build enriched participants list with team info + rosters
  let participantsWithRosters: ParticipantWithRoster[] = []
  if (tournament.participants && tournament.participants.length > 0) {
    const supabase = createAdminClient()
    const participantNames = tournament.participants.map((p: { team: string }) => p.team)
    const { data: teamRows } = await supabase
      .from('teams')
      .select('id, name, slug, logo_url')
      .in('name', participantNames)
    const teamDbMap = new Map((teamRows ?? []).map(t => [t.name, t]))

    const teamIds = (teamRows ?? []).map(t => t.id)
    const { data: playerRows } = teamIds.length > 0
      ? await supabase
          .from('players')
          .select('ign, slug, photo_url, position, team_id')
          .in('team_id', teamIds)
          .eq('is_published', true)
          .order('position', { ascending: true, nullsFirst: false })
      : { data: [] }

    const playersByTeam = new Map<string, typeof playerRows>()
    for (const player of playerRows ?? []) {
      const list = playersByTeam.get(player.team_id!) ?? []
      list.push(player)
      playersByTeam.set(player.team_id!, list)
    }

    participantsWithRosters = tournament.participants.map((p: { team: string; type?: 'invited' | 'qualifier' }) => {
      const dbTeam = teamDbMap.get(p.team)
      const players = dbTeam ? (playersByTeam.get(dbTeam.id) ?? []) : []
      return {
        team: p.team,
        type: p.type,
        slug: dbTeam?.slug ?? null,
        logo_url: dbTeam?.logo_url ?? teamNameMap.get(p.team)?.logo_url ?? null,
        players: players.map(pl => ({
          ign: pl.ign,
          slug: pl.slug,
          photo_url: pl.photo_url,
          position: pl.position,
        })),
      }
    })
  }

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              '@id': `https://www.dota2protips.com/tournaments/${slug}`,
              url: `https://www.dota2protips.com/tournaments/${slug}`,
              name: `${tournament.name} — Predictions, Schedule & Teams`,
              author: { '@type': 'Person', '@id': 'https://www.dota2protips.com/about', name: 'Greg Spencer' },
              isPartOf: { '@id': 'https://www.dota2protips.com/#website' },
            },
            ...(tournament.start_date ? [{
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: tournament.name,
              url: `https://www.dota2protips.com/tournaments/${slug}`,
              startDate: tournament.start_date,
              ...(tournament.end_date ? { endDate: tournament.end_date } : {}),
              ...(tournament.logo_url ? { image: tournament.logo_url } : {}),
              ...(tournament.overview ? { description: tournament.overview } : {}),
              eventStatus: 'https://schema.org/EventScheduled',
              ...(tournament.location_type === 'lan' && tournament.location_name
                ? {
                    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                    location: { '@type': 'Place', name: tournament.location_name, address: tournament.location_name },
                  }
                : {
                    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
                    location: { '@type': 'VirtualLocation', url: `https://www.dota2protips.com/tournaments/${slug}` },
                  }),
            }] : []),
            ...predictions
              .filter(p => p.is_published && p.team_1 && p.team_2)
              .map(p => {
                const startDate = p.match_date
                  ? (p.match_time ? `${p.match_date}T${p.match_time}` : p.match_date)
                  : undefined
                const isFinished = p.score_team_1 !== null && p.score_team_2 !== null
                const descParts = [
                  `Best of ${p.best_of}`,
                  p.predicted_winner ? `Predicted winner: ${p.predicted_winner.name}` : null,
                  isFinished ? `Result: ${p.team_1!.name} ${p.score_team_1}–${p.score_team_2} ${p.team_2!.name}` : null,
                  p.pre_analysis ? p.pre_analysis.slice(0, 150) : null,
                ].filter(Boolean).join('. ')
                const eventLocation = tournament.location_type === 'lan' && tournament.location_name
                  ? { '@type': 'Place', name: tournament.location_name, address: tournament.location_name }
                  : { '@type': 'VirtualLocation', url: `https://www.dota2protips.com/tournaments/${slug}` }
                return {
                  '@context': 'https://schema.org',
                  '@type': 'SportsEvent',
                  name: `${p.team_1!.name} vs ${p.team_2!.name}`,
                  sport: 'Dota 2',
                  eventStatus: 'https://schema.org/EventScheduled',
                  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
                  ...(startDate ? { startDate } : {}),
                  ...(tournament.logo_url ? { image: tournament.logo_url } : {}),
                  homeTeam: {
                    '@type': 'SportsTeam',
                    name: p.team_1!.name,
                    ...(p.team_1!.logo_url ? { image: p.team_1!.logo_url } : {}),
                  },
                  awayTeam: {
                    '@type': 'SportsTeam',
                    name: p.team_2!.name,
                    ...(p.team_2!.logo_url ? { image: p.team_2!.logo_url } : {}),
                  },
                  location: eventLocation,
                  url: `https://www.dota2protips.com/tournaments/${slug}`,
                  description: descParts,
                  organizer: { '@type': 'Organization', name: tournament.name, url: `https://www.dota2protips.com/tournaments/${slug}` },
                  performer: [
                    { '@type': 'SportsTeam', name: p.team_1!.name, ...(p.team_1!.logo_url ? { image: p.team_1!.logo_url } : {}) },
                    { '@type': 'SportsTeam', name: p.team_2!.name, ...(p.team_2!.logo_url ? { image: p.team_2!.logo_url } : {}) },
                  ],
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                    availability: 'https://schema.org/InStock',
                    url: `https://www.dota2protips.com/tournaments/${slug}`,
                  },
                }
              }),
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Tournaments', item: 'https://www.dota2protips.com/tournaments' },
                { '@type': 'ListItem', position: 2, name: tournament.name, item: `https://www.dota2protips.com/tournaments/${slug}` },
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
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                {new Date(tournament.start_date).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}{' '}
                —{' '}
                {new Date(tournament.end_date).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            )}
            {tournament.liquipedia_url && (
              <a
                href={tournament.liquipedia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-opacity hover:opacity-80"
                style={{ background: 'hsl(45 100% 50% / 0.08)', border: '1px solid hsl(45 100% 50% / 0.25)', color: 'hsl(45 100% 60%)' }}
              >
                Liquipedia ↗
              </a>
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
          <h2 className="section-label mb-2">Overview</h2>
          <div className="space-y-2">
            {tournament.overview.split('\n\n').map((para: string, i: number) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{renderWithLinks(para)}</p>
            ))}
          </div>
        </div>
      )}

      {/* Format */}
      {tournament.format && (
        <div
          className="rounded-xl p-5 mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="section-label mb-2">Format</h2>
          <div className="space-y-2">
            {tournament.format.split('\n\n').map((para: string, i: number) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{renderWithLinks(para)}</p>
            ))}
          </div>
        </div>
      )}

      {/* Participants */}
      {participantsWithRosters.length > 0 && (
        <ParticipantsGrid participants={participantsWithRosters} />
      )}

      {/* Final Standings / Prize Distribution */}
      {tournament.prize_distribution && tournament.prize_distribution.length > 0 && (
        <>
          {participantsWithRosters.length > 0 && (
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Final Standings</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>
          )}
          <PrizeTable placements={tournament.prize_distribution} teamMap={teamNameMap} />
        </>
      )}

      <Suspense fallback={null}>
        <LiveSchedule
          slug={slug}
          tier1Entry={tier1Entry}
          isOver={isOver}
          archivedGroups={archivedGroups}
          predictions={predictions}
        />
      </Suspense>

      <TournamentContent
        tournament={tournament}
        stages={stages}
        stats={stats}
        teamAccuracy={teamAccuracy}
        h2hMap={h2hMap}
        bracketExtra={
          <Suspense fallback={
            <div className="rounded-2xl animate-pulse mb-6" style={{ background: 'hsl(var(--card) / 0.4)', border: '1px solid hsl(var(--border) / 0.4)', height: '180px' }} />
          }>
            <LiveGroupStage
              slug={slug}
              tier1Entry={tier1Entry}
              isOver={isOver}
              archivedGroups={archivedGroups}
            />
          </Suspense>
        }
      />
    </div>
  )
}
