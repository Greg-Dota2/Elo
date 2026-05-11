import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchAllHeroes, heroSlug, type HeroData } from '@/lib/heroes'
import HeroesClient from '@/components/HeroesClient'

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
  alternates: { canonical: '/heroes', languages: { 'x-default': '/heroes', 'en': '/heroes', 'ru': '/ru/heroes' } },
}

export default async function HeroesPage() {
  let heroes: HeroData[] = []
  try { heroes = await fetchAllHeroes() } catch { /* api error */ }

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
          <h1 className="text-3xl font-black tracking-tight">Dota 2 Heroes</h1>
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

      <Suspense>
        <HeroesClient heroes={heroes} />
      </Suspense>
    </div>
  )
}
