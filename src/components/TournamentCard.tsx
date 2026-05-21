'use client'

import Link from 'next/link'
import NextImage from 'next/image'
import { useState, useEffect } from 'react'
import type { Tournament, TournamentStats, MatchPrediction, TeamAccuracy } from '@/lib/types'
import MatchCard from './MatchCard'

function sortByStatus(matches: MatchPrediction[]): MatchPrediction[] {
  const now = new Date()
  const priority = (m: MatchPrediction) => {
    if (m.score_team_1 !== null && m.score_team_2 !== null) return 2
    const start = m.match_date && m.match_time ? new Date(`${m.match_date}T${m.match_time}:00Z`) : null
    return start && now >= start ? 0 : 1
  }
  return [...matches].sort((a, b) => {
    const pa = priority(a), pb = priority(b)
    if (pa !== pb) return pa - pb
    const da = a.match_date ?? '', db = b.match_date ?? ''
    if (pa === 2) return db !== da ? db.localeCompare(da) : (b.match_order ?? 0) - (a.match_order ?? 0)
    if (da !== db) return da.localeCompare(db)
    return (a.match_time ?? '').localeCompare(b.match_time ?? '')
  })
}

export type TournamentStatus = 'live' | 'upcoming' | 'finished'

function formatDateRange(start?: string | null, end?: string | null): string | null {
  if (!start) return null
  const s = new Date(start)
  const e = end ? new Date(end) : null
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts })
  if (!e) return fmt(s, { day: 'numeric', month: 'short', year: 'numeric' })
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear()
  const sameMonth = sameYear && s.getUTCMonth() === e.getUTCMonth()
  if (sameMonth) {
    return `${fmt(s, { day: 'numeric', month: 'short' })}–${fmt(e, { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  if (sameYear) {
    return `${fmt(s, { day: 'numeric', month: 'short' })} – ${fmt(e, { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return `${fmt(s, { day: 'numeric', month: 'short', year: 'numeric' })} – ${fmt(e, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

interface Props {
  tournament: Tournament
  stats?: TournamentStats | null
  teamAccuracy?: TeamAccuracy[]
  status?: TournamentStatus
  linkPrefix?: string
  locale?: 'en' | 'ru'
}

const MEDAL = ['#1', '#2', '#3']

const STATUS_BADGE: Record<TournamentStatus, { label: Record<'en'|'ru', string>; style: React.CSSProperties }> = {
  live:     { label: { en: '● Live',      ru: '● Live'      }, style: { background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' } },
  upcoming: { label: { en: 'Upcoming',    ru: 'Скоро'       }, style: { background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' } },
  finished: { label: { en: 'Completed',   ru: 'Завершён'    }, style: { background: 'hsl(var(--border))',          color: 'var(--text-muted)' } },
}

const L10N = {
  en: {
    accuracy: 'accuracy',
    correct: 'correct',
    statistics: 'Statistics',
    predictionAccuracy: 'Prediction accuracy',
    total: 'Total', correctLabel: 'Correct', wrong: 'Wrong',
    bestTeams: 'Best predicted teams',
    showPredictions: 'Show predictions',
    hidePredictions: 'Hide predictions',
    loading: 'Loading predictions...',
    noPredictions: 'No predictions yet.',
    viewFull: 'View full tournament →',
  },
  ru: {
    accuracy: 'точность',
    correct: 'верных',
    statistics: 'Статистика',
    predictionAccuracy: 'Точность прогнозов',
    total: 'Всего', correctLabel: 'Верных', wrong: 'Неверных',
    bestTeams: 'Лучшие предсказанные команды',
    showPredictions: 'Показать прогнозы',
    hidePredictions: 'Скрыть прогнозы',
    loading: 'Загрузка прогнозов...',
    noPredictions: 'Прогнозов пока нет.',
    viewFull: 'Открыть турнир →',
  },
}

export default function TournamentCard({ tournament, stats: initialStats, teamAccuracy: initialTeamAccuracy, status, linkPrefix = '/tournaments', locale = 'en' }: Props) {
  const T = L10N[locale]
  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState<MatchPrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<TournamentStats | null>(initialStats ?? null)
  const [teamAccuracy, setTeamAccuracy] = useState<TeamAccuracy[]>(initialTeamAccuracy ?? [])
  const [statsLoaded, setStatsLoaded] = useState(initialStats !== undefined)

  useEffect(() => {
    if (initialStats !== undefined) return
    fetch(`/api/tournament-stats?tournament_id=${tournament.id}`)
      .then(r => r.json())
      .then(d => {
        setStats(d.stats ?? null)
        setTeamAccuracy(d.teamAccuracy ?? [])
        setStatsLoaded(true)
      })
  }, [tournament.id, initialStats])

  async function handleToggle() {
    if (!open && matches.length === 0) {
      setLoading(true)
      try {
        const res = await fetch(`/api/predictions?tournament_id=${tournament.id}`)
        const data: MatchPrediction[] = await res.json()
        const rows = Array.isArray(data) ? data : []
        const localized = locale === 'ru'
          ? rows.map(p => ({
              ...p,
              pre_analysis: p.pre_analysis_ru ?? p.pre_analysis,
              post_commentary: p.post_commentary_ru ?? p.post_commentary,
            }))
          : rows
        setMatches(sortByStatus(localized))
      } catch {
        setMatches([])
      } finally {
        setLoading(false)
      }
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
          <NextImage src={tournament.banner_url} alt={tournament.name} fill className="object-cover object-center" sizes="(max-width: 768px) 100vw, 900px" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 20%, hsl(var(--background) / 0.85) 100%)' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Link
              href={`${linkPrefix}/${tournament.slug}`}
              className="font-display font-black text-3xl text-white hover:opacity-80 transition-opacity drop-shadow text-center"
            >
              {tournament.name}
            </Link>
            <div className="flex items-center gap-2">
              {status && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={STATUS_BADGE[status].style}>
                  {STATUS_BADGE[status].label[locale]}
                </span>
              )}
              {hasStats && (
                <span className="text-sm px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'var(--correct-dim)', color: 'var(--correct)', border: '1px solid var(--correct-border)' }}>
                  {accuracyPct}% {T.accuracy}
                </span>
              )}
            </div>
            {formatDateRange(tournament.start_date, tournament.end_date) && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.22)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                {formatDateRange(tournament.start_date, tournament.end_date)}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 py-5 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {tournament.logo_url && (
                <NextImage src={tournament.logo_url} alt={tournament.name} width={20} height={20} className="w-5 h-5 object-contain rounded shrink-0" />
              )}
              <span className="badge badge-accent">Tier 1</span>
              {status && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={STATUS_BADGE[status].style}>
                  {STATUS_BADGE[status].label[locale]}
                </span>
              )}
            </div>
            {formatDateRange(tournament.start_date, tournament.end_date) && (
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {formatDateRange(tournament.start_date, tournament.end_date)}
                </span>
              </div>
            )}
            <Link href={`${linkPrefix}/${tournament.slug}`} className="font-display font-bold text-2xl hover:opacity-80 transition-opacity" style={{ color: 'var(--text)' }}>
              {tournament.name}
            </Link>
          </div>
          {hasStats && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-black tabular-nums" style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: accuracyPct >= 60 ? 'var(--correct)' : 'var(--amber)' }}>
                {accuracyPct}%
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats!.correct}/{stats!.total_predictions} {T.correct}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Statistics (always visible once loaded) ── */}
      {statsLoaded && hasStats && (
        <div className="px-5 py-5" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>{T.statistics}</p>

          {/* Accuracy row */}
          <div className="mb-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{T.predictionAccuracy}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: T.total, value: stats!.total_predictions, pct: '100%', color: 'var(--text)' },
                { label: T.correctLabel, value: stats!.correct, pct: `${accuracyPct}%`, color: 'var(--correct)' },
                { label: T.wrong, value: stats!.wrong, pct: `${Math.round((stats!.wrong / stats!.total_predictions) * 100)}%`, color: 'var(--wrong)' },
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
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{T.bestTeams}</p>
              <div className="grid gap-2">
                {teamAccuracy.map((t, i) => (
                  <div key={t.team_id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="text-xs font-black w-6 shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>{MEDAL[i]}</span>
                    {t.logo_url && (
                      <NextImage src={t.logo_url} alt={t.team_name} width={24} height={24} className="w-6 h-6 object-contain shrink-0" />
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
        <span>{open ? T.hidePredictions : T.showPredictions}</span>
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
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>{T.loading}</p>
          ) : matches.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>{T.noPredictions}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {matches.map(m => (
                  <MatchCard key={m.id} match={m} tournament={tournament} locale={locale} teamPrefix={locale === 'ru' ? '/ru/teams' : '/teams'} tournamentPrefix={linkPrefix} />
                ))}
              </div>
              <div className="flex justify-center mt-5">
                <Link
                  href={`${linkPrefix}/${tournament.slug}`}
                  className="px-5 py-2 rounded-full font-semibold text-sm transition-opacity hover:opacity-80"
                  style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
                >
                  {T.viewFull}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
