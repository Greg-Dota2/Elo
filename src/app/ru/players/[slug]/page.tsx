import { getPlayerBySlug } from '@/lib/queries'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import BioRenderer from '@/components/BioRenderer'
import PlayerRadarSection from '@/components/PlayerRadarSection'
import { heroDisplayNameToSlug, heroPortraitUrl, fetchAllHeroes, ATTR_CONFIG } from '@/lib/heroes'
import { createAdminClient } from '@/lib/supabase/admin'
import { Suspense } from 'react'
import LiveUpcomingMatches from '@/components/LiveUpcomingMatches'
import { computePlayerPlacements, type TournamentPrizeRow, type PlayerTransferRow } from '@/lib/playerResults'
import { autoLinkBio } from '@/lib/autoLinkBio'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const player = await getPlayerBySlug(slug)
    const posLabel: Record<number, string> = { 1: 'Керри', 2: 'Мид', 3: 'Офлейн', 4: 'Саппорт', 5: 'Хард саппорт' }
    const role = player.position ? posLabel[player.position] : null
    const team = player.team?.name
    const title = `${player.ign} — Игрок Dota 2: Статистика и карьера`
    const description = (role && team)
      ? `${player.ign} играет ${role} за ${team}. Статистика, герои, результаты турниров и история матчей на Dota2ProTips.`
      : `${player.ign} — профиль про-игрока Dota 2. Статистика, герои и история матчей на Dota2ProTips.`
    return {
      title,
      description,
      openGraph: { title, description, url: `/ru/players/${slug}`, ...(player.photo_url ? { images: [{ url: player.photo_url, alt: player.ign }] } : {}) },
      twitter: { card: player.photo_url ? 'summary_large_image' : 'summary', title, description, ...(player.photo_url ? { images: [player.photo_url] } : {}) },
      alternates: { canonical: `/ru/players/${slug}`, languages: { 'x-default': `/players/${slug}`, 'en': `/players/${slug}`, 'ru': `/ru/players/${slug}` } },
    }
  } catch {
    return { title: 'Игрок не найден' }
  }
}

interface Props { params: Promise<{ slug: string }> }

const POSITION_LABEL: Record<number, string> = { 1: 'Керри (Поз. 1)', 2: 'Мид (Поз. 2)', 3: 'Офлейн (Поз. 3)', 4: 'Саппорт (Поз. 4)', 5: 'Хард саппорт (Поз. 5)' }
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

