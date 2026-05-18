import type { Metadata } from 'next'
import { getPlayers } from '@/lib/queries'
import type { Player } from '@/lib/types'
import { Suspense } from 'react'
import PlayersClient from '@/components/PlayersClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Ð˜Ð³Ñ€Ð¾ÐºÐ¸ Dota 2 â€” ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸ Ð¸ ÑÑ‚Ð°Ñ‚Ð¸ÑÑ‚Ð¸ÐºÐ°',
  description: 'ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸ Ð²ÑÐµÑ… Ð¾Ñ‚ÑÐ»ÐµÐ¶Ð¸Ð²Ð°ÐµÐ¼Ñ‹Ñ… Ð¿Ñ€Ð¾-Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Dota 2 â€” Ñ€Ð¾Ð»Ð¸, Ð³ÐµÑ€Ð¾Ð¸, Ð´Ð¾ÑÑ‚Ð¸Ð¶ÐµÐ½Ð¸Ñ Ð¸ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹ Ñ‚ÑƒÑ€Ð½Ð¸Ñ€Ð¾Ð².',
  alternates: { canonical: '/ru/players', languages: { 'x-default': '/players', 'en': '/players', 'ru': '/ru/players' } },
  openGraph: { title: 'Ð˜Ð³Ñ€Ð¾ÐºÐ¸ Dota 2 â€” ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸ Ð¸ ÑÑ‚Ð°Ñ‚Ð¸ÑÑ‚Ð¸ÐºÐ°', description: 'ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸ Ð²ÑÐµÑ… Ð¾Ñ‚ÑÐ»ÐµÐ¶Ð¸Ð²Ð°ÐµÐ¼Ñ‹Ñ… Ð¿Ñ€Ð¾-Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Dota 2 â€” Ñ€Ð¾Ð»Ð¸, Ð³ÐµÑ€Ð¾Ð¸, Ð´Ð¾ÑÑ‚Ð¸Ð¶ÐµÐ½Ð¸Ñ Ð¸ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹ Ñ‚ÑƒÑ€Ð½Ð¸Ñ€Ð¾Ð².', url: '/ru/players' },
  twitter: { card: 'summary', title: 'Ð˜Ð³Ñ€Ð¾ÐºÐ¸ Dota 2 â€” ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸ Ð¸ ÑÑ‚Ð°Ñ‚Ð¸ÑÑ‚Ð¸ÐºÐ°', description: 'ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸ Ð²ÑÐµÑ… Ð¾Ñ‚ÑÐ»ÐµÐ¶Ð¸Ð²Ð°ÐµÐ¼Ñ‹Ñ… Ð¿Ñ€Ð¾-Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Dota 2 â€” Ñ€Ð¾Ð»Ð¸, Ð³ÐµÑ€Ð¾Ð¸, Ð´Ð¾ÑÑ‚Ð¸Ð¶ÐµÐ½Ð¸Ñ Ð¸ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹ Ñ‚ÑƒÑ€Ð½Ð¸Ñ€Ð¾Ð².' },
}

export default async function RuPlayersPage() {
  let players: Player[] = []
  try { players = await getPlayers() } catch { /* db error */ }

  return (
    <div className="fade-in-up">
      <div className="mb-6">
        <p className="section-label mb-2">Ð¡Ñ†ÐµÐ½Ð° Tier 1</p>
        <h1 className="text-3xl font-black tracking-tight mb-3">Ð˜Ð³Ñ€Ð¾ÐºÐ¸ Dota 2</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ð’ÑÐµ Ð¾Ñ‚ÑÐ»ÐµÐ¶Ð¸Ð²Ð°ÐµÐ¼Ñ‹Ðµ Ð¸Ð³Ñ€Ð¾ÐºÐ¸ Tier 1 Ñ Ð¿Ñ€Ð¾Ñ„Ð¸Ð»ÑÐ¼Ð¸: Ñ€Ð¾Ð»Ð¸, Ð³ÐµÑ€Ð¾Ð¸, Ð¸ÑÑ‚Ð¾Ñ€Ð¸Ñ ÐºÐ¾Ð¼Ð°Ð½Ð´ Ð¸ Ð´Ð¾ÑÑ‚Ð¸Ð¶ÐµÐ½Ð¸Ñ. Ð¤Ð¸Ð»ÑŒÑ‚Ñ€ÑƒÐ¹Ñ‚Ðµ Ð¿Ð¾ Ñ€Ð¾Ð»Ð¸ Ð¸Ð»Ð¸ Ð¸Ñ‰Ð¸Ñ‚Ðµ Ð¿Ð¾ Ð¸Ð¼ÐµÐ½Ð¸.
        </p>
      </div>

      <Suspense>
        <PlayersClient players={players} locale="ru" />
      </Suspense>
    </div>
  )
}
