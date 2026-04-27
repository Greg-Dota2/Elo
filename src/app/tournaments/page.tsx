import type { Metadata } from 'next'
import { getTournaments, getTournamentStats } from '@/lib/queries'
import TournamentCard from '@/components/TournamentCard'
import type { TournamentStatus } from '@/components/TournamentCard'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Dota 2 Tournament Predictions & Results',
  description: 'Every Tier 1 Dota 2 tournament covered — pre-match picks, match-by-match analysis, and full results. No backdating. No excuses. Every call is on the record.',
  keywords: ['Dota 2 tournaments', 'pro Dota 2 tournaments', 'Dota 2 match predictions', 'ESL One', 'The International', 'Dota 2 Major', 'DPC'],
  alternates: { canonical: '/tournaments' },
  openGraph: { title: 'Dota 2 Tournament Predictions & Results', description: 'Every Tier 1 Dota 2 tournament covered — pre-match picks, match-by-match analysis, and full results. No backdating. No excuses.', url: '/tournaments' },
  twitter: { card: 'summary', title: 'Dota 2 Tournament Predictions & Results', description: 'Every Tier 1 Dota 2 tournament covered — pre-match picks, match-by-match analysis, and full results.' },
}

function getTournamentStatus(t: { start_date?: string | null; end_date?: string | null }, now: Date): TournamentStatus {
  if (!t.start_date) return 'finished'
  const start = new Date(t.start_date)
  const end = t.end_date ? new Date(t.end_date + 'T23:59:59Z') : null
  if (end && end < now) return 'finished'
  if (start > now) return 'upcoming'
  return 'live'
}

const SECTION_LABEL: Record<TournamentStatus, { text: string; style: React.CSSProperties }> = {
  live:     { text: '● Live',    style: { background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' } },
  upcoming: { text: 'Upcoming',  style: { background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' } },
  finished: { text: 'Completed', style: { background: 'hsl(var(--border))',          color: 'var(--text-muted)' } },
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

  const now = new Date()
  const live     = tournamentsWithStats.filter(({ tournament: t }) => getTournamentStatus(t, now) === 'live')
  const upcoming = tournamentsWithStats.filter(({ tournament: t }) => getTournamentStatus(t, now) === 'upcoming')
  const finished = tournamentsWithStats.filter(({ tournament: t }) => getTournamentStatus(t, now) === 'finished')

  // upcoming: nearest first; finished: most recent first
  upcoming.sort((a, b) => (a.tournament.start_date ?? '').localeCompare(b.tournament.start_date ?? ''))
  finished.sort((a, b) => (b.tournament.start_date ?? '').localeCompare(a.tournament.start_date ?? ''))

  const sections: { status: TournamentStatus; items: typeof tournamentsWithStats }[] = (
    [
      { status: 'live'     as const, items: live },
      { status: 'upcoming' as const, items: upcoming },
      { status: 'finished' as const, items: finished },
    ] as const
  ).filter(s => s.items.length > 0)

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
        <div className="grid gap-6">
          {sections.map(({ status, items }) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={SECTION_LABEL[status].style}
                >
                  {SECTION_LABEL[status].text}
                </span>
              </div>
              <div className="grid gap-3">
                {items.map(({ tournament, stats }, i) => (
                  <div key={tournament.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <TournamentCard tournament={tournament} stats={stats} status={status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
