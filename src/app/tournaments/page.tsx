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

  // Aggregate overall stats across all tracked tournaments
  const totalPredictions = tournamentsWithStats.reduce((s, { stats }) => s + (stats?.total_predictions ?? 0), 0)
  const totalCorrect     = tournamentsWithStats.reduce((s, { stats }) => s + (stats?.correct ?? 0), 0)
  const overallAccuracy  = totalPredictions > 0 ? Math.round((totalCorrect / totalPredictions) * 100) : null

  return (
    <div className="fade-in-up">
      {/* Page header */}
      <div className="mb-6">
        <p className="section-label mb-2">Predictions Archive</p>
        <h1 className="text-3xl font-black tracking-tight mb-3">Tournaments</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every Tier 1 tournament I&apos;ve covered — series by series, with my pick, the reasoning behind it,
          and the result. Every call is logged before the match starts. No backdating, no selective memory.
        </p>
      </div>

      {/* Stat strip */}
      {tournamentsWithStats.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap mb-8">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span className="text-sm font-bold text-primary tabular-nums">{tournamentsWithStats.length}</span>
            <span className="text-sm text-muted-foreground">tournaments tracked</span>
          </div>
          {totalPredictions > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-secondary/40">
              <span className="text-sm font-bold text-foreground tabular-nums">{totalPredictions}</span>
              <span className="text-sm text-muted-foreground">predictions made</span>
            </div>
          )}
          {overallAccuracy !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-success/25 bg-success/10">
              <span className="text-sm font-bold tabular-nums" style={{ color: 'hsl(var(--success))' }}>{overallAccuracy}%</span>
              <span className="text-sm text-muted-foreground">overall accuracy</span>
            </div>
          )}
        </div>
      )}

      {tournamentsWithStats.length === 0 ? (
        <div className="rounded-2xl p-10 text-center border border-border/60 bg-card/60">
          <p className="font-semibold mb-1">No tournaments yet</p>
          <p className="text-sm text-muted-foreground">Published tournaments will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {sections.map(({ status, items }) => (
            <div key={status}>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border"
                  style={status === 'live'
                    ? { background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))', borderColor: 'hsl(var(--success) / 0.25)' }
                    : status === 'upcoming'
                    ? { background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.25)' }
                    : { background: 'hsl(var(--secondary))', color: 'var(--text-muted)', borderColor: 'hsl(var(--border))' }
                  }
                >
                  {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                  {SECTION_LABEL[status].text}
                </span>
                <span className="text-xs font-bold text-muted-foreground tabular-nums">{items.length}</span>
                <div className="h-px flex-1 bg-border/40" />
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
