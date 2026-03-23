import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTeamBySlug } from '@/lib/queries'
import { createAdminClient } from '@/lib/supabase/admin'
import BioRenderer from '@/components/BioRenderer'
import type { Team } from '@/lib/types'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const team = await getTeamBySlug(slug) as Team
    const title = `${team.name} — Dota 2 Team Profile`
    const description = team.bio
      ? team.bio.replace(/^#+ /gm, '').slice(0, 155)
      : `${team.name} Dota 2 team stats, ELO rating, roster, and match history on Dota2ProTips.`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/teams/${slug}`,
        ...(team.logo_url ? { images: [{ url: team.logo_url, alt: team.name }] } : {}),
      },
      twitter: { card: 'summary', title, description },
      alternates: { canonical: `/teams/${slug}` },
    }
  } catch {
    return { title: 'Team Not Found' }
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

export default async function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let team: Team
  try {
    team = await getTeamBySlug(slug) as Team
  } catch {
    notFound()
  }

  // Get players on this team
  const supabase = createAdminClient()
  const { data: players } = await supabase
    .from('players')
    .select('id, slug, ign, full_name, photo_url, position')
    .eq('team_id', team.id)
    .eq('is_published', true)
    .order('position', { ascending: true, nullsFirst: false })

  // W/D/L record from match_predictions
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
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null

  // Matches involving this team
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

  const posLabel: Record<number, string> = {
    1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Support', 5: 'Hard Support',
  }

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Teams', item: 'https://dota2protips.com/teams' },
              { '@type': 'ListItem', position: 2, name: team.name, item: `https://dota2protips.com/teams/${slug}` },
            ],
          }),
        }}
      />
      {/* Back */}
      <Link href="/teams" className="inline-flex items-center gap-1 text-sm mb-6 hover:text-primary transition-colors" style={{ color: 'var(--text-muted)' }}>
        ← All Teams
      </Link>

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

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
            {team.region && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>{REGION_FLAG[team.region] ?? '🌐'}</span>
                <span>{team.region}</span>
              </span>
            )}
            {team.founded_year && (
              <span className="text-sm text-muted-foreground">Est. {team.founded_year}</span>
            )}
            {total > 0 && (
              <span className="text-sm text-muted-foreground">
                <span className="text-success font-semibold">{wins}W</span>
                {' · '}
                {draws > 0 && <><span className="font-semibold" style={{ color: '#f59e0b' }}>{draws}D</span>{' · '}</>}
                <span className="text-destructive font-semibold">{losses}L</span>
                {winRate !== null && ` · ${winRate}%`}
              </span>
            )}
            <span className="font-display font-bold text-sm">
              ELO {team.current_elo}
            </span>
          </div>
        </div>

        {/* External links */}
        <div className="flex flex-col gap-2 shrink-0">
          {team.liquipedia_url && (
            <a href={team.liquipedia_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
              Liquipedia ↗
            </a>
          )}
          {team.website_url && (
            <a href={team.website_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
              Website ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="grid gap-6">
          {/* Bio */}
          {team.bio && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">About</p>
              <BioRenderer text={team.bio} />
            </div>
          )}

          {/* Achievements */}
          {team.achievements && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">Achievements</p>
              <BioRenderer text={team.achievements} />
            </div>
          )}

          {/* Upcoming matches */}
          {upcomingMatches.length > 0 && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">Upcoming Matches</p>
              <div className="grid gap-2">
                {upcomingMatches.map(m => {
                  const t1 = m.team_1
                  const t2 = m.team_2
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-t border-border/40 first:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-foreground">
                          {t1?.logo_url && <img loading="lazy" src={t1.logo_url} alt={t1.name ?? ''} className="w-5 h-5 object-contain shrink-0" />}
                          {t1?.slug ? <Link href={`/teams/${t1.slug}`} className="hover:text-primary transition-colors">{t1.name}</Link> : <span>{t1?.name}</span>}
                          <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'hsl(var(--muted))' }}>VS</span>
                          {t2?.logo_url && <img loading="lazy" src={t2.logo_url} alt={t2.name ?? ''} className="w-5 h-5 object-contain shrink-0" />}
                          {t2?.slug ? <Link href={`/teams/${t2.slug}`} className="hover:text-primary transition-colors">{t2.name}</Link> : <span>{t2?.name}</span>}
                        </div>
                        {m.tournament && (
                          <div className="text-xs text-muted-foreground truncate">
                            <Link href={`/tournaments/${m.tournament.slug}`} className="hover:text-primary transition-colors">
                              {m.tournament.name}
                            </Link>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted-foreground">
                          {m.match_date ? new Date(m.match_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–'}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground/60">BO{m.best_of}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed matches */}
          {completedMatches.length > 0 && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">Match History</p>
              <div className="grid gap-2">
                {completedMatches.map(m => {
                  const isTeam1 = m.team_1_id === team.id
                  const t1 = m.team_1
                  const t2 = m.team_2
                  const myScore = isTeam1 ? m.score_team_1! : m.score_team_2!
                  const oppScore = isTeam1 ? m.score_team_2! : m.score_team_1!
                  const won = myScore > oppScore
                  const drew = myScore === oppScore
                  const resultColor = drew ? '#f59e0b' : won ? 'hsl(var(--success))' : 'hsl(var(--destructive))'
                  const resultLabel = drew ? 'D' : won ? 'W' : 'L'
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-t border-border/40 first:border-0">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                        style={{ background: drew ? 'rgba(245,158,11,0.15)' : won ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--destructive) / 0.15)', color: resultColor }}
                      >
                        {resultLabel}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-foreground">
                          {t1?.logo_url && <img loading="lazy" src={t1.logo_url} alt={t1.name ?? ''} className="w-5 h-5 object-contain shrink-0" />}
                          {t1?.slug ? <Link href={`/teams/${t1.slug}`} className="hover:text-primary transition-colors">{t1.name}</Link> : <span>{t1?.name}</span>}
                          <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'hsl(var(--muted))' }}>VS</span>
                          {t2?.logo_url && <img loading="lazy" src={t2.logo_url} alt={t2.name ?? ''} className="w-5 h-5 object-contain shrink-0" />}
                          {t2?.slug ? <Link href={`/teams/${t2.slug}`} className="hover:text-primary transition-colors">{t2.name}</Link> : <span>{t2?.name}</span>}
                        </div>
                        {m.tournament && (
                          <div className="text-xs text-muted-foreground truncate">
                            <Link href={`/tournaments/${m.tournament.slug}`} className="hover:text-primary transition-colors">
                              {m.tournament.name}
                            </Link>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black tabular-nums" style={{ color: resultColor }}>
                          {myScore}–{oppScore}
                        </div>
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

        {/* Right column — roster */}
        {players && players.length > 0 && (
          <div className="rounded-2xl border border-border/60 p-5 h-fit" style={{ background: 'hsl(var(--card) / 0.6)' }}>
            <p className="section-label mb-3">Roster</p>
            <div className="grid gap-2">
              {players.map(p => (
                <Link
                  key={p.id}
                  href={`/players/${p.slug}`}
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
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--primary))' }}>
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
