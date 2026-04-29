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
}

type SortKey = 'winRate' | 'games' | 'cost' | 'peakTiming'

const TIER_LABEL: Record<number, string> = {
  1: 'Tier 1 · 0–15 min',
  2: 'Tier 2 · 15–25 min',
  3: 'Tier 3 · 25–40 min',
  4: 'Tier 4 · 40–60 min',
  5: 'Tier 5 · 60+ min',
}

const TIER_COLOR: Record<number, string> = {
  1: 'text-slate-400 border-slate-400/30 bg-slate-400/10',
  2: 'text-green-400 border-green-400/30 bg-green-400/10',
  3: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  4: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  5: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
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
  const [search, setSearch] = useState('')
  const [minGames, setMinGames] = useState(1000)

  const neutralByTier = [1, 2, 3, 4, 5].map(tier => ({
    tier,
    items: neutralItems.filter(n => n.tier === tier),
  }))

  const filtered = upgradeItems
    .filter(i => i.games >= minGames)
    .filter(i => !search || i.dname.toLowerCase().includes(search.toLowerCase()))
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
        {children}{active ? (asc ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-2">Dota 2</p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-1">Item Meta</h1>
            <p className="text-sm text-muted-foreground">
              Upgrade win rates from public matches · neutral items by tier
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Updated</p>
            <p className="text-sm font-mono font-semibold">{updatedAt} EET</p>
          </div>
        </div>
        <Link href="/items" className="inline-block mt-3 text-xs text-primary hover:underline">← All Items</Link>
      </div>

      {/* Explanation */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        Upgrade win rates come from OpenDota&apos;s match data — aggregated across all heroes and purchase timings.
        An item with a high win rate doesn&apos;t mean it wins games on its own; it means the heroes who build it tend to win more often,
        which reflects both item strength and the situations it&apos;s bought in. Peak timing shows the most common minute window it&apos;s purchased.
        Neutral items don&apos;t have win rate data — they&apos;re shown organized by the tier they drop in.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border/40">
        {(['upgrades', 'neutral'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t === 'upgrades' ? `Upgrades (${upgradeItems.length})` : `Neutral Items (${neutralItems.length})`}
          </button>
        ))}
      </div>

      {/* ── UPGRADES TAB ── */}
      {tab === 'upgrades' && (
        <>
          {/* Controls */}
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <input
              type="search"
              placeholder="Search item..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] outline-none focus:ring-1 focus:ring-orange-500 w-44 placeholder:text-[var(--text-muted)]"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Min games:</span>
              {[500, 1000, 5000].map(n => (
                <button
                  key={n}
                  onClick={() => setMinGames(n)}
                  className={[
                    'px-2.5 py-1 rounded-full border text-xs font-semibold transition-all',
                    minGames === n
                      ? 'border-primary/60 bg-primary/15 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground',
                  ].join(' ')}
                >
                  {n.toLocaleString()}+
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} items</span>
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
                          <div className="w-10 h-7 rounded-md overflow-hidden border border-border/30 flex-shrink-0 group-hover:border-primary/40 transition-colors">
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
            {filtered.length === 0 && (
              <p className="text-center py-12 text-muted-foreground text-sm">No items found.</p>
            )}
          </div>

          <p className="mt-4 text-xs text-muted-foreground/50 text-center">
            Data from OpenDota · Aggregated across all heroes and purchase timings · Updated daily
          </p>
        </>
      )}

      {/* ── NEUTRAL ITEMS TAB ── */}
      {tab === 'neutral' && (
        <div className="space-y-8">
          {neutralByTier.map(({ tier, items }) => (
            items.length === 0 ? null :
            <div key={tier}>
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${TIER_COLOR[tier]}`}>
                  T{tier}
                </span>
                <h2 className="text-sm font-bold text-muted-foreground">{TIER_LABEL[tier]}</h2>
                <span className="text-xs text-muted-foreground/50">{items.length} items</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {items.map(item => (
                  <Link
                    key={item.key}
                    href={`/items/${item.key}`}
                    className="group flex items-center gap-2.5 rounded-xl border border-border/40 bg-card/40 px-3 py-2.5 hover:border-primary/40 hover:bg-card/70 transition-all"
                  >
                    <div className="w-9 h-6 rounded overflow-hidden border border-border/30 flex-shrink-0 group-hover:border-primary/40 transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={itemIconUrl(item.key)} alt={item.dname} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {item.dname}
                      </p>
                      {item.cd !== false && item.cd > 0 && (
                        <p className="text-[9px] text-muted-foreground/50 mt-0.5">{item.cd}s cd</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
