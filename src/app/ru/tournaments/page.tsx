import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTournaments, getTournamentStats, getTeamAccuracy } from '@/lib/queries'
import TournamentCard from '@/components/TournamentCard'
import type { TournamentStatus } from '@/components/TournamentCard'

export const revalidate = 300

const SITE_URL = 'https://www.dota2protips.com'

export const metadata: Metadata = {
  title: 'Прогнозы Dota 2 — Турниры | Dota2ProTips',
  description: 'Прогнозы и аналитика всех Tier 1 турниров по Dota 2 — матч за матчем, с разбором и результатами. Без задним числом.',
  alternates: {
    canonical: `${SITE_URL}/ru/tournaments`,
    languages: {
      'en': `${SITE_URL}/tournaments`,
      'ru': `${SITE_URL}/ru/tournaments`,
      'x-default': `${SITE_URL}/tournaments`,
    },
  },
  openGraph: {
    title: 'Прогнозы Dota 2 — Турниры',
    description: 'Прогнозы и аналитика всех Tier 1 турниров по Dota 2 — матч за матчем, с разбором и результатами.',
    url: `${SITE_URL}/ru/tournaments`,
    images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }],
  },
}

function getTournamentStatus(t: { start_date?: string | null; end_date?: string | null }, now: Date): TournamentStatus {
  if (!t.start_date) return 'finished'
  const start = new Date(t.start_date)
  const end = t.end_date ? new Date(t.end_date + 'T23:59:59Z') : null
  if (end && end < now) return 'finished'
  if (start > now) return 'upcoming'
  return 'live'
}

export default async function RuTournamentsPage() {
  let tournaments: Awaited<ReturnType<typeof getTournaments>> = []
  try {
    tournaments = await getTournaments()
  } catch {
    // Supabase not configured
  }

  const tournamentsWithStats = await Promise.all(
    tournaments.map(async (t) => {
      const [stats, teamAccuracy] = await Promise.all([
        getTournamentStats(t.id).catch(() => null),
        getTeamAccuracy(t.id, 3).catch(() => []),
      ])
      return { tournament: t, stats, teamAccuracy }
    })
  )

  const now = new Date()
  const live     = tournamentsWithStats.filter(({ tournament: t }) => getTournamentStatus(t, now) === 'live')
  const upcoming = tournamentsWithStats.filter(({ tournament: t }) => getTournamentStatus(t, now) === 'upcoming')
  const finished = tournamentsWithStats.filter(({ tournament: t }) => getTournamentStatus(t, now) === 'finished')

  upcoming.sort((a, b) => (a.tournament.start_date ?? '').localeCompare(b.tournament.start_date ?? ''))
  finished.sort((a, b) => (b.tournament.start_date ?? '').localeCompare(a.tournament.start_date ?? ''))

  const totalPredictions = tournamentsWithStats.reduce((s, { stats }) => s + (stats?.total_predictions ?? 0), 0)
  const totalCorrect     = tournamentsWithStats.reduce((s, { stats }) => s + (stats?.correct ?? 0), 0)
  const overallAccuracy  = totalPredictions > 0 ? Math.round((totalCorrect / totalPredictions) * 100) : null

  const sections: { status: TournamentStatus; label: string; items: typeof tournamentsWithStats }[] = ([
    { status: 'live'     as const, label: '● Live',    items: live },
    { status: 'upcoming' as const, label: 'Upcoming',  items: upcoming },
    { status: 'finished' as const, label: 'Завершены', items: finished },
  ] as const).filter(s => s.items.length > 0)

  return (
    <div className="fade-in-up">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="section-label mb-2">Архив прогнозов</p>
          <h1 className="text-3xl font-black tracking-tight mb-3">Турниры</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Все Tier 1 турниры — прогнозы серия за серией, с аргументами и результатами. Каждый выбор зафиксирован до начала матча.
          </p>
        </div>
        <Link
          href="/tournaments"
          className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-90 mt-1"
          style={{ background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))' }}
        >
          <span>🇬🇧</span>
          <span>English</span>
        </Link>
      </div>

      {/* Stat strip */}
      {tournamentsWithStats.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap mb-8">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span className="text-sm font-bold text-primary tabular-nums">{tournamentsWithStats.length}</span>
            <span className="text-sm text-muted-foreground">турниров</span>
          </div>
          {totalPredictions > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-secondary/40">
              <span className="text-sm font-bold text-foreground tabular-nums">{totalPredictions}</span>
              <span className="text-sm text-muted-foreground">прогнозов</span>
            </div>
          )}
          {overallAccuracy !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-success/25 bg-success/10">
              <span className="text-sm font-bold tabular-nums" style={{ color: 'hsl(var(--success))' }}>{overallAccuracy}%</span>
              <span className="text-sm text-muted-foreground">точность</span>
            </div>
          )}
        </div>
      )}

      {tournamentsWithStats.length === 0 ? (
        <div className="rounded-2xl p-10 text-center border border-border/60 bg-card/60">
          <p className="font-semibold mb-1">Турниров пока нет</p>
          <p className="text-sm text-muted-foreground">Опубликованные турниры появятся здесь.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {sections.map(({ status, label, items }) => (
            <div key={status}>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border"
                  style={
                    status === 'live'
                      ? { background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))', borderColor: 'hsl(var(--success) / 0.25)' }
                      : status === 'upcoming'
                      ? { background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.25)' }
                      : { background: 'hsl(var(--secondary))', color: 'var(--text-muted)', borderColor: 'hsl(var(--border))' }
                  }
                >
                  {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                  {label}
                </span>
                <span className="text-xs font-bold text-muted-foreground tabular-nums">{items.length}</span>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="grid gap-3">
                {items.map(({ tournament, stats, teamAccuracy }, i) => (
                  <div key={tournament.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <TournamentCard
                      tournament={tournament}
                      stats={stats}
                      teamAccuracy={teamAccuracy}
                      status={status}
                      linkPrefix="/ru/tournaments"
                      locale="ru"
                    />
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
