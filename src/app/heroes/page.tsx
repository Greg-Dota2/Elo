import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchAllHeroes, heroSlug, heroPortraitUrl, ATTR_CONFIG, type HeroData, type HeroPrimaryAttr } from '@/lib/heroes'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Dota 2 Heroes — Abilities, Stats & Pro Usage',
  description: 'Full hero database for Dota 2 — abilities, base stats, talents, and which pro players are known for each one. Browse all heroes by attribute.',
  keywords: ['Dota 2 heroes', 'Dota 2 hero list', 'Dota 2 abilities', 'Dota 2 hero guide', 'Dota 2 hero stats'],
  openGraph: {
    title: 'Dota 2 Heroes — Abilities, Stats & Pro Usage',
    description: 'Full hero database for Dota 2 — abilities, base stats, talents, and which pro players are known for each one.',
    url: '/heroes',
  },
  twitter: { card: 'summary', title: 'Dota 2 Heroes — Abilities, Stats & Pro Usage', description: 'Full hero database for Dota 2 — abilities, base stats, talents, and which pro players are known for each one.' },
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
  searchParams: Promise<{ attr?: string; role?: string }>
}) {
  const { attr = '', role = '' } = await searchParams
  const activeAttr = VALID_ATTRS.has(attr) ? attr : ''

  let heroes: HeroData[] = []
  try { heroes = await fetchAllHeroes() } catch { /* api error */ }

  const filtered = heroes
    .filter(h => !activeAttr || h.primary_attr === activeAttr)
    .filter(h => !role || h.roles.includes(role))

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Dota 2 Heroes — Abilities, Stats & Roles',
            description: 'All Dota 2 heroes with abilities, base stats, roles, and lore.',
            url: 'https://www.dota2protips.com/heroes',
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: heroes.length,
              itemListElement: heroes.map((hero, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: hero.localized_name,
                url: `https://www.dota2protips.com/heroes/${heroSlug(hero.name)}`,
              })),
            },
          }),
        }}
      />
      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-2">Game Knowledge</p>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-1">Dota 2 Heroes</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length}{filtered.length !== heroes.length ? ` of ${heroes.length}` : ''} heroes · click any hero for abilities &amp; stats
            </p>
          </div>
          <Link
            href="/heroes/meta"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors shrink-0"
          >
            Win Rates &amp; Meta →
          </Link>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every hero has a dedicated page with full abilities, talent tree, Aghanim&apos;s upgrades, best and worst matchups,
          popular items by game phase, and which pro players are known for it. Use the attribute filter below to narrow
          it down, or jump straight to the <Link href="/heroes/meta" className="text-primary hover:underline">Win Rates &amp; Meta</Link> page
          if you want to see who&apos;s strong in the current patch.
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

      {/* Active role filter badge */}
      {role && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">Filtered by role:</span>
          <Link
            href={activeAttr ? `/heroes?attr=${activeAttr}` : '/heroes'}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            {role} ×
          </Link>
        </div>
      )}

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
