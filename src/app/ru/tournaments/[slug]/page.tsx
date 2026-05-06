import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPredictionsByTournament,
  getTournamentBySlug,
  getTournamentStats,
  getTeamAccuracy,
  getH2HForTeams,
  buildH2HMap,
  sortMatchesByStatus,
} from '@/lib/queries'
import TournamentContent from '@/components/TournamentContent'
import { renderWithLinks } from '@/lib/renderLinks'
import PrizeTable from '@/components/PrizeTable'
import ParticipantsGrid, { type ParticipantWithRoster } from '@/components/ParticipantsGrid'
import GroupStageView, { type GroupData } from '@/components/GroupStageView'
import PSBracketView from '@/components/PSBracketView'
import type { MatchPrediction } from '@/lib/types'

export const revalidate = 300

function groupByStage(
  predictions: MatchPrediction[]
): { stageName: string; stageDate: string | null; stageOrder: number; matches: MatchPrediction[] }[] {
  const map = new Map<string, { stageName: string; stageDate: string | null; stageOrder: number; matches: MatchPrediction[] }>()
  for (const p of predictions) {
    const key = p.stage?.id ?? 'ungrouped'
    if (!map.has(key)) {
      map.set(key, { stageName: p.stage?.name ?? 'Матчи', stageDate: p.stage?.stage_date ?? null, stageOrder: p.stage?.stage_order ?? 0, matches: [] })
    }
    map.get(key)!.matches.push(p)
  }
  return Array.from(map.values()).sort((a, b) => b.stageOrder - a.stageOrder)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const SITE_URL = 'https://www.dota2protips.com'
  try {
    const supabase = createAdminClient()
    const { data: t } = await supabase
      .from('tournaments')
      .select('name, meta_description_ru, overview_ru, overview, logo_url, prize_pool_usd, participants, start_date, end_date, location_type, location_name')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()
    if (!t) return { title: 'Турнир не найден' }
    const title = `${t.name} — Прогнозы, Расписание и Команды`
    let description = t.meta_description_ru || ''
    if (!description) {
      const parts: string[] = []
      if (t.prize_pool_usd) parts.push(`Призовой фонд $${t.prize_pool_usd.toLocaleString('ru-RU')}`)
      if (t.participants?.length) parts.push(`${t.participants.length} команд`)
      if (t.location_type === 'lan' && t.location_name) parts.push(`LAN — ${t.location_name}`)
      else if (t.location_type === 'online') parts.push('онлайн-турнир')
      if (t.start_date && t.end_date) {
        const fmt = (d: string) => new Date(d).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
        parts.push(`${fmt(t.start_date)} – ${fmt(t.end_date)}`)
      }
      description = parts.length
        ? `${t.name}: ${parts.join(', ')}. Прогнозы на каждый матч, аналитика и статистика точности на Dota2ProTips.`
        : (t.overview_ru?.slice(0, 155) || t.overview?.slice(0, 155) || `Прогнозы на матчи и аналитика турнира ${t.name} на Dota2ProTips.`)
    }
    return {
      title,
      description,
      openGraph: { title, description, url: `/ru/tournaments/${slug}`, ...(t.logo_url ? { images: [{ url: t.logo_url, alt: t.name }] } : {}) },
      twitter: { card: t.logo_url ? 'summary_large_image' : 'summary', title, description },
      alternates: {
        canonical: `${SITE_URL}/ru/tournaments/${slug}`,
        languages: {
          'en': `${SITE_URL}/tournaments/${slug}`,
          'ru': `${SITE_URL}/ru/tournaments/${slug}`,
          'x-default': `${SITE_URL}/tournaments/${slug}`,
        },
      },
    }
  } catch {
    return { title: 'Турнир не найден' }
  }
}

