import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchAllHeroes, heroSlug, heroPortraitUrl, ATTR_CONFIG, type HeroData, type HeroPrimaryAttr } from '@/lib/heroes'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Dota 2 Heroes — Abilities, Stats & Roles',
  description: 'All Dota 2 heroes with abilities, base stats, roles, and lore. Browse Strength, Agility, Intelligence, and Universal heroes.',
  keywords: ['Dota 2 heroes', 'Dota 2 hero list', 'Dota 2 abilities', 'Dota 2 hero guide', 'Dota 2 hero stats'],
  openGraph: {
    title: 'Dota 2 Heroes — Abilities, Stats & Roles',
    description: 'All Dota 2 heroes with abilities, base stats, roles, and lore.',
    url: '/heroes',
  },
  twitter: { card: 'summary', title: 'Dota 2 Heroes — Abilities, Stats & Roles', description: 'All Dota 2 heroes with abilities, base stats, roles, and lore.' },
  alternates: { canonical: '/heroes' },
}

const VALID_ATTRS = new Set(['str', 'agi', 'int', 'all'])

const ATTR_TABS = [
  { value: '', label: 'All Heroes' },
  { value: 'str', label: 'Strength' },
  { value: 'agi', label: 'Agility' },
  { value: 'int', label: 'Intelligence' },
  { value: 'all', label: 'Universal' },
]

export default async function HeroesPage({
  searchParams,
}: {
  searchParams: Promise<{ attr?: string }>
}) {
  const { attr = '' } = await searchParams
  const activeAttr = VALID_ATTRS.has(attr) ? attr : ''

  let heroes: HeroData[] = []
  try { heroes = await fetchAllHeroes() } catch { /* api error */ }

  const filtered = activeAttr
    ? heroes.filter(h => h.primary_attr === activeAttr)
    : heroes

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-2">Game Knowledge</p>
        <h1 className="text-3xl font-black tracking-tight mb-1">Dota 2 Heroes</h1>
        <p className="text-sm text-muted-foreground">
          {heroes.length} heroes · click any hero for abilities &amp; stats
        </p>
      </div>

      {/* Attribute filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {ATTR_TABS.map(tab => {
          const isActive = activeAttr === tab.value
          const cfg = tab.value ? ATTR_CONFIG[tab.value as HeroPrimaryAttr] : null
          const count = tab.value ? heroes.filter(h => h.primary_attr === tab.value).length : heroes.length
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/heroes?attr=${tab.value}` : '/heroes'}
              className={[
                'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
                isActive
                  ? cfg
                    ? `${cfg.color} ${cfg.bg} ${cfg.border}`
                    : 'text-foreground bg-secondary border-border'
                  : 'text-muted-foreground border-border/60 hover:border-border hover:text-foreground',
              ].join(' ')}
            >
              {tab.label}
              <span className="ml-1.5 text-[11px] opacity-60">{count}</span>
            </Link>
          )
        })}
      </div>

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
                  {/* Portrait */}
                  <div className="relative overflow-hidden bg-secondary/60" style={{ aspectRatio: '256/144' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroPortraitUrl(slug)}
                      alt={hero.localized_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                      {cfg.short}
                    </span>
                  </div>
                  {/* Name */}
                  <div className="px-2 py-1.5">
                    <p className="font-display text-[11px] font-bold text-foreground leading-tight line-clamp-1">
                      {hero.localized_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      {hero.attack_type} · {hero.roles[0]}
                    </p>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
