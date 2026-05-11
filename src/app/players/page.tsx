import type { Metadata } from 'next'
import Link from 'next/link'
import { getPlayers } from '@/lib/queries'
import type { Player } from '@/lib/types'
import { Suspense } from 'react'
import PlayersClient from '@/components/PlayersClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Dota 2 Pro Players — Profiles & Career Stats',
  description: 'Profiles for every tracked Dota 2 pro player — roles, signature heroes, career achievements, and tournament results. The people behind the picks, not just the team names.',
  keywords: ['Dota 2 pro players', 'Dota 2 players', 'professional Dota 2', 'Dota 2 roster', 'Dota 2 carry', 'Dota 2 midlaner'],
  alternates: { canonical: '/players', languages: { 'x-default': '/players', 'en': '/players', 'ru': '/ru/players' } },
  openGraph: { title: 'Dota 2 Pro Players — Profiles & Career Stats', description: 'Profiles for every tracked Dota 2 pro player — roles, signature heroes, career achievements, and tournament results.', url: '/players' },
  twitter: { card: 'summary', title: 'Dota 2 Pro Players — Profiles & Career Stats', description: 'Profiles for every tracked Dota 2 pro player — roles, signature heroes, career achievements, and tournament results.' },
}

export default async function PlayersPage() {
  let players: Player[] = []
  try { players = await getPlayers() } catch { /* db error */ }

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Dota 2 Pro Players — Profiles & Stats',
            description: 'Profiles for Tier 1 Dota 2 professional players — position, team, country, and career highlights.',
            url: 'https://www.dota2protips.com/players',
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: players.length,
              itemListElement: players.filter(p => p.slug).map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: p.ign,
                url: `https://www.dota2protips.com/players/${p.slug}`,
              })),
            },
          }),
        }}
      />
      <div className="mb-6">
        <p className="section-label mb-2">Tier 1 Scene</p>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <h1 className="text-3xl font-black tracking-tight">Dota 2 Players</h1>
          <Link
            href="/players/rankings"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors shrink-0"
          >
            Rankings →
          </Link>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every tracked Tier 1 player has a dedicated profile with their position, signature heroes, team history,
          and career highlights. Filter by role below to find carries, midlaners, or supports — or browse the full
          roster grouped by team.
        </p>
      </div>

      <Suspense>
        <PlayersClient players={players} />
      </Suspense>
    </div>
  )
}
