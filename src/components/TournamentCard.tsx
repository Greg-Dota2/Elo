'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import type { Tournament, TournamentStats, MatchPrediction, TeamAccuracy } from '@/lib/types'
import MatchCard from './MatchCard'

interface Props {
  tournament: Tournament
  stats?: TournamentStats | null
}

const MEDAL = ['#1', '#2', '#3']

export default function TournamentCard({ tournament }: Props) {
  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState<MatchPrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<TournamentStats | null>(null)
  const [teamAccuracy, setTeamAccuracy] = useState<TeamAccuracy[]>([])
  const [statsLoaded, setStatsLoaded] = useState(false)

  useEffect(() => {
    // Fetch stats eagerly so they show under the banner without needing a click
    fetch(`/api/tournament-stats?tournament_id=${tournament.id}`)
      .then(r => r.json())
      .then(d => {
        setStats(d.stats ?? null)
        setTeamAccuracy(d.teamAccuracy ?? [])
        setStatsLoaded(true)
      })
  }, [tournament.id])

  async function handleToggle() {
    if (!open && matches.length === 0) {
      setLoading(true)
      const res = await fetch(`/api/predictions?tournament_id=${tournament.id}`)
      const data = await res.json()
      setMatches(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    setOpen(o => !o)
  }

  const hasStats = stats && stats.total_predictions > 0
  const accuracyPct = stats?.accuracy_pct ?? 0

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>

      {/* ── Banner ── */}
      {tournament.banner_url ? (
        <div className="relative overflow-hidden" style={{ height: 180 }}>
          <Image src={tournament.banner_url} alt={tournament.name} fill className="object-cover object-center" sizes="(max-width: 768px) 100vw, 900px" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 20%, hsl(var(--background) / 0.85) 100%)' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Link
              href={`/tournaments/${tournament.slug}`}
              className="font-display font-black text-3xl text-white hover:opacity-80 transition-opacity drop-shadow text-center"
            >
              {tournament.name}
            </Link>
            {hasStats && (
              <span className="text-sm px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'var(--correct-dim)', color: 'var(--correct)', border: '1px solid var(--correct-border)' }}>
                {accuracyPct}% accuracy
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 py-5 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {tournament.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" src={tournament.logo_url} alt={tournament.name} className="w-5 h-5 object-contain rounded shrink-0" />
              )}
              <span className="badge badge-accent">Tier 1</span>
              {tournament.start_date && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(tournament.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            <Link href={`/tournaments/${tournament.slug}`} className="font-display font-bold text-2xl hover:opacity-80 transition-opacity" style={{ color: 'var(--text)' }}>
              {tournament.name}
            </Link>
          </div>
          {hasStats && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-black tabular-nums" style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: accuracyPct >= 60 ? 'var(--correct)' : 'var(--amber)' }}>
                {accuracyPct}%
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats!.correct}/{stats!.total_predictions} correct</div>
            </div>
          )}
        </div>
      )}

      {/* ── Statistics (always visible once loaded) ── */}
      {statsLoaded && hasStats && (
        <div className="px-5 py-5" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Statistics</p>

          {/* Accuracy row */}
          <div className="mb-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Prediction accuracy</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: stats!.total_predictions, pct: '100%', color: 'var(--text)' },
                { label: 'Correct', value: stats!.correct, pct: `${accuracyPct}%`, color: 'var(--correct)' },
                { label: 'Wrong', value: stats!.wrong, pct: `${Math.round((stats!.wrong / stats!.total_predictions) * 100)}%`, color: 'var(--wrong)' },
              ].map(s => (
                <div key={s.label} className="rounded-xl px-3 py-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="text-2xl font-black tabular-nums leading-none mb-1" style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: s.color }}>{s.value}</div>
                  <div className="text-xs font-semibold" style={{ color: s.color }}>{s.pct}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Best predicted teams */}
          {teamAccuracy.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Best predicted teams</p>
              <div className="grid gap-2">
                {teamAccuracy.map((t, i) => (
                  <div key={t.team_id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="text-xs font-black w-6 shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>{MEDAL[i]}</span>
                    {t.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={t.logo_url} alt={t.team_name} className="w-6 h-6 object-contain shrink-0" />
                    )}
                    <span className="flex-1 text-sm font-semibold">{t.team_name}</span>
                    <span className="text-sm font-black tabular-nums" style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: (t.accuracy_pct ?? 0) >= 60 ? 'var(--correct)' : 'var(--amber)' }}>
                      {t.accuracy_pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Toggle button ── */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/[0.03]"
        style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}
      >
        <span>{open ? 'Hide predictions' : 'Show predictions'}</span>
        <span
          className="transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}
        >
          ↓
        </span>
      </button>

      {/* ── Prediction cards ── */}
      {open && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
          {loading ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Loading predictions...</p>
          ) : matches.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No predictions yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {matches.map(m => (
                  <MatchCard key={m.id} match={m} tournament={tournament} />
                ))}
              </div>
              <div className="flex justify-center mt-5">
                <Link
                  href={`/tournaments/${tournament.slug}`}
                  className="px-5 py-2 rounded-full font-semibold text-sm transition-opacity hover:opacity-80"
                  style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
                >
                  View full tournament →
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
