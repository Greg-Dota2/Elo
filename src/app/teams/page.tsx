import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Dota 2 Teams — Profiles & ELO Ratings',
  description: 'Profiles for pro Dota 2 teams — ELO ratings, rosters, region, and prediction accuracy.',
  keywords: ['Dota 2 teams', 'pro Dota 2 teams', 'Dota 2 team ELO', 'Dota 2 rosters', 'Team Spirit', 'Team Liquid', 'Gaimin Gladiators', 'Tundra Esports'],
  alternates: { canonical: '/teams' },
  openGraph: { title: 'Dota 2 Teams — Profiles & ELO Ratings', description: 'Profiles for pro Dota 2 teams — ELO ratings, rosters, region, and prediction accuracy.', url: '/teams' },
  twitter: { card: 'summary', title: 'Dota 2 Teams — Profiles & ELO Ratings', description: 'Profiles for pro Dota 2 teams — ELO ratings, rosters, region, and prediction accuracy.' },
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

export default async function TeamsPage() {
  const supabase = createAdminClient()

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name, region, logo_url, banner_url, current_elo, is_active, slug')
    .order('current_elo', { ascending: false })

  const { data: matchRows } = await supabase
    .from('match_predictions')
    .select('team_1_id, team_2_id, score_team_1, score_team_2')
    .eq('is_published', true)
    .not('score_team_1', 'is', null)
    .not('score_team_2', 'is', null)

  type MatchRow = { team_1_id: string; team_2_id: string; score_team_1: number; score_team_2: number }
  const statsMap = new Map<string, { wins: number; draws: number; losses: number }>()
  for (const row of (matchRows as MatchRow[]) ?? []) {
    const s1 = row.score_team_1
    const s2 = row.score_team_2
    for (const [tid, score, oppScore] of [
      [row.team_1_id, s1, s2],
      [row.team_2_id, s2, s1],
    ] as [string, number, number][]) {
      if (!statsMap.has(tid)) statsMap.set(tid, { wins: 0, draws: 0, losses: 0 })
      const s = statsMap.get(tid)!
      if (score > oppScore) s.wins++
      else if (score < oppScore) s.losses++
      else s.draws++
    }
  }

  const active = teams?.filter(t => t.is_active) ?? []
  const inactive = teams?.filter(t => !t.is_active) ?? []

  return (
    <div className="fade-in-up">
      <div className="mb-8">
        <p className="section-label mb-2">Tier 1 Scene</p>
        <h1 className="text-3xl font-black tracking-tight mb-1">Dota 2 Teams</h1>
        <p className="text-sm text-muted-foreground">{active.length} active teams · ELO base 1500</p>
      </div>

      {!teams?.length ? (
        <div className="rounded-2xl p-10 text-center border border-border/60 bg-card/60">
          <p className="text-4xl mb-3">🛡️</p>
          <p className="font-semibold mb-1">No teams yet</p>
          <p className="text-sm text-muted-foreground">Add teams via the admin panel.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
            {active.map((team, idx) => {
              const s = statsMap.get(team.id)
              const elo = team.current_elo ?? 1500
              const diff = elo - 1500
              const total = (s?.wins ?? 0) + (s?.draws ?? 0) + (s?.losses ?? 0)
              const winRate = total > 0 ? Math.round(((s?.wins ?? 0) / total) * 100) : null

              return (
                <Link key={team.id} href={team.slug ? `/teams/${team.slug}` : '#'}>
                  <article className="group rounded-2xl border border-border/60 bg-card/60 overflow-hidden hover:border-primary/40 hover:bg-card/80 transition-all duration-300 hover:-translate-y-1">
                    {/* Logo area */}
                    <div className="relative h-40 bg-secondary/60 flex items-center justify-center overflow-hidden">
                      {team.banner_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={team.banner_url}
                          alt={team.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-30"
                        />
                      ) : null}
                      {team.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="relative w-20 h-20 object-contain transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <span className="font-display text-4xl font-black text-muted-foreground/30">
                          {team.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      {/* Rank badge */}
                      <span className="absolute top-3 left-3 font-display text-xs font-black px-2 py-0.5 rounded-full border border-border/60 bg-background/70 text-muted-foreground tabular-nums">
                        #{idx + 1}
                      </span>
                      {/* ELO diff badge */}
                      <span
                        className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full border"
                        style={diff >= 0
                          ? { color: 'hsl(var(--success))', background: 'hsl(var(--success) / 0.1)', borderColor: 'hsl(var(--success) / 0.25)' }
                          : { color: 'hsl(var(--destructive))', background: 'hsl(var(--destructive) / 0.1)', borderColor: 'hsl(var(--destructive) / 0.25)' }
                        }
                      >
                        {diff >= 0 ? '+' : ''}{diff}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h3 className="font-display text-base font-bold text-foreground leading-tight">{team.name}</h3>
                      </div>
                      {team.region && (
                        <p className="text-xs text-muted-foreground mb-3">
                          {REGION_FLAG[team.region] ?? '🌐'} {team.region}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xl font-black tabular-nums text-foreground">{elo}</span>
                        {winRate !== null && (
                          <span className="text-xs text-muted-foreground">
                            <span className="text-success font-bold">{s?.wins}W</span>
                            {(s?.draws ?? 0) > 0 && <><span> · </span><span className="font-bold" style={{ color: '#f59e0b' }}>{s?.draws}D</span></>}
                            {' · '}
                            <span className="text-destructive font-bold">{s?.losses}L</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>

          {/* Inactive */}
          {inactive.length > 0 && (
            <div>
              <p className="section-label mb-4">Inactive / Disbanded</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 opacity-50">
                {inactive.map(team => (
                  <div key={team.id} className="rounded-xl border border-border/40 bg-card/30 p-3 flex items-center gap-3">
                    {team.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={team.logo_url} alt={team.name} className="w-7 h-7 object-contain shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{team.name}</p>
                      {team.region && <p className="text-xs text-muted-foreground truncate">{team.region}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
