'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { itemIconUrl, type ItemData } from '@/lib/items'

const CATEGORIES = [
  { key: 'all',        label: 'All' },
  { key: 'upgrade',    label: 'Upgrades' },
  { key: 'basic',      label: 'Basic' },
  { key: 'neutral',    label: 'Neutral' },
  { key: 'consumable', label: 'Consumables' },
]

const CATEGORY_STYLES: Record<string, { inactive: string; active: string }> = {
  all:        {
    inactive: 'text-muted-foreground border-border/60 hover:text-foreground hover:border-border hover:bg-secondary/40',
    active:   'text-foreground bg-secondary border-border',
  },
  upgrade:    {
    inactive: 'text-amber-400/80 bg-amber-400/10 border-amber-400/30 hover:text-amber-400 hover:bg-amber-400/15 hover:border-amber-400/50',
    active:   'text-amber-400 bg-amber-400/20 border-amber-400/50',
  },
  basic:      {
    inactive: 'text-sky-400/80 bg-sky-400/10 border-sky-400/30 hover:text-sky-400 hover:bg-sky-400/15 hover:border-sky-400/50',
    active:   'text-sky-400 bg-sky-400/20 border-sky-400/50',
  },
  neutral:    {
    inactive: 'text-emerald-400/80 bg-emerald-400/10 border-emerald-400/30 hover:text-emerald-400 hover:bg-emerald-400/15 hover:border-emerald-400/50',
    active:   'text-emerald-400 bg-emerald-400/20 border-emerald-400/50',
  },
  consumable: {
    inactive: 'text-rose-400/80 bg-rose-400/10 border-rose-400/30 hover:text-rose-400 hover:bg-rose-400/15 hover:border-rose-400/50',
    active:   'text-rose-400 bg-rose-400/20 border-rose-400/50',
  },
}

const CATEGORY_ORDER: Record<string, number> = { upgrade: 0, basic: 1, neutral: 2, consumable: 3 }

export default function ItemsClient({ items: allItems }: { items: ItemData[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('cat') || 'all'
  const [search, setSearch] = useState('')

  const q = search.toLowerCase()
  const filtered = allItems
    .filter(i => activeCategory === 'all' || i.category === activeCategory)
    .filter(i => !q || i.dname.toLowerCase().includes(q))
    .sort((a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99))

  const counts: Record<string, number> = {
    all:        allItems.length,
    upgrade:    allItems.filter(i => i.category === 'upgrade').length,
    basic:      allItems.filter(i => i.category === 'basic').length,
    neutral:    allItems.filter(i => i.category === 'neutral').length,
    consumable: allItems.filter(i => i.category === 'consumable').length,
  }

  const setCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cat === 'all') params.delete('cat')
    else params.set('cat', cat)
    router.push(`/items${params.toString() ? '?' + params.toString() : ''}`)
  }

  return (
    <>
      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items…"
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

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(({ key, label }) => {
          const isActive = activeCategory === key
          const styles = CATEGORY_STYLES[key]
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${isActive ? styles.active : styles.inactive}`}
            >
              {label}
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-black/20">{counts[key]}</span>
            </button>
          )
        })}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {filtered.length}{filtered.length !== allItems.length ? ` of ${allItems.length}` : ''} items
        {search ? ` matching "${search}"` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center border border-border/60 bg-card/60">
          <p className="text-muted-foreground text-sm">No items found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {filtered.map(item => (
            <Link
              key={item.key}
              href={`/items/${item.key}`}
              className="group relative rounded-xl border border-border/50 bg-card/60 overflow-hidden hover:border-primary/40 hover:bg-card/80 transition-all duration-200"
              title={item.dname}
            >
              <div className="relative aspect-[88/64] bg-secondary/40 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={itemIconUrl(item.key)} alt={item.dname} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-semibold leading-tight text-foreground line-clamp-2 mb-1">{item.dname}</p>
                {item.cost > 0 && (
                  <p className="text-[10px] font-bold text-amber-400 tabular-nums">{item.cost.toLocaleString()} g</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
