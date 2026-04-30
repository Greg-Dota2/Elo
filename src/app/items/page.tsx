import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { fetchAllItems, itemIconUrl, type ItemCategory } from '@/lib/items'
import ItemsFilter from '@/components/ItemsFilter'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Dota 2 Items — Stats, Costs & Pro Usage',
  description: 'Every Dota 2 item in one place — costs, active/passive abilities, build paths, and when to buy them. Consumables, basic items, upgrades, and neutral items.',
  keywords: ['Dota 2 items', 'Dota 2 item list', 'Dota 2 item guide', 'Dota 2 consumables', 'Dota 2 neutral items'],
  alternates: { canonical: '/items' },
  openGraph: { title: 'Dota 2 Items — Stats, Costs & Pro Usage', description: 'Every Dota 2 item in one place — costs, active/passive abilities, build paths, and when to buy them.', url: '/items' },
  twitter: { card: 'summary', title: 'Dota 2 Items — Stats, Costs & Pro Usage', description: 'Every Dota 2 item in one place — costs, active/passive abilities, build paths, and when to buy them.' },
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  consumable: 'Consumables',
  basic: 'Basic',
  upgrade: 'Upgrades',
  neutral: 'Neutral',
}

interface Props {
  searchParams: Promise<{ cat?: string }>
}

export default async function ItemsPage({ searchParams }: Props) {
  const { cat } = await searchParams
  const activeCategory = cat || 'all'

  const CATEGORY_ORDER: Record<string, number> = { upgrade: 0, basic: 1, neutral: 2, consumable: 3 }

  const allItems = await fetchAllItems()
  const items = activeCategory === 'all'
    ? [...allItems].sort((a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99))
    : allItems.filter(i => i.category === activeCategory)

  const counts = {
    all: allItems.length,
    consumable: allItems.filter(i => i.category === 'consumable').length,
    basic: allItems.filter(i => i.category === 'basic').length,
    upgrade: allItems.filter(i => i.category === 'upgrade').length,
    neutral: allItems.filter(i => i.category === 'neutral').length,
  }

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Dota 2 Items — Complete Item List',
            description: 'Complete list of all Dota 2 items — consumables, basic items, upgrades, and neutral items. Stats, costs, and abilities.',
            url: 'https://www.dota2protips.com/items',
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: allItems.length,
              itemListElement: allItems.map((item, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: item.dname,
                url: `https://www.dota2protips.com/items/${item.key}`,
              })),
            },
          }),
        }}
      />
      <div className="mb-8">
        <p className="section-label mb-2">Dota 2</p>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
          <h1 className="text-3xl font-black tracking-tight">Items</h1>
          <Link
            href="/items/meta"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors shrink-0"
          >
            Win Rates &amp; Meta →
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{counts.all} items total</p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">
          Every item has a dedicated page with stats, active and passive abilities, build components, and cost.
          Use the category filter below to browse by type, or head to the{' '}
          <Link href="/items/meta" className="text-primary hover:underline">Win Rates &amp; Meta</Link>{' '}
          page if you want to see which upgrades are performing well and how neutral items are distributed across tiers.
        </p>
      </div>

      {/* Filter */}
      <Suspense>
        <ItemsFilter active={activeCategory} counts={counts} />
      </Suspense>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 mt-6">
        {items.map(item => (
          <Link
            key={item.key}
            href={`/items/${item.key}`}
            className="group relative rounded-xl border border-border/50 bg-card/60 overflow-hidden hover:border-primary/40 hover:bg-card/80 transition-all duration-200"
            title={item.dname}
          >
            {/* Item icon */}
            <div className="relative aspect-[88/64] bg-secondary/40 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={itemIconUrl(item.key)}
                alt={item.dname}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Name + cost */}
            <div className="px-2 py-1.5">
              <p className="text-[10px] font-semibold leading-tight text-foreground line-clamp-2 mb-1">
                {item.dname}
              </p>
              {item.cost > 0 && (
                <p className="text-[10px] font-bold text-amber-400 tabular-nums">
                  {item.cost.toLocaleString()} g
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl p-10 text-center border border-border/60 bg-card/60">
          <p className="text-muted-foreground text-sm">No items found.</p>
        </div>
      )}
    </div>
  )
}
