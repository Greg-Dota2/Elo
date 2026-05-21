import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlayers } from '@/lib/queries'
import type { PrizePlacement } from '@/lib/types'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Dota 2 Player Rankings — Tournament Performance Score',
  description: 'Pro player rankings by competitive performance across Tier 1 Dota 2 tournaments — placement points, prize earnings, and EPT combined.',
  alternates: { canonical: '/players/rankings', languages: { 'x-default': '/players/rankings', 'en': '/players/rankings', 'ru': '/ru/players/rankings' } },
  openGraph: { title: 'Dota 2 Player Rankings — Tournament Performance', description: 'Pro player rankings by competitive performance across Tier 1 Dota 2 tournaments.', url: '/players/rankings' },
}

const POSITION_LABEL: Record<number, string> = { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Sup', 5: 'Hard Sup' }
const POSITION_COLOR: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  2: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  3: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  4: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  5: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
}

function parsePlaceNum(place: string): number {
  const n = parseInt(place.replace(/[^0-9-]/g, '').split('-')[0])
  return isNaN(n) ? 99 : n
}

function placementPoints(place: string): number {
  const n = parsePlaceNum(place)
  if (n === 1)  return 100
  if (n === 2)  return 75
  if (n <= 4)   return 50
  if (n <= 6)   return 30
  if (n <= 8)   return 15
  if (n <= 12)  return 8
  if (n <= 16)  return 4
  return 2
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

function bestPlaceStyle(place: string): string {
  const n = parsePlaceNum(place)
  if (n === 1) return 'text-amber-400 font-black'
  if (n === 2) return 'text-slate-300 font-bold'
  if (n <= 4)  return 'text-orange-400/90 font-bold'
  return 'text-muted-foreground font-semibold'
}

export default async function PlayerRankingsPage() {
  const supabase = createAdminClient()

  const [players, { data: tournaments }, { data: teamEptRows }] = await Promise.all([
    getPlayers(),
    supabase
      .from('tournaments')
      .select('id, name, slug, prize_distribution, start_date')
      .eq('is_published', true)
      .not('prize_distribution', 'is', null),
    supabase
      .from('teams')
      .select('id, ept_points'),
  ])

  const teamEptMap = new Map<string, number>(
    (teamEptRows ?? []).map(r => [r.id, r.ept_points ?? 0])
  )

  type RankedPlayer = {
    player: (typeof players)[number]
    totalScore: number
    totalPrize: number
    totalEpt: number
    bestPlace: number
    bestPlaceStr: string
    tournamentCount: number
  }

  const ranked: RankedPlayer[] = []

  for (const player of players) {
    if (!player.team) continue

    const teamName = player.team.name
    const totalEpt = teamEptMap.get(player.team.id) ?? 0
    let totalScore = 0
    let totalPrize = 0
    let bestPlace = 999
    let bestPlaceStr = ''
    let tournamentCount = 0

    for (const t of tournaments ?? []) {
      const entry = (t.prize_distribution as PrizePlacement[]).find(p => p.team === teamName)
      if (!entry) continue

      const placeNum = parsePlaceNum(entry.place)
      const prizeWeight = entry.prize_usd ? entry.prize_usd / 10000 : 1
      totalScore += Math.round(placementPoints(entry.place) * prizeWeight)
      totalPrize += entry.prize_usd ?? 0
      tournamentCount++

      if (placeNum < bestPlace) {
        bestPlace = placeNum
        bestPlaceStr = entry.place
      }
    }

    if (totalEpt === 0 && tournamentCount === 0) continue
    ranked.push({ player, totalScore, totalPrize, totalEpt, bestPlace, bestPlaceStr, tournamentCount })
  }

  ranked.sort((a, b) => {
    if (b.totalEpt !== a.totalEpt) return b.totalEpt - a.totalEpt
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    if (b.totalPrize !== a.totalPrize) return b.totalPrize - a.totalPrize
    return (a.player.position ?? 99) - (b.player.position ?? 99)
  })

  const totalDistributed = ranked.reduce((s, r) => s + r.totalPrize, 0)

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-2">Tier 1 Scene</p>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <h1 className="text-3xl font-black tracking-tight">Player Rankings</h1>
          <Link
            href="/players"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/60 text-muted-foreground text-sm font-semibold hover:text-foreground hover:border-border transition-colors shrink-0"
          >
            ← All Players
          </Link>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Rankings are driven by three factors in order of importance: <span className="text-primary font-semibold">EPT points</span> come
          first — they are only awarded at the most prestigious circuit events, so they carry the most
          weight. Next is a <span className="text-foreground font-semibold">placement score</span> — each
          tournament finish earns points (1st = 100, 2nd = 75, 3rd/4th = 50…) multiplied by the prize money
          won, so a final at a $1M event outranks a final at a $175K event. <span className="text-amber-400 font-semibold">Prize earnings</span> break
          any remaining ties. Players on the same team always appear carry → mid → offlane → support.
        </p>
      </div>

      {/* Stat strip */}
      <div className="flex items-center gap-3 flex-wrap mb-8">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/10">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span className="text-sm font-bold text-primary tabular-nums">{ranked.length}</span>
          <span className="text-sm text-muted-foreground">players ranked</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-400/25 bg-amber-400/10">
          <span className="text-sm font-bold text-amber-400 tabular-nums">{fmtUsd(totalDistributed)}</span>
          <span className="text-sm text-muted-foreground">total distributed</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-secondary/40">
          <span className="text-sm font-bold text-foreground tabular-nums">{tournaments?.length ?? 0}</span>
          <span className="text-sm text-muted-foreground">tournaments tracked</span>
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="rounded-2xl p-12 text-center border border-border/60 bg-card/40">
          <p className="font-semibold mb-1">No rankings yet</p>
          <p className="text-sm text-muted-foreground">Add tournament prize distributions to generate rankings.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/40">
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-3 w-14">#</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">Player</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-3 hidden md:table-cell">Team</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-3 hidden lg:table-cell">Role</th>
                  <th className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">Score</th>
                  <th className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-3 hidden sm:table-cell">Earnings</th>
                  <th className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-3 hidden sm:table-cell">EPT</th>
                  <th className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-3 hidden sm:table-cell">Best Finish</th>
                  <th className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-3 hidden lg:table-cell">Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {ranked.map(({ player, totalScore, totalPrize, totalEpt, bestPlaceStr, tournamentCount }, i) => {
                  const rank = i + 1
                  const posColor = player.position ? POSITION_COLOR[player.position] : 'text-muted-foreground bg-muted/50 border-border'
                  return (
                    <tr key={player.id} className="hover:bg-secondary/30 transition-colors group">

                      {/* Rank */}
                      <td className="px-4 py-3.5 w-14">
                        {rank <= 3 ? (
                          <span className="text-xl leading-none">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
                        ) : (
                          <span className="font-display text-sm font-bold text-muted-foreground tabular-nums">#{rank}</span>
                        )}
                      </td>

                      {/* Player */}
                      <td className="px-4 py-3.5">
                        <Link href={`/players/${player.slug}`} className="flex items-center gap-3">
                          {player.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={player.photo_url}
                              alt={player.ign}
                              className="w-9 h-9 rounded-full object-cover object-top shrink-0 border border-border/60"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center shrink-0 border border-border/60">
                              <span className="text-xs font-black text-muted-foreground">{player.ign.slice(0, 2).toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">{player.ign}</p>
                            {player.full_name && <p className="text-xs text-muted-foreground leading-tight mt-0.5">{player.full_name}</p>}
                          </div>
                        </Link>
                      </td>

                      {/* Team */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {player.team && (
                          <Link
                            href={player.team.slug ? `/teams/${player.team.slug}` : '#'}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            {player.team.logo_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={player.team.logo_url} alt={player.team.name} className="w-5 h-5 object-contain shrink-0" />
                            )}
                            <span className="text-sm font-semibold text-muted-foreground">{player.team.name}</span>
                          </Link>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {player.position && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${posColor}`}>
                            {POSITION_LABEL[player.position]}
                          </span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-display text-base font-black text-foreground tabular-nums">{totalScore}</span>
                        <span className="text-xs text-muted-foreground ml-1">pts</span>
                      </td>

                      {/* Earnings */}
                      <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                        <span className="text-sm font-bold text-amber-400 tabular-nums">{fmtUsd(totalPrize)}</span>
                      </td>

                      {/* EPT */}
                      <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                        {totalEpt > 0 ? (
                          <span className="text-sm font-bold text-primary tabular-nums">{totalEpt.toLocaleString()}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Best finish */}
                      <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                        {bestPlaceStr ? (
                          <span className={`text-sm ${bestPlaceStyle(bestPlaceStr)}`}>{bestPlaceStr}</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Events */}
                      <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                        <span className="text-sm font-semibold text-muted-foreground tabular-nums">{tournamentCount}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
