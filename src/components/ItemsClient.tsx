'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { itemIconUrl, type ItemData } from '@/lib/items'

const CATEGORIES = {
  en: [
    { key: 'all',         label: 'All' },
    { key: 'upgrade',     label: 'Upgrades' },
    { key: 'basic',       label: 'Basic' },
    { key: 'neutral',     label: 'Artifacts' },
    { key: 'enchantment', label: 'Enchantments' },
    { key: 'consumable',  label: 'Consumables' },
  ],
  ru: [
    { key: 'all',         label: 'Все' },
    { key: 'upgrade',     label: 'Улучшения' },
    { key: 'basic',       label: 'Базовые' },
    { key: 'neutral',     label: 'Артефакты' },
    { key: 'enchantment', label: 'Чары' },
    { key: 'consumable',  label: 'Расходники' },
  ],
}

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
  enchantment: {
    inactive: 'text-violet-400/80 bg-violet-400/10 border-violet-400/30 hover:text-violet-400 hover:bg-violet-400/15 hover:border-violet-400/50',
    active:   'text-violet-400 bg-violet-400/20 border-violet-400/50',
  },
}

const CATEGORY_ORDER: Record<string, number> = { upgrade: 0, basic: 1, neutral: 2, enchantment: 3, consumable: 4 }

// Function-based color buckets — classify each item by its dominant stat bonuses
// so the grid is varied AND meaningful (red = damage, green = tanky, etc.)
const FUNCTION_HEX: Record<string, string> = {
  damage: '#f87171', durability: '#4ade80', magic: '#60a5fa', mobility: '#2dd4bf', utility: '#c084fc',
}
const FUNC_PATTERNS: { fn: string; re: RegExp }[] = [
  { fn: 'damage',     re: /attack_damage|bonus_damage|^damage$|crit_|cleave|lifesteal|attack_speed|aspd/ },
  { fn: 'durability', re: /armor|health|^hp|hp_regen|health_regen|strength|^str$|bonus_str|evasion|magic_res|status_res|barrier|damage_block/ },
  { fn: 'magic',      re: /mana|intellect|intelligence|^int$|bonus_int|spell_amp|spell_damage|spell_lifesteal|cast_range|cooldown_reduction/ },
  { fn: 'mobility',   re: /agility|^agi$|bonus_agi|move_?speed|movement|attack_range/ },
]
function classifyItem(item: ItemData): string {
  const scores: Record<string, number> = {}
  for (const a of item.attrib ?? []) {
    const k = (a.key || '').toLowerCase()
    for (const { fn, re } of FUNC_PATTERNS) if (re.test(k)) scores[fn] = (scores[fn] ?? 0) + 1
  }
  let best = 'utility', bestScore = 0
  for (const { fn } of FUNC_PATTERNS) if ((scores[fn] ?? 0) > bestScore) { best = fn; bestScore = scores[fn] }
  return best
}

const L = {
  en: {
    search: 'Search items…',
    count: (n: number, total: number, q: string) =>
      `${n}${n !== total ? ` of ${total}` : ''} items${q ? ` matching "${q}"` : ''}`,
    noItems: 'No items found.',
  },
  ru: {
    search: 'Поиск предмета…',
    count: (n: number, total: number, q: string) =>
      `${n}${n !== total ? ` из ${total}` : ''} предметов${q ? ` по запросу «${q}»` : ''}`,
    noItems: 'Предметы не найдены.',
  },
}

export default function ItemsClient({ items: allItems, locale = 'en' }: { items: ItemData[]; locale?: string }) {
  const prefix = locale === 'ru' ? '/ru' : ''
  const t = locale === 'ru' ? L.ru : L.en
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
    all:         allItems.length,
    upgrade:     allItems.filter(i => i.category === 'upgrade').length,
    basic:       allItems.filter(i => i.category === 'basic').length,
    neutral:     allItems.filter(i => i.category === 'neutral').length,
    enchantment: allItems.filter(i => i.category === 'enchantment').length,
    consumable:  allItems.filter(i => i.category === 'consumable').length,
  }

  const setCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cat === 'all') params.delete('cat')
    else params.set('cat', cat)
    router.push(`${prefix}/items${params.toString() ? '?' + params.toString() : ''}`)
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
          placeholder={t.search}
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
        {CATEGORIES[locale === 'ru' ? 'ru' : 'en'].map(({ key, label }) => {
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
        {t.count(filtered.length, allItems.length, search)}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center border border-border/60 bg-card/60">
          <p className="text-muted-foreground text-sm">{t.noItems}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {filtered.map(item => {
            const hex = FUNCTION_HEX[classifyItem(item)]
            return (
            <Link
              key={item.key}
              href={`${prefix}/items/${item.key}`}
              className="group relative rounded-xl border border-border/50 bg-card/60 overflow-hidden transition-all duration-200 hover:-translate-y-1"
              title={item.dname}
            >
              <div className="relative aspect-[88/64] bg-secondary/40 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={itemIconUrl(item.key)} alt={item.dname} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                {/* depth scrim */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(8,10,14,0.6), transparent)' }} />
              </div>
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-semibold leading-tight text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">{item.dname}</p>
                {item.cost > 0 && (
                  <p className="text-[10px] font-bold text-amber-400 tabular-nums">{item.cost.toLocaleString('en-US')} g</p>
                )}
              </div>
              {/* category accent bar */}
              {hex && <div className="h-[3px] w-full" style={{ background: hex, opacity: 0.6 }} />}
              {/* hover glow + ring in category color */}
              {hex && <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${hex}, 0 0 16px ${hex}40` }} />}
            </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
