import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTeamBySlug } from '@/lib/queries'
import { createAdminClient } from '@/lib/supabase/admin'
import BioRenderer from '@/components/BioRenderer'
import type { Team } from '@/lib/types'
import { fetchUpcomingTier1Matches, fetchRunningTier1Matches, fetchRecentTier1Matches, type PSMatch } from '@/lib/pandascore'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'

export const revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const team = await getTeamBySlug(slug) as Team
    const title = `${team.name} — Команда Dota 2: Состав и результаты`
    const description = `Состав ${team.name}, рейтинг ELO, последние результаты и полная история матчей. Все серии Tier 1 Dota 2 на Dota2ProTips.`
    return {
      title,
      description,
      openGraph: { title, description, url: `/ru/teams/${slug}`, ...(team.logo_url ? { images: [{ url: team.logo_url, alt: team.name }] } : {}) },
      twitter: { card: team.logo_url ? 'summary_large_image' : 'summary', title, description, ...(team.logo_url ? { images: [team.logo_url] } : {}) },
      alternates: { canonical: `/ru/teams/${slug}`, languages: { 'x-default': `/teams/${slug}`, 'en': `/teams/${slug}`, 'ru': `/ru/teams/${slug}` } },
    }
  } catch {
    return { title: 'Команда не найдена' }
  }
}

const REGION_FLAG: Record<string, string> = {
  'Western Europe': '🇪🇺',
  'Eastern Europe': '🌍',
  'China': '🇨🇳',
  'Southeast Asia': '🌏',
  'North America': '🇺🇸',
  'South America': '🌎',
  'CIS': '🌍',
}

const REGION_RU: Record<string, string> = {
  'Western Europe': 'Западная Европа',
  'Eastern Europe': 'Восточная Европа',
  'China': 'Китай',
  'Southeast Asia': 'Юго-Восточная Азия',
  'North America': 'Северная Америка',
  'South America': 'Южная Америка',
  'CIS': 'СНГ',
}