export default async function RuTournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (slug !== slug.toLowerCase()) redirect(`/ru/tournaments/${slug.toLowerCase()}`)

  let tournament
  try {
    tournament = await getTournamentBySlug(slug)
  } catch {
    notFound()
  }

  const [predictions, stats, teamAccuracy] = await Promise.all([
    getPredictionsByTournament(tournament.id).catch(() => []),
    getTournamentStats(tournament.id).catch(() => null),
    getTeamAccuracy(tournament.id, 3).catch(() => []),
  ])

  // Swap in Russian analysis text where available, fall back to English
  const ruPredictions: MatchPrediction[] = predictions.map(p => ({
    ...p,
    pre_analysis: p.pre_analysis_ru ?? p.pre_analysis,
    post_commentary: p.post_commentary_ru ?? p.post_commentary,
  }))

  const allTeamIds = [...new Set(predictions.flatMap(p => [p.team_1_id, p.team_2_id]))]
  const h2hMatches = await getH2HForTeams(allTeamIds).catch(() => [])
  const h2hMap = buildH2HMap(predictions, h2hMatches)

  const stages = groupByStage(ruPredictions).map(s => ({ ...s, matches: sortMatchesByStatus(s.matches) }))

  const teamNameMap = new Map<string, { slug: string | null; logo_url: string | null }>()
  for (const p of predictions) {
    if (p.team_1) teamNameMap.set(p.team_1.name, { slug: p.team_1.slug, logo_url: p.team_1.logo_url })
    if (p.team_2) teamNameMap.set(p.team_2.name, { slug: p.team_2.slug, logo_url: p.team_2.logo_url })
  }

  const overview = (tournament as any).overview_ru ?? tournament.overview
  const format = (tournament as any).format_ru ?? tournament.format
  const SITE_URL = 'https://www.dota2protips.com'

  // Build participants with rosters (Supabase only)
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
        players: players.map(pl => ({ ign: pl.ign, slug: pl.slug, photo_url: pl.photo_url, position: pl.position })),
      }
    })
  }

  return (
    <div className="fade-in-up">

      {/* Language switcher */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Link href="/ru/tournaments" className="hover:text-white transition-colors">Турниры</Link>
          <span>/</span>
          <span>{tournament.name}</span>
        </div>
        <Link
          href={`/tournaments/${slug}`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-90"
          style={{ background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))' }}
        >
          <span>🇬🇧</span>
          <span>English</span>
        </Link>
      </div>

      {/* Tournament header */}
      <div
        className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-32 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(232,77,28,0.06) 0%, transparent 70%)' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              {tournament.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tournament.logo_url} alt={tournament.name} className="w-10 h-10 object-contain rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', padding: '2px' }} />
              )}
              <span className="badge badge-accent">Tier 1</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-1">{tournament.name}</h1>
            {tournament.start_date && tournament.end_date && (
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                {new Date(tournament.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' — '}
                {new Date(tournament.end_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
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
          {stats && stats.total_predictions > 0 && (
            <div className="shrink-0 rounded-xl px-4 py-3 text-right"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="text-2xl font-black tabular-nums leading-none"
                style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: (stats.accuracy_pct ?? 0) >= 60 ? 'var(--correct)' : 'var(--amber)' }}>
                {stats.accuracy_pct}%
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {stats.correct}/{stats.total_predictions} верных
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overview */}
      {overview && (
        <div className="rounded-xl p-5 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="section-label mb-2">Обзор</h2>
          <div className="space-y-2">
            {overview.split('\n\n').map((para: string, i: number) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{renderWithLinks(para)}</p>
            ))}
          </div>
        </div>
      )}

      {/* Format */}
      {format && (
        <div className="rounded-xl p-5 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="section-label mb-2">Формат</h2>
          <div className="space-y-2">
            {format.split('\n\n').map((para: string, i: number) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{renderWithLinks(para)}</p>
            ))}
          </div>
        </div>
      )}

      {/* Participants */}
      {participantsWithRosters.length > 0 && (
        <ParticipantsGrid participants={participantsWithRosters} />
      )}

      {/* Prize table */}
      {tournament.prize_distribution && tournament.prize_distribution.length > 0 && (
        <PrizeTable placements={tournament.prize_distribution} teamMap={teamNameMap} />
      )}

      {/* Archived group stage + bracket (Supabase only, no API calls) */}
      {tournament.group_stage_data && (() => {
        const archivedGroups = tournament.group_stage_data as GroupData[]
        const groupOnly = archivedGroups.filter(g =>
          !/upper|lower|bracket|playoff|elimination|grand.?final/i.test(g.name) || /group/i.test(g.name)
        )
        return (
          <>
            <GroupStageView groups={groupOnly} />
            <PSBracketView groups={archivedGroups} />
          </>
        )
      })()}

      {/* Match predictions with Russian analysis */}
      <TournamentContent
        tournament={tournament}
        stages={stages}
        stats={stats}
        teamAccuracy={teamAccuracy}
        h2hMap={h2hMap}
        liveScoreMap={new Map()}
        bracketExtra={null}
        locale="ru"
      />

      {/* Live data CTA */}
      <div className="mt-8 rounded-xl p-5 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-2">Расписание, группы и сетка плей-офф</p>
        <Link
          href={`/tournaments/${slug}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-opacity hover:opacity-80"
          style={{ background: 'hsl(var(--primary))', color: '#000' }}
        >
          🇬🇧 Открыть английскую версию →
        </Link>
      </div>
    </div>
  )
}
