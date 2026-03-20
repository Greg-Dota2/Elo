import type { Metadata } from 'next'
import { getTournaments, getTournamentStats } from '@/lib/queries'
import TournamentCard from '@/components/TournamentCard'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Dota 2 Tournaments — Predictions & Results',
  description: 'Browse pro Dota 2 tournaments with pre-match predictions, winner picks, and accuracy stats. Every pick recorded before the draft.',
  keywords: ['Dota 2 tournaments', 'pro Dota 2 tournaments', 'Dota 2 match predictions', 'ESL One', 'The International', 'Dota 2 Major', 'DPC'],
}

export default async function TournamentsPage() {
  let tournaments: Awaited<ReturnType<typeof getTournaments>> = []

  try {
    tournaments = await getTournaments()
  } catch {
    // Supabase not configured yet
  }

  const tournamentsWithStats = await Promise.all(
    tournaments.map(async (t) => ({
      tournament: t,
      stats: await getTournamentStats(t.id).catch(() => null),
    }))
  )

  return (
    <div className="fade-in-up">
      {/* Page header */}
      <div className="mb-8">
        <p className="section-label mb-2">Predictions archive</p>
        <h1 className="text-3xl font-black tracking-tight">Tournaments</h1>
      </div>

      {tournamentsWithStats.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No tournaments yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Published tournaments will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tournamentsWithStats.map(({ tournament, stats }, i) => (
            <div key={tournament.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <TournamentCard tournament={tournament} stats={stats} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
