'use client'

import { useState } from 'react'
import Link from 'next/link'

const REGION_FLAG: Record<string, string> = {
  'Western Europe': '🇪🇺',
  'Eastern Europe': '🌍',
  'China': '🇨🇳',
  'Southeast Asia': '🌏',
  'North America': '🇺🇸',
  'South America': '🌎',
  'CIS': '🌍',
}

type Team = {
  id: string
  name: string
  short_name: string | null
  region: string | null
  logo_url: string | null
  banner_url: string | null
  current_elo: number | null
  is_active: boolean
  slug: string | null
}

type Stats = { wins: number; draws: number; losses: number }

interface Props {
  active: Team[]
  inactive: Team[]
  statsMap: Record<string, Stats>
}

export default function TeamsClient({ active, inactive, statsMap }: Props) {
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()

  const filteredActive = active.filter(t =>
    !q || t.name.toLowerCase().includes(q) || (t.region ?? '').toLowerCase().includes(q)
  )
  const filteredInactive = inactive.filter(t =>
    !q || t.name.toLowerCase().includes(q) || (t.region ?? '').toLowerCase().includes(q)
  )

  return (
    <>
      {/* Stat strip */}
      <div className="flex items-center gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span className="text-sm font-bold text-primary tabular-nums">{active.length}</span>
          <span className="text-sm text-muted-foreground">active teams</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-400/25 bg-amber-400/8">
          <span className="text-sm font-bold text-amber-400">1500</span>
          <span className="text-sm text-muted-foreground">ELO baseline</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teams or regions…"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-secondary/60 border border-border/60 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-secondary/80 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Active teams grid */}
      {filteredActive.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
          {filteredActive.map((team, idx) => {
            const s = statsMap[team.id]
            const elo = team.current_elo ?? 1500
            const diff = elo - 1500
            const total = (s?.wins ?? 0) + (s?.draws ?? 0) + (s?.losses ?? 0)
            const winRate = total > 0 ? Math.round(((s?.wins ?? 0) / total) * 100) : null

            return (
              <Link key={team.id} href={team.slug ? `/teams/${team.slug}` : '#'}>
                <article className="group rounded-2xl border border-border/60 bg-card/60 overflow-hidden hover:border-primary/40 hover:bg-card/80 transition-all duration-300 hover:-translate-y-1">
                  <div className="relative h-40 bg-secondary/60 flex items-center justify-center overflow-hidden">
                    {team.banner_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.banner_url} alt={team.name} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    )}
                    {team.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.logo_url} alt={team.name} className="relative w-20 h-20 object-contain transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <span className="font-display text-4xl font-black text-muted-foreground/30">{team.name.slice(0, 2).toUpperCase()}</span>
                    )}
                    <span className="absolute top-3 left-3 font-display text-xs font-black px-2 py-0.5 rounded-full border border-border/60 bg-background/70 text-muted-foreground tabular-nums">
                      #{idx + 1}
                    </span>
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
                  <div className="p-4">
                    <h3 className="font-display text-base font-bold text-foreground leading-tight mb-1">{team.name}</h3>
                    {team.region && (
                      <p className="text-xs text-muted-foreground mb-3">{REGION_FLAG[team.region] ?? '🌐'} {team.region}</p>
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
      )}

      {filteredActive.length === 0 && filteredInactive.length === 0 && (
        <div className="rounded-2xl p-12 text-center border border-border/60 bg-card/40">
          <p className="font-semibold mb-1">No teams found</p>
          <p className="text-sm text-muted-foreground">Try a different search term.</p>
        </div>
      )}

      {/* Inactive */}
      {filteredInactive.length > 0 && (
        <div>
          <p className="section-label mb-4">Inactive / Disbanded</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 opacity-50">
            {filteredInactive.map(team => (
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
  )
}
