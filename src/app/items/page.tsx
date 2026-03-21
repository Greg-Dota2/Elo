import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { fetchAllItems, itemIconUrl, type ItemCategory } from '@/lib/items'
import ItemsFilter from '@/components/ItemsFilter'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Dota 2 Items — Complete Item List',
  description: 'Complete list of all Dota 2 items — consumables, basic items, upgrades, and neutral items. Stats, costs, and abilities.',
  keywords: ['Dota 2 items', 'Dota 2 item list', 'Dota 2 item guide', 'Dota 2 consumables', 'Dota 2 neutral items'],
  alternates: { canonical: '/items' },
  openGraph: { title: 'Dota 2 Items — Complete Item List', description: 'Complete list of all Dota 2 items — consumables, basic items, upgrades, and neutral items. Stats, costs, and abilities.', url: '/items' },
  twitter: { card: 'summary', title: 'Dota 2 Items — Complete Item List', description: 'Complete list of all Dota 2 items — consumables, basic items, upgrades, and neutral items.' },
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

  const allItems = await fetchAllItems()
  const items = activeCategory === 'all'
    ? allItems
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
      <div className="mb-8">
        <p className="section-label mb-2">Dota 2</p>
        <h1 className="text-3xl font-black tracking-tight mb-1">Items</h1>
        <p className="text-sm text-muted-foreground">{counts.all} items total</p>
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
