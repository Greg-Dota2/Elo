import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 60

const MEDAL = ['🥇', '🥈', '🥉']
const MEDAL_COLOR = ['var(--gold)', 'var(--silver)', 'var(--bronze)']
const MEDAL_BG = ['var(--gold-dim)', 'var(--silver-dim)', 'var(--bronze-dim)']
const MEDAL_BORDER = ['var(--gold-border)', 'var(--silver-border)', 'var(--bronze-border)']

export default async function RankingsPage() {
  const supabase = createAdminClient()

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, region, logo_url, current_elo, slug')
    .eq('is_active', true)
    .not('current_elo', 'is', null)
    .order('current_elo', { ascending: false })

  const topElo = teams?.[0]?.current_elo ?? 1500
  const bottomElo = teams?.[teams.length - 1]?.current_elo ?? 1500

  return (
    <div className="fade-in-up">
      {/* Page header */}
      <div className="mb-8">
        <p className="section-label mb-2">Dota 2 Tier 1</p>
        <h1 className="text-3xl font-black tracking-tight mb-1">ELO Rankings</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Updated after every series result
        </p>
      </div>

      {!teams?.length ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold mb-1">No ELO data yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Import a tournament and recalculate to generate ratings.
          </p>
        </div>
      ) : (
        <>
          {/* ── Top 3 podium ── */}
          {teams.length >= 1 && (
            <div className="grid gap-3 md:grid-cols-3 mb-6">
              {teams.slice(0, Math.min(3, teams.length)).map((team, i) => {
                const elo = team.current_elo ?? 1500
                const diff = elo - 1500
                return (
                  <Link
                    key={team.id}
                    href={team.slug ? `/teams/${team.slug}` : '#'}
                    className="rounded-2xl p-5 relative overflow-hidden fade-in-up block hover:brightness-110 transition-all"
                    style={{
                      background: MEDAL_BG[i],
                      border: `1px solid ${MEDAL_BORDER[i]}`,
                      boxShadow: `var(--shadow-md), 0 0 0 1px ${MEDAL_BG[i]}`,
                      animationDelay: `${i * 0.06}s`,
                    }}
                  >
                    {/* Rank badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl">{MEDAL[i]}</span>
                      <span
                        className="text-xs font-black px-2.5 py-1 rounded-full"
                        style={{
                          background: MEDAL_BG[i],
                          color: MEDAL_COLOR[i],
                          border: `1px solid ${MEDAL_BORDER[i]}`,
                        }}
                      >
                        #{i + 1}
                      </span>
                    </div>

                    {/* Logo + name */}
                    <div className="flex items-center gap-3 mb-4">
                      {team.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-10 h-10 object-contain rounded-lg shrink-0"
                          style={{ background: 'rgba(255,255,255,0.04)' }}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                          style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                        >
                          {team.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{team.name}</div>
                        {team.region && (
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {team.region}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ELO */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div
                          className="text-3xl font-black tabular-nums leading-none"
                          style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: MEDAL_COLOR[i] }}
                        >
                          {elo}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          ELO rating
                        </div>
                      </div>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: diff >= 0 ? 'var(--correct)' : 'var(--wrong)' }}
                      >
                        {diff >= 0 ? '+' : ''}{diff}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* ── Rest of rankings ── */}
          {teams.length > 3 && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              {teams.slice(3).map((team, idx) => {
                const i = idx + 3
                const elo = team.current_elo ?? 1500
                const barPct = ((elo - bottomElo) / Math.max(topElo - bottomElo, 1)) * 100
                const diff = elo - 1500

                return (
                  <Link
                    key={team.id}
                    href={team.slug ? `/teams/${team.slug}` : '#'}
                    className="flex items-center gap-4 px-4 py-3 relative overflow-hidden transition-colors duration-150 hover:bg-primary/5"
                    style={{
                      background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                    }}
                  >
                    {/* Background bar */}
                    <div
                      className="absolute left-0 top-0 h-full opacity-[0.06] transition-all"
                      style={{
                        width: `${Math.max(barPct, 4)}%`,
                        background: 'var(--accent)',
                      }}
                    />

                    {/* Rank */}
                    <span
                      className="text-xs font-bold w-7 text-center shrink-0 tabular-nums relative"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      #{i + 1}
                    </span>

                    {/* Logo */}
                    {team.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-7 h-7 object-contain rounded shrink-0 relative"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 relative"
                        style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                      >
                        {team.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Name + region */}
                    <div className="flex-1 min-w-0 relative">
                      <div className="font-semibold text-sm">{team.name}</div>
                      {team.region && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {team.region}
                        </div>
                      )}
                    </div>

                    {/* ELO + diff */}
                    <div className="text-right relative shrink-0">
                      <div className="text-base font-bold tabular-nums" style={{ fontFamily: 'var(--font-oxanium), sans-serif' }}>{elo}</div>
                      <div
                        className="text-xs font-medium tabular-nums"
                        style={{ color: diff >= 0 ? 'var(--correct)' : 'var(--wrong)' }}
                      >
                        {diff >= 0 ? '+' : ''}{diff}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