export default async function RuPlayerPage({ params }: Props) {
  const { slug } = await params
  if (slug !== slug.toLowerCase()) redirect(`/ru/players/${slug.toLowerCase()}`)
  let player
  try { player = await getPlayerBySlug(slug) } catch { notFound() }

  const posColor = player.position ? POSITION_COLOR[player.position] : ''
  const supabase = createAdminClient()

  const [allHeroes, teamMatchesResult, tournamentsWithPrize, playerTransfersResult, allTeamsResult, allPlayersResult] = await Promise.all([
    fetchAllHeroes().catch(() => []),
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
    player.team ? supabase
      .from('tournaments')
      .select('id, name, slug, logo_url, prize_distribution, end_date')
      .eq('is_published', true)
      .not('prize_distribution', 'is', null)
      .order('end_date', { ascending: false })
    : Promise.resolve({ data: [] }),
    supabase
      .from('transfers')
      .select('from_team, to_team, transfer_date, type')
      .eq('player_slug', slug)
      .order('transfer_date', { ascending: true }),
    supabase.from('teams').select('name, slug').not('slug', 'is', null),
    supabase.from('players').select('ign, slug').eq('is_published', true).not('slug', 'is', null),
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

  const tournamentPlacements = player.team
    ? computePlayerPlacements(
        (tournamentsWithPrize.data ?? []) as TournamentPrizeRow[],
        (playerTransfersResult.data ?? []) as PlayerTransferRow[],
        player.team.name,
      )
    : []

  // Status for teamless players — latest transfer type decides retired vs free agent
  const transferRows = (playerTransfersResult.data ?? []) as { type?: string }[]
  const teamlessStatus = player.team
    ? null
    : transferRows[transferRows.length - 1]?.type === 'retired' ? 'Завершил карьеру' : 'Свободный агент'

  // Auto-link known teams/players in the bio prose (max 5, names >= 5 chars)
  const bioEntities = [
    ...((allTeamsResult.data ?? []) as { name: string; slug: string }[]).map(t => ({ name: t.name, url: `/ru/teams/${t.slug}` })),
    ...((allPlayersResult.data ?? []) as { ign: string; slug: string }[]).filter(p => p.slug !== player.slug).map(p => ({ name: p.ign, url: `/ru/players/${p.slug}` })),
  ]
  const bioText = (player.bio_ru ?? player.bio) ?? null
  const linkedBio = bioText ? autoLinkBio(bioText, bioEntities, 5) : null

  const SITE_URL = 'https://www.dota2protips.com'

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Игроки', item: `${SITE_URL}/ru/players` },
              { '@type': 'ListItem', position: 2, name: player.ign, item: `${SITE_URL}/ru/players/${slug}` },
            ],
          }),
        }}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
        <Link href="/ru/players" className="hover:text-foreground transition-colors">Игроки</Link>
        <span className="text-muted-foreground/40">/</span>
        <span>{player.ign}</span>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-52 shrink-0 bg-secondary/60">
            {player.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photo_url} alt={player.ign} className="w-full h-64 sm:h-full object-cover object-top" />
            ) : (
              <div className="w-full h-52 sm:h-full flex items-center justify-center">
                <span className="font-display text-6xl font-black text-muted-foreground/20">{player.ign.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
          </div>

          <div className="flex-1 p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="font-display text-3xl font-black tracking-tight">{player.ign}</h1>
                {player.full_name && <p className="text-muted-foreground text-sm mt-0.5">{player.full_name}</p>}
              </div>
              {player.liquipedia_url && (
                <a href={player.liquipedia_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0">
                  Liquipedia ↗
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {player.team ? (
                <div>
                  <p className="section-label mb-1">Команда</p>
                  <div className="flex items-center gap-2">
                    {player.team.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={player.team.logo_url} alt={player.team.name} className="w-5 h-5 object-contain rounded" />
                    )}
                    {player.team.slug ? (
                      <Link href={`/ru/teams/${player.team.slug}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {player.team.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">{player.team.name}</span>
                    )}
                  </div>
                </div>
              ) : teamlessStatus && (
                <div>
                  <p className="section-label mb-1">Статус</p>
                  <span
                    className="inline-block text-xs font-bold px-2.5 py-1 rounded-full border"
                    style={teamlessStatus === 'Завершил карьеру'
                      ? { color: 'var(--text-muted)', background: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }
                      : { color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', borderColor: 'hsl(var(--primary) / 0.25)' }}
                  >
                    {teamlessStatus}
                  </span>
                </div>
              )}
              {player.position && (
                <div>
                  <p className="section-label mb-1">Роль</p>
                  <Link href={`/ru/players?pos=${player.position}`} className={`text-xs font-bold px-2.5 py-1 rounded-full border hover:opacity-80 transition-opacity ${posColor}`}>
                    {POSITION_LABEL[player.position]}
                  </Link>
                </div>
              )}
              {player.nationality && (
                <div>
                  <p className="section-label mb-1">Национальность</p>
                  <span className="text-foreground font-semibold">{player.nationality}</span>
                </div>
              )}
              {player.date_of_birth && (
                <div>
                  <p className="section-label mb-1">Возраст</p>
                  <span className="text-foreground font-semibold">
                    {age(player.date_of_birth)} лет
                    <span className="text-muted-foreground font-normal ml-1.5 text-xs">
                      ({new Date(player.date_of_birth).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })})
                    </span>
                  </span>
                </div>
              )}
              <div>
                <p className="section-label mb-1">Ранг</p>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_8.png" alt="Immortal" className="w-8 h-8 object-contain" />
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
            <p className="section-label mb-3">Фирменные герои</p>
            <div className="grid grid-cols-2 gap-2">
              {player.signature_heroes.map(hero => {
                const hSlug = heroDisplayNameToSlug(hero)
                const heroData = heroByName.get(hero)
                const cfg = heroData ? ATTR_CONFIG[heroData.primary_attr] : null
                return (
                  <Link key={hero} href={`/ru/heroes/${hSlug}`} className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-secondary/40 transition-colors">
                    <div className="w-12 h-7 rounded-lg overflow-hidden shrink-0 border border-border/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={heroPortraitUrl(hSlug)} alt={hero} className="w-full h-full object-cover object-center" />
                    </div>
                    <span className="text-sm font-semibold flex-1 truncate">{hero}</span>
                    {cfg && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${cfg.color} ${cfg.bg} ${cfg.border}`}>{cfg.short}</span>
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
            <p className="section-label mb-3">Предыдущие команды</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{player.previous_teams}</p>
          </div>
        )}

        {/* Achievements */}
        {(player.achievements_ru ?? player.achievements) && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:col-span-2">
            <p className="section-label mb-3">Достижения</p>
            <BioRenderer text={(player.achievements_ru ?? player.achievements)!} />
          </div>
        )}

        {/* Tournament Results */}
        {tournamentPlacements.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:col-span-2">
            <p className="section-label mb-3">Результаты турниров</p>
            <div className="grid gap-2">
              {tournamentPlacements.map(p => {
                const medal = p.place === '1st' ? '🥇' : p.place === '2nd' ? '🥈' : p.place === '3rd' || p.place === '3rd-4th' ? '🥉' : null
                const placeColor = p.place === '1st' ? '#f59e0b' : p.place === '2nd' ? '#94a3b8' : p.place === '3rd' || p.place === '3rd-4th' ? '#c47a3a' : 'var(--text-muted)'
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
                        <span className="text-xs text-muted-foreground">{p.team}</span>
                        {p.ept_points != null && <span className="text-xs tabular-nums" style={{ color: 'hsl(var(--primary))' }}>{p.ept_points.toLocaleString()} EPT</span>}
                        {p.club_reward != null && <span className="text-xs tabular-nums" style={{ color: '#a78bfa' }}>+{formatUSD(p.club_reward)} клуб</span>}
                      </div>
                    </div>
                    {p.prize_usd != null && <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: '#4ade80' }}>{formatUSD(p.prize_usd)}</span>}
                    <div className="flex items-center gap-1 shrink-0">
                      {medal && <span className="text-base leading-none">{medal}</span>}
                      <span className="text-xs font-black tabular-nums" style={{ color: placeColor }}>{p.place}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bio */}
        {bioText && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:col-span-2">
            <p className="section-label mb-3">Биография</p>
            <BioRenderer text={linkedBio ?? bioText} />
          </div>
        )}

        {/* Radar stats */}
        {player.opendota_id && (
          <Suspense fallback={null}>
            <PlayerRadarSection opendotaId={player.opendota_id} />
          </Suspense>
        )}

        {/* Upcoming matches from PandaScore */}
        {player.team && (
          <Suspense fallback={null}>
            <LiveUpcomingMatches
              teamName={player.team.name}
              label={`Предстоящие матчи — ${player.team.name}`}
              locale="ru"
            />
          </Suspense>
        )}

        {/* Recent matches */}
        {teamMatches.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:col-span-2">
            <p className="section-label mb-3">Последние матчи — {player.team?.name}</p>
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
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                      style={{ background: drew ? 'rgba(245,158,11,0.15)' : won ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--destructive) / 0.15)', color: resultColor }}>
                      {drew ? 'Н' : won ? 'В' : 'П'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-foreground">
                        {t1?.logo_url && <img loading="lazy" src={t1.logo_url} alt={t1.name} className="w-5 h-5 object-contain shrink-0" />}
                        {t1?.slug ? <Link href={`/ru/teams/${t1.slug}`} className="hover:text-primary transition-colors">{t1.name}</Link> : <span>{t1?.name}</span>}
                        <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'hsl(var(--muted))' }}>VS</span>
                        {t2?.logo_url && <img loading="lazy" src={t2.logo_url} alt={t2.name} className="w-5 h-5 object-contain shrink-0" />}
                        {t2?.slug ? <Link href={`/ru/teams/${t2.slug}`} className="hover:text-primary transition-colors">{t2.name}</Link> : <span>{t2?.name}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.tournament?.slug ? (
                          <Link href={`/ru/tournaments/${m.tournament.slug}`} className="hover:text-primary transition-colors">{m.tournament.name}</Link>
                        ) : m.tournament?.name}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {myScore !== null && oppScore !== null && (
                        <div className="text-sm font-black tabular-nums" style={{ color: resultColor }}>{myScore}–{oppScore}</div>
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
    </div>
  )
}
