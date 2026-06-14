import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { fetchAllItems } from '@/lib/items'
import ItemsClient from '@/components/ItemsClient'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Предметы Dota 2 — Характеристики, Стоимость и Гайды',
  description: 'Все предметы Dota 2 в одном месте — стоимость, активные и пассивные способности, пути сборки и когда их покупать.',
  alternates: { canonical: '/ru/items', languages: { 'x-default': '/items', 'en': '/items', 'ru': '/ru/items' } },
  openGraph: {
    title: 'Предметы Dota 2 — Характеристики, Стоимость и Гайды',
    description: 'Все предметы Dota 2 в одном месте — стоимость, активные и пассивные способности, пути сборки и когда их покупать.',
    url: '/ru/items',
    images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }],
  },
  twitter: { card: 'summary', title: 'Предметы Dota 2 — Характеристики, Стоимость и Гайды', description: 'Все предметы Dota 2 в одном месте — стоимость, активные и пассивные способности, пути сборки и когда их покупать.' },
}

export default async function RuItemsPage() {
  const allItems = await fetchAllItems()

  return (
    <div className="fade-in-up">
      <div className="mb-8">
        <p className="section-label mb-2">Dota 2</p>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
          <h1 className="text-3xl font-black tracking-tight">Предметы</h1>
          <Link
            href="/ru/items/meta"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors shrink-0"
          >
            Процент побед и мета →
          </Link>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1">
          У каждого предмета есть отдельная страница с характеристиками, активными и пассивными способностями,
          компонентами сборки и стоимостью. Используйте фильтр по категории ниже или перейдите на страницу{' '}
          <Link href="/ru/items/meta" className="text-primary hover:underline">Мета</Link>.
        </p>
      </div>

      <Suspense>
        <ItemsClient items={allItems} locale="ru" />
      </Suspense>
    </div>
  )
}
