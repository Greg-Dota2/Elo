import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchAllHeroes, heroSlug, type HeroData } from '@/lib/heroes'
import HeroesClient from '@/components/HeroesClient'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Герои Dota 2 — Способности, Характеристики и Таланты',
  description: 'Полная база героев Dota 2 — способности, базовые характеристики, таланты и профессиональные игроки, известные каждым героем.',
  alternates: { canonical: '/ru/heroes', languages: { 'x-default': '/heroes', 'en': '/heroes', 'ru': '/ru/heroes' } },
  openGraph: {
    title: 'Герои Dota 2 — Способности, Характеристики и Таланты',
    description: 'Полная база героев Dota 2 — способности, базовые характеристики, таланты и профессиональные игроки, известные каждым героем.',
    url: '/ru/heroes',
    images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }],
  },
  twitter: { card: 'summary', title: 'Герои Dota 2 — Способности, Характеристики и Таланты', description: 'Полная база героев Dota 2 — способности, базовые характеристики, таланты и профессиональные игроки, известные каждым героем.' },
}

export default async function RuHeroesPage() {
  let heroes: HeroData[] = []
  try { heroes = await fetchAllHeroes() } catch { /* api error */ }

  return (
    <div className="fade-in-up">
      <div className="mb-6">
        <p className="section-label mb-2">Игровые знания</p>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <h1 className="text-3xl font-black tracking-tight">Герои Dota 2</h1>
          <Link
            href="/ru/heroes/meta"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors shrink-0"
          >
            Процент побед и мета →
          </Link>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          У каждого героя есть отдельная страница с полными способностями, деревом талантов, улучшениями Аганима,
          лучшими и худшими противостояниями, популярными предметами по фазам игры и профессиональными игроками,
          известными этим героем. Используйте фильтр по атрибуту ниже или перейдите на страницу{' '}
          <Link href="/ru/heroes/meta" className="text-primary hover:underline">Мета</Link>.
        </p>
      </div>

      <Suspense>
        <HeroesClient heroes={heroes} locale="ru" />
      </Suspense>
    </div>
  )
}
