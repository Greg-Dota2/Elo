import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { fetchAllItems } from '@/lib/items'
import ItemsClient from '@/components/ItemsClient'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Dota 2 Items — Stats, Costs & Pro Usage',
  description: 'Every Dota 2 item in one place — costs, active/passive abilities, build paths, and when to buy them. Consumables, basic items, upgrades, and neutral items.',
  keywords: ['Dota 2 items', 'Dota 2 item list', 'Dota 2 item guide', 'Dota 2 consumables', 'Dota 2 neutral items'],
  alternates: { canonical: '/items', languages: { 'x-default': '/items', 'en': '/items', 'ru': '/ru/items' } },
  openGraph: { title: 'Dota 2 Items — Stats, Costs & Pro Usage', description: 'Every Dota 2 item in one place — costs, active/passive abilities, build paths, and when to buy them.', url: '/items', images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }] },
  twitter: { card: 'summary', title: 'Dota 2 Items — Stats, Costs & Pro Usage', description: 'Every Dota 2 item in one place — costs, active/passive abilities, build paths, and when to buy them.' },
}

export default async function ItemsPage() {
  const allItems = await fetchAllItems()

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
        <p className="text-sm text-muted-foreground leading-relaxed mt-1">
          Every item has a dedicated page with stats, active and passive abilities, build components, and cost.
          Use the category filter below to browse by type, or head to the{' '}
          <Link href="/items/meta" className="text-primary hover:underline">Win Rates &amp; Meta</Link>{' '}
          page if you want to see which upgrades are performing well and how neutral items are distributed across tiers.
        </p>
      </div>

      <Suspense>
        <ItemsClient items={allItems} />
      </Suspense>
    </div>
  )
}
