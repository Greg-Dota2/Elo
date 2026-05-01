'use client'

import { useState } from 'react'
import Link from 'next/link'
import { itemIconUrl } from '@/lib/items'

export interface UpgradeItemStat {
  key: string
  dname: string
  cost: number
  winRate: number
  games: number
  peakTiming: number
}

export interface NeutralItemEntry {
  key: string
  dname: string
  tier: number
  attrib: { key: string; value: string; display?: string }[]
  cd: number | false
  games: number | null
  winRate: number | null
}

type SortKey = 'winRate' | 'games' | 'cost' | 'peakTiming'
type NeutralSortKey = 'winRate' | 'games' | 'tier'

const TIER_COLOR: Record<number, string> = {
  1: 'text-slate-400 border-slate-400/30 bg-slate-400/10',
  2: 'text-green-400 border-green-400/30 bg-green-400/10',
  3: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  4: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  5: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
}

const TIER_DROP: Record<number, string> = {
  1: '0–15 min', 2: '15–25 min', 3: '25–40 min', 4: '40–60 min', 5: '60+ min',
}

function winRateColor(wr: number) {
  if (wr >= 57) return 'text-emerald-400'
  if (wr >= 53) return 'text-emerald-400/80'
  if (wr >= 50) return 'text-foreground'
  if (wr >= 47) return 'text-red-400/70'
  return 'text-red-400'
}

function formatTiming(seconds: number) {
  return `~${Math.round(seconds / 60)}m`
}

function SpotlightCard({ item, label, stat, statColor, accent, href }: {
  item: { key: string; dname: string }
  label: string
  stat: string
  statColor: string
  accent: string
  href: string
}) {
  return (
    <Link href={href} className="group relative rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/40 transition-all duration-200 flex flex-col">
      <div className={`h-[3px] w-full ${accent}`} />
      <div className="relative h-28 overflow-hidden flex items-center justify-center bg-secondary/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemIconUrl(item.key)} alt="" className="absolute inset-0 w-full h-full object-cover scale-150 blur-md opacity-30" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemIconUrl(item.key)} alt={item.dname} className="relative w-24 h-16 object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/50 text-white/70 backdrop-blur-sm">
          {label}
        </span>
      </div>
      <div className="px-3 py-2.5">
        <p className="font-bold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">{item.dname}</p>
        <p className={`font-mono font-black text-xl mt-0.5 ${statColor}`}>{stat}</p>
      </div>
    </Link>
  )
}

