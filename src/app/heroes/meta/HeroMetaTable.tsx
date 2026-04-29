'use client'

import { useState } from 'react'
import Link from 'next/link'
import { heroPortraitUrl } from '@/lib/heroes'

export interface HeroMetaEntry {
  id: number
  slug: string
  localized_name: string
  primary_attr: string
  roles: string[]
  winRate: number
  pickRate: number
  winRateDelta: number
  winRateTrend: number[]
  proPick: number
  proBan: number
}

type SortKey = 'winRate' | 'pickRate' | 'winRateDelta' | 'proPick'

const ROLE_STYLE: Record<string, string> = {
  'Carry':     'bg-orange-500/15 text-orange-400 border-orange-500/25',
  'Support':   'bg-sky-500/15 text-sky-400 border-sky-500/25',
  'Nuker':     'bg-red-500/15 text-red-400 border-red-500/25',
  'Disabler':  'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'Durable':   'bg-green-500/15 text-green-400 border-green-500/25',
  'Escape':    'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  'Pusher':    'bg-lime-500/15 text-lime-400 border-lime-500/25',
  'Initiator': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  'Jungler':   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
}

const ATTR_DOT: Record<string, string> = {
  str: 'bg-red-400',
  agi: 'bg-green-400',
  int: 'bg-blue-400',
  all: 'bg-purple-400',
}

function winRateColor(wr: number) {
  if (wr >= 53) return 'text-emerald-400'
  if (wr >= 51) return 'text-emerald-400/70'
  if (wr >= 49) return 'text-foreground'
  if (wr >= 47) return 'text-red-400/70'
  return 'text-red-400'
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <span className="text-muted-foreground/30 text-xs">—</span>
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = (max - min) || 0.5
  const W = 64, H = 22, PAD = 2
  const rising = points[points.length - 1] >= points[0]
  const color = rising ? '#34d399' : '#f87171'
  const coords = points.map((v, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const firstY = PAD + (1 - (points[0] - min) / range) * (H - PAD * 2)
  const lastY  = PAD + (1 - (points[points.length - 1] - min) / range) * (H - PAD * 2)
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <circle cx={PAD} cy={firstY.toFixed(1)} r="1.5" fill={color} opacity="0.5" />
      <circle cx={(W - PAD).toFixed(1)} cy={lastY.toFixed(1)} r="2" fill={color} />
    </svg>
  )
}

function SpotlightCard({ hero, label, stat, statColor }: {
  hero: HeroMetaEntry
  label: string
  stat: string
  statColor: string
}) {
  return (
    <Link href={`/heroes/${hero.slug}`} className="group relative rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/50 transition-all duration-200">
      <div className="relative h-20 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroPortraitUrl(hero.slug)}
          alt={hero.localized_name}
          className="w-full h-full object-cover object-center scale-110 opacity-50 group-hover:opacity-65 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
      </div>
      <div className="px-3 pb-3 -mt-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">{label}</p>
        <p className="font-bold text-sm leading-tight line-clamp-1">{hero.localized_name}</p>
        <p className={`font-mono font-bold text-base mt-0.5 ${statColor}`}>{stat}</p>
      </div>
    </Link>
  )
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'winRate', label: 'Win Rate' },
  { key: 'pickRate', label: 'Pick Rate' },
  { key: 'winRateDelta', label: 'Change' },
  { key: 'proPick', label: 'Pro Picks' },
]

