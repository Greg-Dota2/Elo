'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { heroSlug, heroPortraitUrl, ATTR_CONFIG, type HeroData } from '@/lib/heroes'

const ATTR_TABS = [
  { value: '',    label: 'All Heroes',    icon: null },
  { value: 'str', label: 'Strength',     icon: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_strength.png' },
  { value: 'agi', label: 'Agility',      icon: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_agility.png' },
  { value: 'int', label: 'Intelligence', icon: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_intelligence.png' },
  { value: 'all', label: 'Universal',    icon: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/hero_universal.png' },
]

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

export default function HeroesClient({ heroes }: { heroes: HeroData[] }) {
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
    router.push(`/heroes${params.toString() ? '?' + params.toString() : ''}`)
  }

  const clearRole = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('role')
    router.push(`/heroes${params.toString() ? '?' + params.toString() : ''}`)
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
          placeholder="Search heroes…"
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
              {tab.label}
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-black/20">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Active role filter badge */}
      {role && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">Filtered by role:</span>
          <button
            onClick={clearRole}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            {role} ×
          </button>
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-muted-foreground mb-4">
        {filtered.length}{filtered.length !== heroes.length ? ` of ${heroes.length}` : ''} heroes
        {search ? ` matching "${search}"` : ''}
      </p>

      {/* Hero grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No heroes found.</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
          {filtered.map(hero => {
            const slug = heroSlug(hero.name)
            const cfg = ATTR_CONFIG[hero.primary_attr]
            return (
              <Link key={hero.id} href={`/heroes/${slug}`}>
                <article className="group rounded-xl border border-border/60 bg-card/60 overflow-hidden hover:border-primary/40 hover:bg-card/80 transition-all duration-200 hover:-translate-y-0.5">
                  <div className="relative overflow-hidden bg-secondary/60" style={{ aspectRatio: '256/144' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroPortraitUrl(slug)} alt={hero.localized_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    <span className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>{cfg.short}</span>
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="font-display text-[11px] font-bold text-foreground leading-tight line-clamp-1">{hero.localized_name}</p>
                    <p className="text-[10px] text-muted-foreground/60 truncate">{hero.attack_type} · {hero.roles[0]}</p>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