export default async function RuTeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (slug !== slug.toLowerCase()) redirect(`/ru/teams/${slug.toLowerCase()}`)

  let team: Team
  try {
    team = await getTeamBySlug(slug) as Team
  } catch {
    notFound()
  }

  const [psUpcoming, psRunning, psRecent] = await Promise.all([
    fetchUpcomingTier1Matches(100).catch(() => [] as PSMatch[]),
    fetchRunningTier1Matches(50).catch(() => [] as PSMatch[]),
    fetchRecentTier1Matches(100).catch(() => [] as PSMatch[]),
  ])

  const teamNameLower = team.name.toLowerCase()
  const matchesTeam = (m: PSMatch) =>
    m.opponents.some(o => {
      const ps = o.opponent.name.toLowerCase()
      return ps === teamNameLower || ps.startsWith(teamNameLower + ' ') || teamNameLower.startsWith(ps + ' ')
    })

  const psUpcomingTeam = [...psRunning, ...psUpcoming].filter(matchesTeam)
  const psRecentTeam = psRecent.filter(matchesTeam)
  void psRecentTeam

  const supabase = createAdminClient()
  const { data: psTeamRows } = await supabase
    .from('teams')
    .select('pandascore_team_id, slug')
    .not('pandascore_team_id', 'is', null)
    .not('slug', 'is', null)
  const psTeamSlugMap = new Map<number, string>(
    (psTeamRows ?? []).map(t => [t.pandascore_team_id as number, t.slug as string])
  )
  const resolveTeamLink = (psId: number | undefined, psName: string) =>
    (psId && psTeamSlugMap.get(psId)) ?? psName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const { data: players } = await supabase
    .from('players')
    .select('id, slug, ign, full_name, photo_url, position')
    .eq('team_id', team.id)
    .eq('is_published', true)
    .order('position', { ascending: true, nullsFirst: false })

  const { data: matchRows } = await supabase
    .from('match_predictions')
    .select('team_1_id, team_2_id, score_team_1, score_team_2')
    .eq('is_published', true)
    .not('score_team_1', 'is', null)
    .not('score_team_2', 'is', null)
    .or(`team_1_id.eq.${team.id},team_2_id.eq.${team.id}`)

  let wins = 0, losses = 0, draws = 0
  for (const row of matchRows ?? []) {
    const teamIsTeam1 = row.team_1_id === team.id
    const teamScore = teamIsTeam1 ? row.score_team_1! : row.score_team_2!
    const oppScore = teamIsTeam1 ? row.score_team_2! : row.score_team_1!
    if (teamScore > oppScore) wins++
    else if (teamScore < oppScore) losses++
    else draws++
  }
  const total = wins + draws + losses
  const winRate = total > 0 ? Math.round(((wins + draws * 0.5) / total) * 100) : null

  const { data: tournamentsWithPrize } = await supabase
    .from('tournaments')
    .select('id, name, slug, logo_url, prize_distribution, end_date')
    .eq('is_published', true)
    .not('prize_distribution', 'is', null)
    .order('end_date', { ascending: false })

  type TournamentPlacement = {
    tournament: { name: string; slug: string; logo_url: string | null }
    place: string
    prize_usd?: number
    ept_points?: number
    club_reward?: number
  }

  const tournamentPlacements: TournamentPlacement[] = []
  for (const t of tournamentsWithPrize ?? []) {
    const dist = t.prize_distribution as { place: string; team: string; prize_usd?: number; ept_points?: number; club_reward?: number }[]
    const entry = dist?.find(p => p.team === team.name)
    if (entry) {
      tournamentPlacements.push({
        tournament: { name: t.name, slug: t.slug, logo_url: t.logo_url },
        place: entry.place,
        prize_usd: entry.prize_usd,
        ept_points: entry.ept_points,
        club_reward: entry.club_reward,
      })
    }
  }

  const { data: teamMatches } = await supabase
    .from('match_predictions')
    .select(`
      id, match_date, best_of, score_team_1, score_team_2, is_correct, predicted_draw,
      team_1_id, team_2_id, actual_winner_id,
      team_1:teams!match_predictions_team_1_id_fkey(id, name, logo_url, slug),
      team_2:teams!match_predictions_team_2_id_fkey(id, name, logo_url, slug),
      tournament:tournaments(name, slug)
    `)
    .eq('is_published', true)
    .or(`team_1_id.eq.${team.id},team_2_id.eq.${team.id}`)
    .order('match_date', { ascending: false })

  type TeamMatchRow = {
    id: string; match_date: string | null; best_of: number
    score_team_1: number | null; score_team_2: number | null
    is_correct: boolean | null; predicted_draw: boolean
    team_1_id: string; team_2_id: string; actual_winner_id: string | null
    team_1: { id: string; name: string; logo_url: string | null; slug: string | null } | null
    team_2: { id: string; name: string; logo_url: string | null; slug: string | null } | null
    tournament: { name: string; slug: string } | null
  }

  const allMatches = (teamMatches ?? []) as unknown as TeamMatchRow[]
  const upcomingMatches = allMatches.filter(m => m.score_team_1 === null).reverse()
  const completedMatches = allMatches.filter(m => m.score_team_1 !== null)
  void upcomingMatches

  const posLabel: Record<number, string> = {
    1: 'Керри', 2: 'Мид', 3: 'Офлейн', 4: 'Саппорт', 5: 'Хард саппорт',
  }
  const posColor: Record<number, string> = {
    1: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/25',
    2: 'text-sky-400 bg-sky-400/10 border border-sky-400/25',
    3: 'text-orange-400 bg-orange-400/10 border border-orange-400/25',
    4: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/25',
    5: 'text-violet-400 bg-violet-400/10 border border-violet-400/25',
  }

  const SITE_URL = 'https://www.dota2protips.com'

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'SportsTeam',
              name: team.name,
              url: `${SITE_URL}/ru/teams/${slug}`,
              ...(team.logo_url ? { logo: team.logo_url, image: team.logo_url } : {}),
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Команды', item: `${SITE_URL}/ru/teams` },
                { '@type': 'ListItem', position: 2, name: team.name, item: `${SITE_URL}/ru/teams/${slug}` },
              ],
            },
          ]),
        }}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
        <Link href="/ru/teams" className="hover:text-foreground transition-colors">Команды</Link>
        <span className="text-muted-foreground/40">/</span>
        <span>{team.name}</span>
      </div>

      {/* Banner */}
      {team.banner_url && (
        <div className="rounded-2xl overflow-hidden mb-6 border border-border/60" style={{ maxHeight: 260 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" src={team.banner_url} alt={`${team.name} banner`} className="w-full h-full object-cover" style={{ maxHeight: 260 }} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-20 h-20 rounded-2xl border border-border/60 bg-secondary/80 flex items-center justify-center shrink-0 overflow-hidden p-2">
          {team.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
          ) : (
            <span className="font-display text-2xl font-bold text-muted-foreground">
              {team.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-bold text-foreground leading-tight">{team.name}</h1>
          {team.short_name && team.short_name !== team.name && (
            <p className="text-muted-foreground text-sm mt-0.5">{team.short_name}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
            {team.region && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>{REGION_FLAG[team.region] ?? '🌐'}</span>
                <span>{REGION_RU[team.region] ?? team.region}</span>
              </span>
            )}
            {team.founded_year && (
              <span className="text-sm text-muted-foreground">Осн. {team.founded_year}</span>
            )}
            {total > 0 && (
              <span className="text-sm text-muted-foreground">
                <span className="text-success font-semibold">{wins}П</span>
                {' · '}
                {draws > 0 && <><span className="font-semibold" style={{ color: '#f59e0b' }}>{draws}Н</span>{' · '}</>}
                <span className="text-destructive font-semibold">{losses}П</span>
                {winRate !== null && ` · ${winRate}%`}
              </span>
            )}
            <span className="font-display font-bold text-sm">
              ELO {team.current_elo}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {team.liquipedia_url && (
            <a href={team.liquipedia_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
              Liquipedia ↗
            </a>
          )}
          {team.website_url && (
            <a href={team.website_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
              Сайт ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="grid gap-6">
          {/* Bio */}
          {(team.bio_ru ?? team.bio) && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">О команде</p>
              <BioRenderer text={(team.bio_ru ?? team.bio)!} />
            </div>
          )}

          {/* Achievements */}
          {(team.achievements_ru ?? team.achievements) && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">Достижения</p>
              <BioRenderer text={(team.achievements_ru ?? team.achievements)!} />
            </div>
          )}

          {/* Tournament Results */}
          {tournamentPlacements.length > 0 && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">Результаты турниров</p>
              <div className="grid gap-2">
                {tournamentPlacements.map(p => {
                  const medal = p.place === '1st' ? '🥇' : p.place === '2nd' ? '🥈' : p.place === '3rd' || p.place === '3rd-4th' ? '🥉' : null
                  const placeColor =
                    p.place === '1st' ? '#f59e0b'
                    : p.place === '2nd' ? '#94a3b8'
                    : p.place === '3rd' || p.place === '3rd-4th' ? '#c47a3a'
                    : 'var(--text-muted)'
                  const formatUSD = (n: number) => {
                    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
                    if (n >= 1_000) return `$${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
                    return `$${n.toLocaleString()}`
                  }
                  return (
                    <div key={p.tournament.slug} className="flex items-center gap-3 py-2.5 border-t border-border/40 first:border-0">
                      {p.tournament.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.tournament.logo_url} alt={p.tournament.name} className="w-7 h-7 object-contain shrink-0 rounded p-0.5" style={{ background: 'rgba(255,255,255,0.08)' }} loading="lazy" />
                      ) : (
                        <div className="w-7 h-7 rounded shrink-0" style={{ background: 'hsl(var(--secondary))' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <Link href={`/ru/tournaments/${p.tournament.slug}`} className="text-sm font-semibold hover:text-primary transition-colors truncate block" style={{ color: 'var(--text)' }}>
                          {p.tournament.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.ept_points != null && (
                            <span className="text-xs tabular-nums" style={{ color: 'hsl(var(--primary))' }}>
                              {p.ept_points.toLocaleString()} EPT
                            </span>
                          )}
                          {p.club_reward != null && (
                            <span className="text-xs tabular-nums" style={{ color: '#a78bfa' }}>
                              +{formatUSD(p.club_reward)} клуб
                            </span>
                          )}
                        </div>
                      </div>
                      {p.prize_usd != null && (
                        <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: '#4ade80' }}>
                          {formatUSD(p.prize_usd)}
                        </span>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        {medal && <span className="text-base leading-none">{medal}</span>}
                        <span className="text-xs font-black tabular-nums" style={{ color: placeColor }}>
                          {p.place}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upcoming / live matches from PandaScore */}
          {psUpcomingTeam.length > 0 && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">Предстоящие матчи</p>
              <div className="grid gap-2">
                {psUpcomingTeam.map(m => {
                  const tA = m.opponents[0]?.opponent
                  const tB = m.opponents[1]?.opponent
                  const isLive = m.status === 'running'
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-t border-border/40 first:border-0">
                      {isLive && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' }}>LIVE</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-foreground">
                          {tA?.image_url && <img loading="lazy" src={tA.image_url} alt={tA.name} className="w-5 h-5 object-contain shrink-0" />}
                          <Link href={`/ru/teams/${resolveTeamLink(tA?.id, tA?.name ?? '')}`} className="hover:text-primary transition-colors">{tA?.name ?? 'TBD'}</Link>
                          <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'hsl(var(--muted))' }}>VS</span>
                          {tB?.image_url && <img loading="lazy" src={tB.image_url} alt={tB.name} className="w-5 h-5 object-contain shrink-0" />}
                          <Link href={`/ru/teams/${resolveTeamLink(tB?.id, tB?.name ?? '')}`} className="hover:text-primary transition-colors">{tB?.name ?? 'TBD'}</Link>
                        </div>
                        {(() => {
                          const d = m.scheduled_at ? new Date(m.scheduled_at) : null
                          const known = d ? TIER1_TOURNAMENTS.find(t =>
                            t.league_id === m.league.id &&
                            new Date(t.start_date) <= d &&
                            d <= new Date(t.end_date + 'T23:59:59Z')
                          ) : undefined
                          const label = known?.name ?? `${m.league.name} · ${m.tournament.name}`
                          return known?.slug
                            ? <Link href={`/ru/tournaments/${known.slug}`} className="text-xs text-muted-foreground hover:text-primary transition-colors truncate">{label}</Link>
                            : <div className="text-xs text-muted-foreground truncate">{label}</div>
                        })()}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted-foreground">
                          {m.scheduled_at ? new Date(m.scheduled_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'Europe/Moscow' }) : '–'}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground/60">BO{m.number_of_games}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Match history */}
          {completedMatches.length > 0 && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">История матчей</p>
              <div className="grid gap-2">
                {completedMatches.map(m => {
                  const t1 = m.team_1
                  const t2 = m.team_2
                  const teamIsTeam1 = m.team_1_id === team.id
                  const myScore = teamIsTeam1 ? m.score_team_1 : m.score_team_2
                  const oppScore = teamIsTeam1 ? m.score_team_2 : m.score_team_1
                  const won = myScore !== null && oppScore !== null && myScore > oppScore
                  const drew = myScore !== null && oppScore !== null && myScore === oppScore
                  const resultColor = drew ? '#f59e0b' : won ? 'hsl(var(--success))' : 'hsl(var(--destructive))'
                  const resultLabel = drew ? 'Н' : won ? 'П' : 'П'
                  const resultLabelStyled = drew ? 'Н' : won ? 'В' : 'П'
                  void resultLabel
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-t border-border/40 first:border-0">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                        style={{ background: drew ? 'rgba(245,158,11,0.15)' : won ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--destructive) / 0.15)', color: resultColor }}
                      >
                        {resultLabelStyled}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-foreground">
                          {t1?.logo_url && <img loading="lazy" src={t1.logo_url} alt={t1.name} className="w-5 h-5 object-contain shrink-0" />}
                          {t1?.slug ? <Link href={`/ru/teams/${t1.slug}`} className="hover:text-primary transition-colors">{t1.name}</Link> : <span>{t1?.name}</span>}
                          <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'hsl(var(--muted))' }}>VS</span>
                          {t2?.logo_url && <img loading="lazy" src={t2.logo_url} alt={t2.name} className="w-5 h-5 object-contain shrink-0" />}
                          {t2?.slug ? <Link href={`/ru/teams/${t2.slug}`} className="hover:text-primary transition-colors">{t2.name}</Link> : <span>{t2?.name}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {m.tournament?.slug ? (
                            <Link href={`/ru/tournaments/${m.tournament.slug}`} className="hover:text-primary transition-colors">
                              {m.tournament.name}
                            </Link>
                          ) : m.tournament?.name}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {myScore !== null && oppScore !== null && (
                          <div className="text-sm font-black tabular-nums" style={{ color: resultColor }}>
                            {myScore}–{oppScore}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground/60">
                          {m.match_date ? new Date(m.match_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '–'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column — roster */}
        {players && players.length > 0 && (
          <div className="rounded-2xl border border-border/60 p-5 h-fit" style={{ background: 'hsl(var(--card) / 0.6)' }}>
            <p className="section-label mb-3">Состав</p>
            <div className="grid gap-2">
              {players.map(p => (
                <Link
                  key={p.id}
                  href={`/ru/players/${p.slug}`}
                  className="flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-primary/5"
                >
                  <div className="w-9 h-9 rounded-xl border border-border/60 bg-secondary/80 flex items-center justify-center shrink-0 overflow-hidden">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={p.photo_url} alt={p.ign} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-xs font-bold text-muted-foreground">
                        {p.ign.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-sm text-foreground truncate">{p.ign}</div>
                    {p.full_name && <div className="text-xs text-muted-foreground truncate">{p.full_name}</div>}
                  </div>
                  {p.position && (
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${posColor[p.position]}`}>
                      {p.position} · {posLabel[p.position]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
