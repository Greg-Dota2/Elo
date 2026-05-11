import type { Metadata } from 'next'
import { getPlayers } from '@/lib/queries'
import type { Player } from '@/lib/types'
import { Suspense } from 'react'
import PlayersClient from '@/components/PlayersClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Игроки Dota 2 — Профили и статистика',
  description: 'Профили всех отслеживаемых про-игроков Dota 2 — роли, герои, достижения и результаты турниров.',
  alternates: { canonical: '/ru/players', languages: { 'x-default': '/players', 'en': '/players', 'ru': '/ru/players' } },
  openGraph: { title: 'Игроки Dota 2 — Профили и статистика', description: 'Профили всех отслеживаемых про-игроков Dota 2 — роли, герои, достижения и результаты турниров.', url: '/ru/players' },
  twitter: { card: 'summary', title: 'Игроки Dota 2 — Профили и статистика', description: 'Профили всех отслеживаемых про-игроков Dota 2 — роли, герои, достижения и результаты турниров.' },
}

export default async function RuPlayersPage() {
  let players: Player[] = []
  try { players = await getPlayers() } catch { /* db error */ }

  return (
    <div className="fade-in-up">
      <div className="mb-6">
        <p className="section-label mb-2">Сцена Tier 1</p>
        <h1 className="text-3xl font-black tracking-tight mb-3">Игроки Dota 2</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Все отслеживаемые игроки Tier 1 с профилями: роли, герои, история команд и достижения. Фильтруйте по роли или ищите по имени.
        </p>
      </div>

      <Suspense>
        <PlayersClient players={players} locale="ru" />
      </Suspense>
    </div>
  )
}