export default function HeroMetaTable({
  heroes,
  updatedAt,
}: {
  heroes: HeroMetaEntry[]
  updatedAt: string
}) {
  const [sort, setSort] = useState<SortKey>('winRate')
  const [asc, setAsc] = useState(false)
  const [search, setSearch] = useState('')
  const [attrFilter, setAttrFilter] = useState('')

  const topWR    = [...heroes].sort((a, b) => b.winRate - a.winRate)[0]
  const topPick  = [...heroes].sort((a, b) => b.pickRate - a.pickRate)[0]
  const topRiser = [...heroes].filter(h => h.winRateDelta > 0).sort((a, b) => b.winRateDelta - a.winRateDelta)[0]
  const topFaller = [...heroes].filter(h => h.winRateDelta < 0).sort((a, b) => a.winRateDelta - b.winRateDelta)[0]

  const filtered = heroes
    .filter(h => !search || h.localized_name.toLowerCase().includes(search.toLowerCase()))
    .filter(h => !attrFilter || h.primary_attr === attrFilter)
    .sort((a, b) => {
      const diff = a[sort] - b[sort]
      return asc ? diff : -diff
    })

  function handleSort(key: SortKey) {
    if (sort === key) setAsc(v => !v)
    else { setSort(key); setAsc(false) }
  }

  function SortTh({ col, children }: { col: SortKey; children: React.ReactNode }) {
    const active = sort === col
    return (
      <th
        onClick={() => handleSort(col)}
        className={[
          'px-4 py-3 text-right text-xs font-semibold cursor-pointer select-none whitespace-nowrap transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
        ].join(' ')}
      >
        {children} {active ? (asc ? '↑' : '↓') : ''}
      </th>
    )
  }

  return (
    <div className="fade-in-up">

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="section-label mb-2">Game Knowledge</p>
            <h1 className="text-3xl font-black tracking-tight mb-1">Hero Meta</h1>
            <p className="text-sm text-muted-foreground">
              Public match win &amp; pick rates across all brackets · {heroes.length} heroes
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Updated</p>
            <p className="text-sm font-mono font-semibold">{updatedAt} EET</p>
          </div>
        </div>
        <Link href="/heroes" className="inline-block mt-3 text-xs text-primary hover:underline">← All Heroes</Link>
      </div>

      {/* Explanation */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-8">
        Win rate and pick rate are pulled from OpenDota once a day — same raw data every analyst uses.
        The sparkline next to each hero shows where their win rate was heading across the last 7 data snapshots:
        green line going up means they&apos;re gaining strength in the current patch, red going down means either a nerf
        landed, the meta shifted, or their counters became popular. The <span className="text-foreground font-medium">Change</span> column
        is the exact win rate difference between the first and last snapshot.
      </p>

      {/* Spotlight cards */}
      {(topWR || topPick || topRiser || topFaller) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {topWR    && <SpotlightCard hero={topWR}    label="Highest Win Rate" stat={`${topWR.winRate.toFixed(1)}%`}            statColor="text-emerald-400" />}
          {topPick  && <SpotlightCard hero={topPick}  label="Most Picked"      stat={`${topPick.pickRate.toFixed(2)}% picks`}   statColor="text-sky-400" />}
          {topRiser && <SpotlightCard hero={topRiser} label="Biggest Riser"    stat={`+${topRiser.winRateDelta.toFixed(2)}%`}   statColor="text-emerald-400" />}
          {topFaller && <SpotlightCard hero={topFaller} label="Biggest Faller" stat={`${topFaller.winRateDelta.toFixed(2)}%`}  statColor="text-red-400" />}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          type="search"
          placeholder="Search hero..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] outline-none focus:ring-1 focus:ring-orange-500 w-44 placeholder:text-[var(--text-muted)]"
        />
        <div className="flex gap-1.5">
          {(['', 'str', 'agi', 'int', 'all'] as const).map(a => (
            <button
              key={a}
              onClick={() => setAttrFilter(a)}
              className={[
                'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                attrFilter === a
                  ? 'border-primary/60 bg-primary/15 text-primary'
                  : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground',
              ].join(' ')}
            >
              {a === '' ? 'All' : a === 'str' ? 'STR' : a === 'agi' ? 'AGI' : a === 'int' ? 'INT' : 'UNI'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} heroes</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 overflow-hidden bg-card/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-card/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Hero</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Roles</th>
                <SortTh col="winRate">Win Rate</SortTh>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Trend</th>
                <SortTh col="winRateDelta">Change</SortTh>
                <SortTh col="pickRate">Pick Rate</SortTh>
                <SortTh col="proPick">Pro Picks</SortTh>
              </tr>
            </thead>
            <tbody>
              {filtered.map((hero, i) => (
                <tr
                  key={hero.id}
                  className="border-b border-border/20 last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-2.5 text-muted-foreground/40 font-mono text-xs tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/heroes/${hero.slug}`} className="flex items-center gap-2.5 group">
                      <div className="relative w-16 h-9 rounded-md overflow-hidden border border-border/30 flex-shrink-0 group-hover:border-primary/40 transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={heroPortraitUrl(hero.slug)} alt={hero.localized_name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ATTR_DOT[hero.primary_attr] ?? 'bg-muted'}`} />
                          <p className="font-semibold text-xs leading-tight group-hover:text-primary transition-colors truncate">
                            {hero.localized_name}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {hero.roles.map(role => (
                        <span
                          key={role}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${ROLE_STYLE[role] ?? 'bg-muted/20 text-muted-foreground border-border/30'}`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-mono font-bold text-sm ${winRateColor(hero.winRate)}`}>
                      {hero.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="inline-flex">
                      <Sparkline points={hero.winRateTrend} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-mono text-xs font-semibold ${
                      hero.winRateDelta > 0 ? 'text-emerald-400' :
                      hero.winRateDelta < 0 ? 'text-red-400' : 'text-muted-foreground/50'
                    }`}>
                      {hero.winRateDelta > 0 ? '+' : ''}{hero.winRateDelta.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {hero.pickRate.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {hero.proPick > 0 ? hero.proPick : <span className="opacity-30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="text-center py-12 text-muted-foreground text-sm">No heroes found.</p>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground/50 text-center">
        Data from OpenDota · Public matches across all skill brackets · Trend = win rate over last 7 periods
      </p>
    </div>
  )
}
