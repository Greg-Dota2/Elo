'use client'

import Link from 'next/link'
import type { Tournament, TournamentStats } from '@/lib/types'

interface Props {
  tournament: Tournament
  stats?: TournamentStats | null
}

export default function TournamentCard({ tournament, stats }: Props) {
  const hasStats = stats && stats.total_predictions > 0
  const accuracyPct = stats?.accuracy_pct ?? 0

  return (
    <Link href={`/tournaments/${tournament.slug}`}>
      <div
        className="rounded-xl p-4 cursor-pointer transition-all duration-200 group"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--accent-border)'
          el.style.boxShadow = 'var(--shadow-md), 0 0 0 1px var(--accent-dim)'
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--border)'
          el.style.boxShadow = 'var(--shadow-sm)'
          el.style.transform = 'translateY(0)'
        }}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: name + meta */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {tournament.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tournament.logo_url}
                  alt={tournament.name}
                  className="w-5 h-5 object-contain rounded"
                />
              )}
              <span className="badge badge-accent">Tier 1</span>
              {tournament.start_date && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(tournament.start_date).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
              {tournament.name}
            </h3>
            {hasStats && (
              <div className="flex items-center gap-1.5 mt-2">
                {/* Mini accuracy bar */}
                <div
                  className="h-1 w-20 rounded-full overflow-hidden"
                  style={{ background: 'var(--surface-3)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${accuracyPct}%`,
                      background: accuracyPct >= 60
                        ? 'linear-gradient(90deg, var(--correct), hsl(154,71%,55%))'
                        : 'linear-gradient(90deg, var(--amber), hsl(35,94%,72%))',
                    }}
                  />
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {stats!.correct}/{stats!.total_predictions} correct
                </span>
              </div>
            )}
          </div>

          {/* Right: accuracy % */}
          <div className="text-right shrink-0 flex flex-col items-end">
            {hasStats ? (
              <>
                <div
                  className="text-2xl font-black tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-oxanium), sans-serif',
                    color: accuracyPct >= 60 ? 'var(--correct)' : 'var(--amber)',
                  }}
                >
                  {accuracyPct}%
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  accuracy
                </div>
              </>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                No data
              </span>
            )}
            <span
              className="text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ color: 'var(--accent)' }}
            >
              View →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