export default function ItemMetaClient({
  upgradeItems,
  neutralItems,
  updatedAt,
}: {
  upgradeItems: UpgradeItemStat[]
  neutralItems: NeutralItemEntry[]
  updatedAt: string
}) {
  const [tab, setTab] = useState<'upgrades' | 'neutral'>('upgrades')
  const [sort, setSort] = useState<SortKey>('winRate')
  const [asc, setAsc] = useState(false)
  const [neutralSort, setNeutralSort] = useState<NeutralSortKey>('winRate')
  const [neutralAsc, setNeutralAsc] = useState(false)
  const [search, setSearch] = useState('')
  const [minGames, setMinGames] = useState(500)

  // Upgrade spotlights
  const topWR     = upgradeItems[0]
  const mostBought = [...upgradeItems].sort((a, b) => b.games - a.games)[0]
  const bestBudget = [...upgradeItems].filter(i => i.cost <= 2500).sort((a, b) => b.winRate - a.winRate)[0]
  const bestLate   = [...upgradeItems].filter(i => i.cost >= 4000).sort((a, b) => b.winRate - a.winRate)[0]

  // Neutral spotlights
  const topNeutralWR  = [...neutralItems].filter(n => n.winRate !== null).sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0]
  const topNeutralT5  = neutralItems.filter(n => n.tier === 5 && n.winRate !== null).sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0]
  const topNeutralT1  = neutralItems.filter(n => n.tier === 1 && n.winRate !== null).sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0]
  const mostUsedNeutral = [...neutralItems].filter(n => n.games !== null).sort((a, b) => (b.games ?? 0) - (a.games ?? 0))[0]

  const filtered = upgradeItems
    .filter(i => i.games >= minGames)
    .filter(i => !search || i.dname.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const diff = a[sort] - b[sort]
      return asc ? diff : -diff
    })

  const filteredNeutral = [...neutralItems].sort((a, b) => {
    if (neutralSort === 'winRate') {
      const diff = (a.winRate ?? -1) - (b.winRate ?? -1)
      return neutralAsc ? diff : -diff
    }
    if (neutralSort === 'games') {
      const diff = (a.games ?? -1) - (b.games ?? -1)
      return neutralAsc ? diff : -diff
    }
    // tier
    const diff = a.tier - b.tier
    return neutralAsc ? diff : -diff
  })

  function handleSort(key: SortKey) {
    if (sort === key) setAsc(v => !v)
    else { setSort(key); setAsc(false) }
  }

  function handleNeutralSort(key: NeutralSortKey) {
    if (neutralSort === key) setNeutralAsc(v => !v)
    else { setNeutralSort(key); setNeutralAsc(false) }
  }

  function SortTh({ col, children }: { col: SortKey; children: React.ReactNode }) {
    const active = sort === col
    return (
      <th onClick={() => handleSort(col)} className={['px-4 py-3 text-right text-xs font-semibold cursor-pointer select-none whitespace-nowrap transition-colors', active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'].join(' ')}>
        {children}{active ? (asc ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  function NeutralSortTh({ col, children }: { col: NeutralSortKey; children: React.ReactNode }) {
    const active = neutralSort === col
    return (
      <th onClick={() => handleNeutralSort(col)} className={['px-4 py-3 text-right text-xs font-semibold cursor-pointer select-none whitespace-nowrap transition-colors', active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'].join(' ')}>
        {children}{active ? (neutralAsc ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden mb-8 px-6 py-7 border border-border/40 bg-card/60">
        <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full blur-3xl opacity-20" style={{ background: 'hsl(var(--primary))' }} />

        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="section-label mb-2">Dota 2</p>
            <h1 className="text-4xl font-black tracking-tight mb-1">Item Meta</h1>
            <p className="text-sm text-muted-foreground">Upgrade win rates from public matches · neutral items by win rate</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl border border-border/40 bg-[var(--surface)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Live data</p>
              <p className="text-xs font-mono font-semibold">{updatedAt} EET</p>
            </div>
          </div>
        </div>

        <Link
          href="/items"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-[var(--surface)] text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          All Items
        </Link>
      </div>

      {/* Explanation */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        Upgrade win rates come from OpenDota&apos;s match data — aggregated across all heroes and purchase timings.
        An item with a high win rate doesn&apos;t mean it wins games on its own; it means the heroes who build it tend to win more often,
        which reflects both item strength and the situations it&apos;s bought in. Peak timing shows the most common minute window it&apos;s purchased.
        Neutral item win rates are pulled from recent matches where a player held that item and won.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border/40">
        {(['upgrades', 'neutral'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={['px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'].join(' ')}
          >
            {t === 'upgrades' ? `Upgrades (${upgradeItems.length})` : `Neutral Items (${neutralItems.length})`}
          </button>
        ))}
      </div>

      {/* ── UPGRADES TAB ── */}
      {tab === 'upgrades' && (
        <>
          {/* Spotlight cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {topWR     && <SpotlightCard item={topWR}      label="Highest Win Rate" stat={`${topWR.winRate.toFixed(1)}%`}                                            statColor="text-emerald-400" accent="bg-emerald-400" href={`/items/${topWR.key}`} />}
            {mostBought && <SpotlightCard item={mostBought} label="Most Bought"      stat={`${(mostBought.games/1000).toFixed(1)}k games`}                            statColor="text-sky-400"     accent="bg-sky-400"     href={`/items/${mostBought.key}`} />}
            {bestBudget && <SpotlightCard item={bestBudget} label="Best Budget"      stat={`${bestBudget.winRate.toFixed(1)}% · ${bestBudget.cost.toLocaleString()}g`} statColor="text-emerald-400" accent="bg-violet-400"  href={`/items/${bestBudget.key}`} />}
            {bestLate   && <SpotlightCard item={bestLate}   label="Best Late Game"   stat={`${bestLate.winRate.toFixed(1)}% · ${bestLate.cost.toLocaleString()}g`}    statColor="text-amber-400"   accent="bg-amber-400"   href={`/items/${bestLate.key}`} />}
          </div>

          {/* Controls */}
          <div className="flex gap-3 mb-4 flex-wrap items-center rounded-xl px-4 py-3 border border-border/40 bg-card/40">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="search"
                placeholder="Search item..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="rounded-lg pl-7 pr-3 py-1.5 text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] outline-none focus:ring-1 focus:ring-orange-500 w-44 placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div className="w-px h-5 bg-border/40 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Min games:</span>
              {[100, 500, 1000, 5000].map(n => (
                <button
                  key={n}
                  onClick={() => setMinGames(n)}
                  className={['px-2.5 py-1 rounded-full border text-xs font-semibold transition-all', minGames === n ? 'border-primary/60 bg-primary/15 text-primary' : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'].join(' ')}
                >
                  {n >= 1000 ? `${n/1000}k+` : `${n}+`}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-muted-foreground">{filtered.length} items</span>
          </div>

          <div className="rounded-xl border border-border/40 overflow-hidden bg-card/30">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-card/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Item</th>
                    <SortTh col="cost">Cost</SortTh>
                    <SortTh col="winRate">Win Rate</SortTh>
                    <SortTh col="games">Games</SortTh>
                    <SortTh col="peakTiming">Peak Timing</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <tr key={item.key} className="border-b border-border/20 last:border-0 hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground/40 font-mono text-xs tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/items/${item.key}`} className="flex items-center gap-2.5 group">
                          <div className="w-12 h-9 rounded-md overflow-hidden border border-border/30 flex-shrink-0 group-hover:border-primary/40 transition-colors">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={itemIconUrl(item.key)} alt={item.dname} className="w-full h-full object-cover" />
                          </div>
                          <p className="font-semibold text-xs group-hover:text-primary transition-colors">{item.dname}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-amber-400 tabular-nums">
                        {item.cost.toLocaleString()} g
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-mono font-bold text-sm ${winRateColor(item.winRate)}`}>
                          {item.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {item.games.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {formatTiming(item.peakTiming)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No items found.</p>}
          </div>
          <p className="mt-4 text-xs text-muted-foreground/50 text-center">
            Data from OpenDota · Aggregated across all heroes and purchase timings · Updated daily
          </p>
        </>
      )}

      {/* ── NEUTRAL ITEMS TAB ── */}
      {tab === 'neutral' && (
        <>
          {/* Spotlight cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {topNeutralWR    && <SpotlightCard item={topNeutralWR}    label="Highest Win Rate" stat={`${topNeutralWR.winRate!.toFixed(1)}%`}                          statColor="text-emerald-400" accent="bg-emerald-400" href={`/items/${topNeutralWR.key}`} />}
            {mostUsedNeutral && <SpotlightCard item={mostUsedNeutral} label="Most Equipped"    stat={`${((mostUsedNeutral.games ?? 0)/1000).toFixed(1)}k games`}       statColor="text-sky-400"     accent="bg-sky-400"     href={`/items/${mostUsedNeutral.key}`} />}
            {topNeutralT1    && <SpotlightCard item={topNeutralT1}    label="Best Tier 1"      stat={`${topNeutralT1.winRate!.toFixed(1)}% · ${TIER_DROP[1]}`}         statColor="text-slate-300"   accent="bg-slate-400"   href={`/items/${topNeutralT1.key}`} />}
            {topNeutralT5    && <SpotlightCard item={topNeutralT5}    label="Best Tier 5"      stat={`${topNeutralT5.winRate!.toFixed(1)}% · ${TIER_DROP[5]}`}         statColor="text-amber-400"   accent="bg-amber-400"   href={`/items/${topNeutralT5.key}`} />}
          </div>

          <div className="rounded-xl border border-border/40 overflow-hidden bg-card/30">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-card/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Item</th>
                    <th
                      onClick={() => handleNeutralSort('tier')}
                      className={['px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none whitespace-nowrap transition-colors', neutralSort === 'tier' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'].join(' ')}
                    >
                      Tier{neutralSort === 'tier' ? (neutralAsc ? ' ↑' : ' ↓') : ''}
                    </th>
                    <NeutralSortTh col="winRate">Win Rate</NeutralSortTh>
                    <NeutralSortTh col="games">Games</NeutralSortTh>
                  </tr>
                </thead>
                <tbody>
                  {filteredNeutral.map((item, i) => (
                    <tr key={item.key} className="border-b border-border/20 last:border-0 hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground/40 font-mono text-xs tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/items/${item.key}`} className="flex items-center gap-2.5 group">
                          <div className="w-12 h-9 rounded-md overflow-hidden border border-border/30 flex-shrink-0 group-hover:border-primary/40 transition-colors">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={itemIconUrl(item.key)} alt={item.dname} className="w-full h-full object-cover" />
                          </div>
                          <p className="font-semibold text-xs group-hover:text-primary transition-colors">{item.dname}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${TIER_COLOR[item.tier]}`}>
                          T{item.tier} · {TIER_DROP[item.tier]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {item.winRate !== null
                          ? <span className={`font-mono font-bold text-sm ${winRateColor(item.winRate)}`}>{item.winRate.toFixed(1)}%</span>
                          : <span className="text-muted-foreground/30 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {item.games !== null ? item.games.toLocaleString() : <span className="opacity-30">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground/50 text-center">
            Data from OpenDota · Recent public matches · Win rate = games where player held this neutral item and won
          </p>
        </>
      )}
    </div>
  )
}
