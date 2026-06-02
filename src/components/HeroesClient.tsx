'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { heroSlug, heroPortraitUrl, ATTR_CONFIG, type HeroData } from '@/lib/heroes'

const ROLES_RU: Record<string, string> = {
  Carry: 'Керри', Support: 'Саппорт', Nuker: 'Нюкер',
  Disabler: 'Дизейблер', Durable: 'Живучий', Escape: 'Бегство',
  Pusher: 'Пушер', Initiator: 'Инициатор', Jungler: 'Джанглер',
}
const ATTACK_RU: Record<string, string> = { Melee: 'Ближний', Ranged: 'Дальний' }

const ATTR_TABS = [
  { value: '',    label: 'All Heroes',    labelRu: 'Все герои',     icon: null },
  { value: 'str', label: 'Strength',     labelRu: 'Сила',          icon: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_strength.png' },
  { value: 'agi', label: 'Agility',      labelRu: 'Ловкость',      icon: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_agility.png' },
  { value: 'int', label: 'Intelligence', labelRu: 'Интеллект',     icon: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_intelligence.png' },
  { value: 'all', label: 'Universal',    labelRu: 'Универсальный', icon: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_universal.png' },
]

// Raw hex per attribute for inline accent bars / glows (card cosmetics)
const ATTR_HEX: Record<string, string> = {
  str: '#f87171', agi: '#4ade80', int: '#60a5fa', all: '#c084fc',
}
const ATTR_ICON: Record<string, string> = {
  str: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_strength.png',
  agi: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_agility.png',
  int: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_intelligence.png',
  all: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_universal.png',
}

const ATTR_TAB_STYLES: Record<string, { inactive: string; active: string }> = {
  str: {
    inactive: 'text-red-400/80 bg-red-400/10 border-red-400/30 hover:text-red-400 hover:bg-red-400/15 hover:border-red-400/50',
    active:   'text-red-400 bg-red-400/20 border-red-400/50',
  },
  agi: {
    inactive: 'text-green-400/80 bg-green-400/10 border-green-400/30 hover:text-green-400 hover:bg-green-400/15 hover:border-green-400/50',
    active:   'text-green-400 bg-green-400/20 border-green-400/50',
  },
  int: {
    inactive: 'text-blue-400/80 bg-blue-400/10 border-blue-400/30 hover:text-blue-400 hover:bg-blue-400/15 hover:border-blue-400/50',
    active:   'text-blue-400 bg-blue-400/20 border-blue-400/50',
  },
  all: {
    inactive: 'text-purple-400/80 bg-purple-400/10 border-purple-400/30 hover:text-purple-400 hover:bg-purple-400/15 hover:border-purple-400/50',
    active:   'text-purple-400 bg-purple-400/20 border-purple-400/50',
  },
}

const L = {
  en: {
    search: 'Search heroes…',
    filteredByRole: 'Filtered by role:',
    count: (n: number, total: number, q: string) =>
      `${n}${n !== total ? ` of ${total}` : ''} heroes${q ? ` matching "${q}"` : ''}`,
    noHeroes: 'No heroes found.',
  },
  ru: {
    search: 'Поиск по героям…',
    filteredByRole: 'Фильтр по роли:',
    count: (n: number, total: number, q: string) =>
      `${n}${n !== total ? ` из ${total}` : ''} героев${q ? ` по запросу «${q}»` : ''}`,
    noHeroes: 'Героев не найдено.',
  },
}

export default function HeroesClient({ heroes, locale = 'en' }: { heroes: HeroData[]; locale?: string }) {
  const prefix = locale === 'ru' ? '/ru' : ''
  const t = locale === 'ru' ? L.ru : L.en
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeAttr = searchParams.get('attr') ?? ''
  const role = searchParams.get('role') ?? ''
  const [search, setSearch] = useState('')

  const q = search.toLowerCase()
  const filtered = heroes
    .filter(h => !activeAttr || h.primary_attr === activeAttr)
    .filter(h => !role || h.roles.includes(role))
    .filter(h => !q || h.localized_name.toLowerCase().includes(q))

  const setAttr = (attr: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (attr) params.set('attr', attr)
    else params.delete('attr')
    params.delete('role')
    router.push(`${prefix}/heroes${params.toString() ? '?' + params.toString() : ''}`)
  }

  const clearRole = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('role')
    router.push(`${prefix}/heroes${params.toString() ? '?' + params.toString() : ''}`)
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

      {/* Attribute filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {ATTR_TABS.map(tab => {
          const isActive = activeAttr === tab.value
          const count = tab.value ? heroes.filter(h => h.primary_attr === tab.value).length : heroes.length
          const styles = tab.value ? ATTR_TAB_STYLES[tab.value] : null
          return (
            <button
              key={tab.value}
              onClick={() => setAttr(tab.value)}
              className={[
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200',
                styles
                  ? isActive ? styles.active : styles.inactive
                  : isActive
                    ? 'text-foreground bg-secondary border-border'
                    : 'text-muted-foreground border-border/50 hover:text-foreground hover:border-border hover:bg-secondary/40',
              ].join(' ')}
            >
              {tab.icon && <img src={tab.icon} alt="" className="w-4 h-4 object-contain shrink-0" />}
              {locale === 'ru' ? tab.labelRu : tab.label}
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-black/20">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Active role filter badge */}
      {role && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">{t.filteredByRole}</span>
          <button
            onClick={clearRole}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            {(locale === 'ru' ? ROLES_RU[role] : null) ?? role} ×
          </button>
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-muted-foreground mb-4">
        {t.count(filtered.length, heroes.length, search)}
      </p>

      {/* Hero grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{t.noHeroes}</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
          {filtered.map(hero => {
            const slug = heroSlug(hero.name)
            const cfg = ATTR_CONFIG[hero.primary_attr]
            const hex = ATTR_HEX[hero.primary_attr]
            return (
              <Link key={hero.id} href={`${prefix}/heroes/${slug}`}>
                <article className="group relative rounded-xl border border-border/60 bg-card/60 overflow-hidden transition-all duration-200 hover:-translate-y-1">
                  <div className="relative overflow-hidden bg-secondary/60" style={{ aspectRatio: '256/144' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroPortraitUrl(slug)} alt={hero.localized_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                    {/* depth scrim */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(8,10,14,0.8), transparent)' }} />
                    {/* attribute icon badge */}
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center border" style={{ background: 'rgba(0,0,0,0.55)', borderColor: `${hex}66` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ATTR_ICON[hero.primary_attr]} alt={cfg.short} className="w-3 h-3 object-contain" loading="lazy" />
                    </span>
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="font-display text-[11px] font-bold text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">{hero.localized_name}</p>
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      {(locale === 'ru' ? ATTACK_RU[hero.attack_type] : null) ?? hero.attack_type}
                      {' · '}
                      {(locale === 'ru' ? ROLES_RU[hero.roles[0]] : null) ?? hero.roles[0]}
                    </p>
                  </div>
                  {/* attribute accent bar */}
                  <div className="h-[3px] w-full" style={{ background: hex, opacity: 0.65 }} />
                  {/* hover glow + ring in attribute color */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${hex}, 0 0 18px ${hex}40` }} />
                </article>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
