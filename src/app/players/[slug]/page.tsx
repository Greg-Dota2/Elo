import { getPlayerBySlug } from '@/lib/queries'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import BioRenderer from '@/components/BioRenderer'
import PlayerRadar from '@/components/PlayerRadar'
import { heroDisplayNameToSlug, heroPortraitUrl, fetchAllHeroes, ATTR_CONFIG } from '@/lib/heroes'
import { fetchPlayerRadarStats } from '@/lib/opendota'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchUpcomingTier1Matches, fetchRunningTier1Matches, type PSMatch } from '@/lib/pandascore'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const player = await getPlayerBySlug(slug)
    const posLabel: Record<number, string> = { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Support', 5: 'Hard Support' }
    const role = player.position ? posLabel[player.position] : null
    const team = player.team?.name
    const baseTitle = `${player.ign} — Dota 2 Player`
    const withFull = player.full_name ? `${player.ign} (${player.full_name}) — Dota 2 Player` : baseTitle
    const title = (withFull.length + 16) <= 70 ? withFull : baseTitle
    const description = player.bio
      ? player.bio.replace(/^#+\s*/gm, '').slice(0, 155)
      : `${player.ign} is a professional Dota 2 player${role ? `, ${role}` : ''}${team ? ` for ${team}` : ''}. Profile, stats and career on Dota2ProTips.`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/players/${slug}`,
        ...(player.photo_url ? { images: [{ url: player.photo_url, alt: player.ign }] } : {}),
      },
      twitter: { card: player.photo_url ? 'summary_large_image' : 'summary', title, description, ...(player.photo_url ? { images: [player.photo_url] } : {}) },
      alternates: { canonical: `/players/${slug}` },
    }
  } catch {
    return { title: 'Player Not Found' }
  }
}

interface Props { params: Promise<{ slug: string }> }

const POSITION_LABEL: Record<number, string> = { 1: 'Carry (Pos 1)', 2: 'Mid (Pos 2)', 3: 'Offlane (Pos 3)', 4: 'Soft Support (Pos 4)', 5: 'Hard Support (Pos 5)' }
const POSITION_COLOR: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  2: 'text-primary bg-primary/10 border-primary/20',
  3: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  4: 'text-success bg-success/10 border-success/20',
  5: 'text-success bg-success/10 border-success/20',
}

function age(dob: string) {
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default async function PlayerPage({ params }: Props) {
  const { slug } = await params
  if (slug !== slug.toLowerCase()) redirect(`/players/${slug.toLowerCase()}`)
  let player
  try { player = await getPlayerBySlug(slug) } catch { notFound() }

  const posColor = player.position ? POSITION_COLOR[player.position] : ''
  const supabase = createAdminClient()

  const { data: psTeamRows } = await supabase
    .from('teams').select('pandascore_team_id, slug')
    .not('pandascore_team_id', 'is', null).not('slug', 'is', null)
  const psTeamSlugMap = new Map<number, string>(
    (psTeamRows ?? []).map(t => [t.pandascore_team_id as number, t.slug as string])
  )
  const resolveTeamLink = (psId: number | undefined, psName: string) =>
    (psId && psTeamSlugMap.get(psId)) ?? psName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const [allHeroes, radarStats, teamMatchesResult, psUpcoming, psRunning] = await Promise.all([
    fetchAllHeroes().catch(() => []),
    player.opendota_id ? fetchPlayerRadarStats(player.opendota_id) : Promise.resolve(null),
    player.team?.id ? supabase
      .from('match_predictions')
      .select(`
        id, match_date, score_team_1, score_team_2,
        team_1_id, team_2_id,
        team_1:teams!match_predictions_team_1_id_fkey(id, name, logo_url, slug),
        team_2:teams!match_predictions_team_2_id_fkey(id, name, logo_url, slug),
        tournament:tournaments(name, slug)
      `)
      .eq('is_published', true)
      .or(`team_1_id.eq.${player.team.id},team_2_id.eq.${player.team.id}`)
      .not('score_team_1', 'is', null)
      .order('match_date', { ascending: false })
      .limit(10)
    : Promise.resolve({ data: [] }),
    fetchUpcomingTier1Matches(100).catch(() => [] as PSMatch[]),
    fetchRunningTier1Matches(50).catch(() => [] as PSMatch[]),
  ])

  type TeamMatch = {
    id: string; match_date: string | null
    score_team_1: number | null; score_team_2: number | null
    team_1_id: string; team_2_id: string
    team_1: { id: string; name: string; logo_url: string | null; slug: string | null } | null
    team_2: { id: string; name: string; logo_url: string | null; slug: string | null } | null
    tournament: { name: string; slug: string } | null
  }
  const teamMatches = (teamMatchesResult.data ?? []) as unknown as TeamMatch[]
  const heroByName = new Map(allHeroes.map(h => [h.localized_name, h]))

  // Filter PandaScore upcoming/live matches to this player's team
  const teamNameLower = player.team?.name.toLowerCase() ?? ''
  const psUpcomingTeam = player.team ? [...psRunning, ...psUpcoming].filter(m =>
    m.opponents.some(o => {
      const ps = o.opponent.name.toLowerCase()
      return ps === teamNameLower || ps.startsWith(teamNameLower + ' ') || teamNameLower.startsWith(ps + ' ')
    })
  ) : []

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Players', item: 'https://www.dota2protips.com/players' },
                { '@type': 'ListItem', position: 2, name: player.ign, item: `https://www.dota2protips.com/players/${slug}` },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Athlete',
              name: player.full_name ?? player.ign,
              alternateName: player.ign,
              url: `https://www.dota2protips.com/players/${slug}`,
              sport: 'Dota 2',
              jobTitle: 'Professional Dota 2 Player',
              ...(player.photo_url ? { image: player.photo_url } : {}),
              ...(player.nationality ? { nationality: player.nationality } : {}),
              ...(player.date_of_birth ? { birthDate: player.date_of_birth } : {}),
              ...(player.bio ? { description: player.bio.replace(/^#+\s*/gm, '').slice(0, 300) } : {}),
              ...(player.achievements ? { award: player.achievements.replace(/^#+\s*/gm, '').slice(0, 200) } : {}),
              ...(player.signature_heroes?.length ? { knowsAbout: player.signature_heroes } : {}),
              ...(player.team?.name ? {
                memberOf: {
                  '@type': 'SportsTeam',
                  name: player.team.name,
                  sport: 'Dota 2',
                  ...(player.team.logo_url ? { logo: player.team.logo_url } : {}),
                  ...(player.team.slug ? { url: `https://www.dota2protips.com/teams/${player.team.slug}` } : {}),
                }
              } : {}),
              ...(player.liquipedia_url ? { sameAs: [player.liquipedia_url] } : {}),
            },
          ]),
        }}
      />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
        <Link href="/players" className="hover:text-foreground transition-colors">Players</Link>
        <span className="text-muted-foreground/40">/</span>
        <span>{player.ign}</span>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row">
          {/* Photo */}
          <div className="sm:w-52 shrink-0 bg-secondary/60">
            {player.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.photo_url}
                alt={player.ign}
                className="w-full h-64 sm:h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-52 sm:h-full flex items-center justify-center">
                <span className="font-display text-6xl font-black text-muted-foreground/20">
                  {player.ign.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="font-display text-3xl font-black tracking-tight">{player.ign}</h1>
                {player.full_name && (
                  <p className="text-muted-foreground text-sm mt-0.5">{player.full_name}</p>
                )}
              </div>
              {player.liquipedia_url && (
                <a
                  href={player.liquipedia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  Liquipedia ↗
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {player.team && (
                <div>
                  <p className="section-label mb-1">Team</p>
                  <div className="flex items-center gap-2">
                    {player.team.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={player.team.logo_url} alt={player.team.name} className="w-5 h-5 object-contain rounded" />
                    )}
                    {player.team.slug ? (
                      <Link href={`/teams/${player.team.slug}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {player.team.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">{player.team.name}</span>
                    )}
                  </div>
                </div>
              )}
              {player.position && (
                <div>
                  <p className="section-label mb-1">Role</p>
                  <Link href={`/players?pos=${player.position}`} className={`text-xs font-bold px-2.5 py-1 rounded-full border hover:opacity-80 transition-opacity ${posColor}`}>
                    {POSITION_LABEL[player.position]}
                  </Link>
                </div>
              )}
              {player.nationality && (
                <div>
                  <p className="section-label mb-1">Nationality</p>
                  <span className="text-foreground font-semibold">{player.nationality}</span>
                </div>
              )}
              {player.date_of_birth && (
                <div>
                  <p className="section-label mb-1">Age</p>
                  <span className="text-foreground font-semibold">
                    {age(player.date_of_birth)} years
                    <span className="text-muted-foreground font-normal ml-1.5 text-xs">
                      ({new Date(player.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                    </span>
                  </span>
                </div>
              )}
              <div>
                <p className="section-label mb-1">Rank</p>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_8.png"
                    alt="Immortal"
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-foreground font-semibold">Immortal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Signature heroes */}
        {player.signature_heroes && player.signature_heroes.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <p className="section-label mb-3">Signature Heroes</p>
            <div className="grid grid-cols-2 gap-2">
              {player.signature_heroes.map(hero => {
                const slug = heroDisplayNameToSlug(hero)
                const heroData = heroByName.get(hero)
                const cfg = heroData ? ATTR_CONFIG[heroData.primary_attr] : null
                return (
                  <Link
                    key={hero}
                    href={`/heroes/${slug}`}
                    className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="w-12 h-7 rounded-lg overflow-hidden shrink-0 border border-border/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={heroPortraitUrl(slug)} alt={hero} className="w-full h-full object-cover object-center" />
                    </div>
                    <span className="text-sm font-semibold flex-1 truncate">{hero}</span>
                    {cfg && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                        {cfg.short}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Previous teams */}
        {player.previous_teams && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <p className="section-label mb-3">Previous Teams</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{player.previous_teams}</p>
          </div>
        )}

        {/* Achievements */}
        {player.achievements && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:col-span-2">
            <p className="section-label mb-3">Notable Achievements</p>
            <BioRenderer text={player.achievements} />
          </div>
        )}

        {/* Bio */}
        {player.bio && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:col-span-2">
            <p className="section-label mb-3">Biography</p>
            <BioRenderer text={player.bio} />
          </div>
        )}

        {/* Radar stats */}
        {radarStats && <PlayerRadar stats={radarStats} />}

        {/* Match history */}
        {psUpcomingTeam.length > 0 && (
          <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
            <p className="section-label mb-3">Upcoming Matches — {player.team?.name}</p>
            <div className="grid gap-2">
              {psUpcomingTeam.map(m => {
                const tA = m.opponents[0]?.opponent
                const tB = m.opponents[1]?.opponent
                const isLive = m.status === 'running'
                const d = m.scheduled_at ? new Date(m.scheduled_at) : null
                const known = d ? TIER1_TOURNAMENTS.find(t =>
                  t.league_id === m.league.id &&
                  new Date(t.start_date) <= d &&
                  d <= new Date(t.end_date + 'T23:59:59Z')
                ) : undefined
                const tournamentLabel = known?.name ?? `${m.league.name} · ${m.tournament.name}`
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-t border-border/40 first:border-0">
                    {isLive && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' }}>LIVE</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-foreground">
                        {tA?.image_url && <img loading="lazy" src={tA.image_url} alt={tA.name} className="w-5 h-5 object-contain shrink-0" />}
                        <Link href={`/teams/${resolveTeamLink(tA?.id, tA?.name ?? '')}`} className="hover:text-primary transition-colors">{tA?.name ?? 'TBD'}</Link>
                        <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'hsl(var(--muted))' }}>VS</span>
                        {tB?.image_url && <img loading="lazy" src={tB.image_url} alt={tB.name} className="w-5 h-5 object-contain shrink-0" />}
                        <Link href={`/teams/${resolveTeamLink(tB?.id, tB?.name ?? '')}`} className="hover:text-primary transition-colors">{tB?.name ?? 'TBD'}</Link>
                      </div>
                      {known?.slug
                        ? <Link href={`/tournaments/${known.slug}`} className="text-xs text-muted-foreground hover:text-primary transition-colors truncate">{tournamentLabel}</Link>
                        : <div className="text-xs text-muted-foreground truncate">{tournamentLabel}</div>
                      }
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">
                        {m.scheduled_at ? new Date(m.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/Athens' }) : '–'}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground/60">BO{m.number_of_games}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {teamMatches.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:col-span-2">
            <p className="section-label mb-3">Recent Matches — {player.team?.name}</p>
            <div className="grid gap-2">
              {teamMatches.map(m => {
                const teamIsTeam1 = m.team_1_id === player.team?.id
                const myScore = teamIsTeam1 ? m.score_team_1 : m.score_team_2
                const oppScore = teamIsTeam1 ? m.score_team_2 : m.score_team_1
                const won = myScore !== null && oppScore !== null && myScore > oppScore
                const drew = myScore !== null && oppScore !== null && myScore === oppScore
                const resultColor = drew ? '#f59e0b' : won ? 'hsl(var(--success))' : 'hsl(var(--destructive))'
                const t1 = m.team_1
                const t2 = m.team_2
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-t border-border/40 first:border-0">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                      style={{ background: drew ? 'rgba(245,158,11,0.15)' : won ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--destructive) / 0.15)', color: resultColor }}
                    >
                      {drew ? 'D' : won ? 'W' : 'L'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-foreground">
                        {t1?.logo_url && <img loading="lazy" src={t1.logo_url} alt={t1.name} className="w-5 h-5 object-contain shrink-0" />}
                        {t1?.slug ? <Link href={`/teams/${t1.slug}`} className="hover:text-primary transition-colors">{t1.name}</Link> : <span>{t1?.name}</span>}
                        <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'hsl(var(--muted))' }}>VS</span>
                        {t2?.logo_url && <img loading="lazy" src={t2.logo_url} alt={t2.name} className="w-5 h-5 object-contain shrink-0" />}
                        {t2?.slug ? <Link href={`/teams/${t2.slug}`} className="hover:text-primary transition-colors">{t2.name}</Link> : <span>{t2?.name}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.tournament?.slug ? (
                          <Link href={`/tournaments/${m.tournament.slug}`} className="hover:text-primary transition-colors">
                            {m.tournament.name}
                          </Link>
                        ) : m.tournament?.name}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {myScore !== null && oppScore !== null && (
                        <div className="text-sm font-black tabular-nums" style={{ color: resultColor }}>{myScore}–{oppScore}</div>
                      )}
                      <div className="text-xs text-muted-foreground/60">
                        {m.match_date ? new Date(m.match_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
