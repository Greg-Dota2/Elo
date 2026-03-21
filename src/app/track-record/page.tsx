import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Track Record',
  description: 'Full prediction history across every Tier 1 Dota 2 tournament — accuracy, correct picks, and results.',
  openGraph: {
    title: 'Track Record | Dota2ProTips',
    description: 'Full prediction history across every Tier 1 Dota 2 tournament — accuracy, correct picks, and results.',
    url: '/track-record',
  },
  twitter: {
    card: 'summary',
    title: 'Track Record | Dota2ProTips',
    description: 'Full prediction history across every Tier 1 Dota 2 tournament — accuracy, correct picks, and results.',
  },
  alternates: { canonical: '/track-record' },
}

export default async function TrackRecordPage() {
  const supabase = await createClient()

  const [{ data: stats }, { data: tournaments }] = await Promise.all([
    supabase.from('tournament_stats').select('*'),
    supabase.from('tournaments').select('id, name, slug, logo_url, start_date').eq('is_published', true),
  ])

  const tournamentMap = Object.fromEntries((tournaments ?? []).map(t => [t.id, t]))

  const rows = (stats ?? [])
    .filter(s => s.total_predictions > 0)
    .sort((a, b) => {
      const ta = tournamentMap[a.tournament_id]?.start_date ?? ''
      const tb = tournamentMap[b.tournament_id]?.start_date ?? ''
      return tb > ta ? 1 : -1
    })

  // Totals
  const totalPredictions = rows.reduce((s, r) => s + r.total_predictions, 0)
  const totalCorrect = rows.reduce((s, r) => s + r.correct, 0)
  const totalWrong = rows.reduce((s, r) => s + r.wrong, 0)
  const overallPct = totalPredictions > 0 ? Math.round((totalCorrect / totalPredictions) * 100) : 0

  return (
    <div className="fade-in-up max-w-3xl mx-auto py-8">
      <p className="section-label mb-3">All tournaments</p>
      <h1 className="font-display text-4xl font-black tracking-tight mb-2">Track Record</h1>
      <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>
        Every prediction I&apos;ve made, tournament by tournament. No edits after the fact.
      </p>

      {/* ── Overall summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: 'Tournaments', value: rows.length, color: 'var(--text)' },
          { label: 'Total picks', value: totalPredictions, color: 'var(--text)' },
          { label: 'Correct', value: totalCorrect, color: 'var(--correct)' },
          { label: 'Accuracy', value: `${overallPct}%`, color: overallPct >= 60 ? 'var(--correct)' : '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl px-5 py-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-3xl font-black tabular-nums leading-none mb-1" style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Per-tournament table ── */}
      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data yet.</p>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_90px] px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
            <span>Tournament</span>
            <span className="text-center">Picks</span>
            <span className="text-center">Correct</span>
            <span className="text-center">Wrong</span>
            <span className="text-center">Accuracy</span>
          </div>

          {rows.map((row, i) => {
            const t = tournamentMap[row.tournament_id] ?? null
            const pct = row.accuracy_pct ?? 0
            return (
              <div
                key={row.tournament_id}
                className="grid grid-cols-[1fr_80px_80px_80px_90px] px-5 py-4 items-center"
                style={{
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Tournament name */}
                <div className="flex items-center gap-3 min-w-0">
                  {t?.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" src={t.logo_url} alt={t.name} className="w-6 h-6 object-contain shrink-0 rounded" />
                  )}
                  <div className="min-w-0">
                    <Link
                      href={t?.slug ? `/tournaments/${t.slug}` : '/tournaments'}
                      className="font-semibold text-sm hover:text-primary transition-colors truncate block"
                    >
                      {t?.name ?? '—'}
                    </Link>
                    {t?.start_date && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(t.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Picks */}
                <span className="text-center text-sm font-semibold tabular-nums">{row.total_predictions}</span>

                {/* Correct */}
                <span className="text-center text-sm font-semibold tabular-nums" style={{ color: 'var(--correct)' }}>{row.correct}</span>

                {/* Wrong */}
                <span className="text-center text-sm font-semibold tabular-nums" style={{ color: 'var(--wrong)' }}>{row.wrong}</span>

                {/* Accuracy */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-base font-black tabular-nums" style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: pct >= 60 ? 'var(--correct)' : '#f59e0b' }}>
                    {pct}%
                  </span>
                  <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 60 ? 'var(--correct)' : '#f59e0b' }} />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Totals row */}
          <div
            className="grid grid-cols-[1fr_80px_80px_80px_90px] px-5 py-4 items-center"
            style={{ background: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}
          >
            <span className="font-bold text-sm">Overall</span>
            <span className="text-center text-sm font-bold tabular-nums">{totalPredictions}</span>
            <span className="text-center text-sm font-bold tabular-nums" style={{ color: 'var(--correct)' }}>{totalCorrect}</span>
            <span className="text-center text-sm font-bold tabular-nums" style={{ color: 'var(--wrong)' }}>{totalWrong}</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-base font-black tabular-nums" style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: overallPct >= 60 ? 'var(--correct)' : '#f59e0b' }}>
                {overallPct}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
