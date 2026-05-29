import Link from 'next/link'
import { fetchUpcomingTier1Matches, fetchRunningTier1Matches } from '@/lib/pandascore'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'
import { createAdminClient } from '@/lib/supabase/admin'

interface Props {
  teamName: string
  label?: string
}

export default async function LiveUpcomingMatches({ teamName, label = 'Upcoming Matches' }: Props) {
  const [psUpcoming, psRunning] = await Promise.all([
    fetchUpcomingTier1Matches(100).catch(() => []),
    fetchRunningTier1Matches(50).catch(() => []),
  ])

  const teamNameLower = teamName.toLowerCase()
  const matches = [...psRunning, ...psUpcoming].filter(m =>
    m.opponents.some(o => {
      const ps = o.opponent.name.toLowerCase()
      return ps === teamNameLower || ps.startsWith(teamNameLower + ' ') || teamNameLower.startsWith(ps + ' ')
    })
  )

  if (matches.length === 0) return null

  const supabase = createAdminClient()
  const { data: psTeamRows } = await supabase
    .from('teams').select('pandascore_team_id, slug')
    .not('pandascore_team_id', 'is', null).not('slug', 'is', null)
  const psTeamSlugMap = new Map<number, string>(
    (psTeamRows ?? []).map(t => [t.pandascore_team_id as number, t.slug as string])
  )
  const resolveTeamLink = (psId: number | undefined, psName: string) =>
    (psId && psTeamSlugMap.get(psId)) ?? psName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  return (
    <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
      <p className="section-label mb-3">{label}</p>
      <div className="grid gap-2">
        {matches.map(m => {
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {tA?.image_url && <img loading="lazy" src={tA.image_url} alt={tA.name} className="w-5 h-5 object-contain shrink-0" />}
                  <Link href={`/teams/${resolveTeamLink(tA?.id, tA?.name ?? '')}`} className="hover:text-primary transition-colors">{tA?.name ?? 'TBD'}</Link>
                  <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'hsl(var(--muted))' }}>VS</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
  )
}
