import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 300

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
    .select(`
      id, name, short_name, region, logo_url, liquipedia_url, current_elo, is_active, slug
    `)
    .order('current_elo', { ascending: false })

  // Get match counts per team
  const { data: matchRows } = await supabase
    .from('match_predictions')
    .select('team_1_id, team_2_id, actual_winner_id, is_correct')
    .eq('is_published', true)
    .not('actual_winner_id', 'is', null)

  type MatchRow = { team_1_id: string; team_2_id: string; actual_winner_id: string | null; is_correct: boolean | null }

  const statsMap = new Map<string, { wins: number; losses: number; total: number }>()
  for (const row of (matchRows as MatchRow[]) ?? []) {
    for (const tid of [row.team_1_id, row.team_2_id]) {
      if (!statsMap.has(tid)) statsMap.set(tid, { wins: 0, losses: 0, total: 0 })
      const s = statsMap.get(tid)!
      s.total++
      if (row.actual_winner_id === tid) s.wins++
      else s.losses++
    }
  }

  const active = teams?.filter(t => t.is_active) ?? []
  const inactive = teams?.filter(t => !t.is_active) ?? []

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <p className="section-label mb-2">Tier 1 Scene</p>
        <h1 className="text-3xl font-black tracking-tight mb-1">Dota 2 Teams</h1>
        <p className="text-sm text-muted-foreground">
          {active.length} active teams · ELO base 1500
        </p>
      </div>

      {!teams?.length ? (
        <div className="rounded-2xl p-10 text-center border border-border/60 bg-card/60">
          <p className="text-4xl mb-3">🛡️</p>
          <p className="font-semibold mb-1">No teams yet</p>
          <p className="text-sm text-muted-foreground">Add teams via the admin panel.</p>
        </div>
      ) : (
        <>
          {/* Active teams */}
          <div className="rounded-2xl overflow-hidden border border-border/60 mb-8" style={{ boxShadow: 'var(--shadow-sm)' }}>
            {active.map((team, idx) => {
              const s = statsMap.get(team.id)
              const elo = team.current_elo ?? 1500
              const diff = elo - 1500
              const winRate = s && s.total > 0 ? Math.round((s.wins / s.total) * 100) : null

              return (
                <div
                  key={team.id}
                  className="flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-primary/5"
                  style={{
                    background: idx % 2 === 0 ? 'hsl(var(--card) / 0.6)' : 'hsl(var(--secondary) / 0.25)',
                    borderBottom: idx < active.length - 1 ? '1px solid hsl(var(--border) / 0.5)' : 'none',
                  }}
                >
                  {/* Rank */}
                  <span className="font-display text-sm font-bold w-7 text-center shrink-0 tabular-nums text-muted-foreground">
                    #{idx + 1}
                  </span>

                  {/* Logo */}
                  <div className="w-10 h-10 rounded-xl border border-border/60 bg-secondary/80 flex items-center justify-center shrink-0 overflow-hidden p-1">
                    {team.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-display text-xs font-bold text-muted-foreground">
                        {team.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name + region */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {team.slug ? (
                        <Link href={`/teams/${team.slug}`} className="font-display font-bold text-sm text-foreground truncate hover:text-primary transition-colors">
                          {team.name}
                        </Link>
                      ) : (
                        <span className="font-display font-bold text-sm text-foreground truncate">{team.name}</span>
                      )}
                      {team.short_name && team.short_name !== team.name && (
                        <span className="text-xs text-muted-foreground/60 shrink-0 hidden sm:inline">
                          ({team.short_name})
                        </span>
                      )}
                    </div>
                    {team.region && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs">{REGION_FLAG[team.region] ?? '🌐'}</span>
                        <span className="text-xs text-muted-foreground">{team.region}</span>
                      </div>
                    )}
                  </div>

                  {/* W/L record */}
                  {s && s.total > 0 ? (
                    <div className="hidden sm:flex items-center gap-1 text-xs shrink-0">
                      <span className="text-success font-bold">{s.wins}W</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-destructive font-bold">{s.losses}L</span>
                      {winRate !== null && (
                        <>
                          <span className="text-muted-foreground/40 ml-1">·</span>
                          <span className="text-muted-foreground ml-1">{winRate}%</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="hidden sm:block text-xs text-muted-foreground/40 shrink-0">No data</span>
                  )}

                  {/* ELO */}
                  <div className="text-right shrink-0 ml-4">
                    <div className="font-display font-bold tabular-nums text-base text-foreground">{elo}</div>
                    <div
                      className="text-xs font-medium tabular-nums"
                      style={{ color: diff >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
                    >
                      {diff >= 0 ? '+' : ''}{diff}
                    </div>
                  </div>

                  {/* Liquipedia link */}
                  {team.liquipedia_url && (
                    <a
                      href={team.liquipedia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground/40 hover:text-primary transition-colors shrink-0 ml-2 hidden md:block"
                    >
                      ↗
                    </a>
                  )}
                </div>
              )
            })}
          </div>

          {/* Inactive / disbanded */}
          {inactive.length > 0 && (
            <div>
              <p className="section-label mb-3">Inactive / Disbanded</p>
              <div className="rounded-2xl overflow-hidden border border-border/40 opacity-60">
                {inactive.map((team, idx) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-4 px-5 py-3"
                    style={{
                      background: 'hsl(var(--card) / 0.3)',
                      borderBottom: idx < inactive.length - 1 ? '1px solid hsl(var(--border) / 0.3)' : 'none',
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg border border-border/40 bg-secondary/60 flex items-center justify-center shrink-0">
                      {team.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <span className="font-display text-xs font-bold text-muted-foreground">
                          {team.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{team.name}</span>
                    {team.region && (
                      <span className="text-xs text-muted-foreground/50 ml-auto">{team.region}</span>
                    )}
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
