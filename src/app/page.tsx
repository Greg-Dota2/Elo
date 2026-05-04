import type { Metadata } from 'next'
import type React from 'react'
import { Suspense } from 'react'
import { getTournaments, getTournamentStats, getPredictionsByTournament, sortMatchesByStatus } from '@/lib/queries'
import MatchCard from '@/components/MatchCard'
import TournamentCard from '@/components/TournamentCard'
import PSBracketView from '@/components/PSBracketView'
import Link from 'next/link'
import Image from 'next/image'
import { fetchUpcomingTier1Matches, fetchRunningTier1Matches, fetchMatchesForSubTournament } from '@/lib/pandascore'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Dota 2 Pro Match Predictions & Analysis',
  description: 'Expert Dota 2 match predictions for every Tier 1 tournament — written before the draft, tracked publicly, with honest aftermath on every call. ~70% accuracy across hundreds of picks.',
  keywords: [
    'Dota 2 predictions', 'Dota 2 match predictions', 'Dota 2 match analysis',
    'Dota 2 esports', 'pro Dota 2', 'Dota 2 tips',
    'ELO rankings', 'Dota 2 winner prediction', 'Dota 2 betting analysis',
    'ESL One prediction', 'The International prediction', 'Dota 2 Major',
  ],
}

export default async function HomePage() {
  let tournaments: Awaited<ReturnType<typeof getTournaments>> = []

  try {
    tournaments = await getTournaments()
  } catch { /* Supabase not configured */ }

  const latest = tournaments[0] ?? null

  const now = new Date()
  function tournamentStatus(t: { start_date?: string | null; end_date?: string | null }): 'live' | 'upcoming' | 'finished' | 'unknown' {
    if (!t.start_date) return 'unknown'
    const start = new Date(t.start_date)
    const end = t.end_date ? new Date(t.end_date + 'T23:59:59Z') : null
    if (end && end < now) return 'finished'
    if (start > now) return 'upcoming'
    return 'live'
  }
  // Use all tournaments in the grouped list so completed ones don't float above upcoming ones
  const restLive     = tournaments.filter(t => tournamentStatus(t) === 'live')
  const restUpcoming = tournaments.filter(t => tournamentStatus(t) === 'upcoming')
    .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))
  const restFinished = tournaments.filter(t => tournamentStatus(t) === 'finished' || tournamentStatus(t) === 'unknown')
    .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))

  const tier1Entry = latest
    ? TIER1_TOURNAMENTS.find(t => t.slug === latest.slug) as
        | (typeof TIER1_TOURNAMENTS[0] & { ps_group_stage_id?: number })
        | undefined
    : undefined

  const isLatestOver = latest?.end_date ? new Date(latest.end_date + 'T23:59:59Z') < new Date() : false

  const [latestMatches, latestStats, runningPS, swissMatches] = latest
    ? await Promise.all([
        getPredictionsByTournament(latest.id).catch(() => []),
        getTournamentStats(latest.id).catch(() => null),
        isLatestOver ? Promise.resolve([]) : fetchRunningTier1Matches(20).catch(() => []),
        isLatestOver ? Promise.resolve([]) : tier1Entry?.ps_group_stage_id
          ? fetchMatchesForSubTournament(tier1Entry.ps_group_stage_id).catch(() => [])
          : Promise.resolve([]),
      ])
    : [[], null, [], []]

  // Build live score map from running PS sources
  interface LiveScoreEntry { nameA: string; nameB: string; scoreA: number; scoreB: number }
  const liveScoreMap = new Map<string, LiveScoreEntry>()
  for (const m of [...swissMatches, ...runningPS]) {
    if (m.status !== 'running') continue
    const oppA = m.opponents[0]?.opponent
    const oppB = m.opponents[1]?.opponent
    if (!oppA || !oppB) continue
    const scoreA = m.results.find(r => r.team_id === oppA.id)?.score ?? 0
    const scoreB = m.results.find(r => r.team_id === oppB.id)?.score ?? 0
    const entry: LiveScoreEntry = { nameA: oppA.name, nameB: oppB.name, scoreA, scoreB }
    liveScoreMap.set(String(m.id), entry)
    liveScoreMap.set([oppA.name.toLowerCase(), oppB.name.toLowerCase()].sort().join('|'), entry)
  }

  function resolveLiveScore(match: { pandascore_match_id: number | null; team_1?: { name: string } | null; team_2?: { name: string } | null }) {
    const t1 = match.team_1?.name ?? ''
    const t2 = match.team_2?.name ?? ''
    let entry = match.pandascore_match_id ? liveScoreMap.get(String(match.pandascore_match_id)) : undefined
    if (!entry) entry = liveScoreMap.get([t1.toLowerCase(), t2.toLowerCase()].sort().join('|'))
    if (!entry) return undefined
    const aL = entry.nameA.toLowerCase(), t1L = t1.toLowerCase()
    const t1IsA = aL === t1L || t1L.includes(aL) || aL.includes(t1L)
    return { score1: t1IsA ? entry.scoreA : entry.scoreB, score2: t1IsA ? entry.scoreB : entry.scoreA }
  }

  const featuredMatches = sortMatchesByStatus(latestMatches)

  return (
    <div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pb-16 pt-20 md:pb-20 md:pt-28 mb-12">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full blur-[120px]" style={{ background: 'hsl(var(--primary) / 0.12)' }} />
          <div className="absolute right-[-6rem] top-48 h-72 w-72 rounded-full blur-[120px]" style={{ background: 'hsl(var(--accent) / 0.10)' }} />
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">

          {/* Left */}
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-black uppercase tracking-widest backdrop-blur-sm text-muted-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/global/dota2_logo_symbol.png" alt="Dota 2" className="w-4 h-4 object-contain" />
              Where the real Dota happens.
            </span>

            <h1 className="font-display text-5xl font-bold leading-[0.95] md:text-7xl lg:text-[5.2rem] mb-6">
              My Dota 2{' '}
              <span className="gradient-text">Predictions.</span>
            </h1>

            <p className="text-lg leading-8 text-muted-foreground md:text-xl max-w-2xl mb-8">
              This is a space where I put my predictions on upcoming matches. I predict based on my experience and the performance of Pro Teams — and I comment on every single one, with an aftermath added after each match.
            </p>

            {/* Credibility stats */}
            <div className="flex items-center gap-6 mb-8 py-4" style={{ borderTop: '1px solid hsl(var(--border) / 0.5)', borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
              {[
                { value: '~70%', label: 'prediction accuracy', color: 'hsl(var(--primary))' },
                { value: '600+', label: 'picks tracked',       color: 'var(--foreground)' },
                { value: 'Tier 1', label: 'matches only',      color: 'hsl(45 90% 60%)' },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-6">
                  {i > 0 && <div className="w-px self-stretch" style={{ background: 'hsl(var(--border) / 0.6)' }} />}
                  <div>
                    <p className="font-display text-2xl font-black tabular-nums leading-none mb-0.5" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row mb-10">
              <Link
                href={latest ? `/tournaments/${latest.slug}` : '/tournaments'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-base transition-opacity hover:opacity-85"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
              >
                See the picks →
              </Link>
              <Link
                href="/track-record"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-base text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--accent) / 0.20))', border: '1px solid hsl(var(--primary) / 0.45)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                Track record
              </Link>
            </div>

            {/* 3 principle cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                    </svg>
                  ),
                  title: 'Always free',
                  text: 'No paywalls, no accounts, nothing to unlock. Just open the site and read.',
                  iconBg: 'hsl(142 70% 45% / 0.12)',
                  iconColor: 'hsl(142 70% 55%)',
                  accent: 'hsl(142 70% 55% / 0.15)',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  ),
                  title: 'Before the draft',
                  text: 'I commit before the heroes are even picked. No backdating, no excuses.',
                  iconBg: 'hsl(38 90% 55% / 0.12)',
                  iconColor: 'hsl(38 90% 60%)',
                  accent: 'hsl(38 90% 55% / 0.15)',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ),
                  title: 'Tracked publicly',
                  text: 'Every correct and every wrong call is on display. I have nowhere to hide.',
                  iconBg: 'hsl(var(--primary) / 0.12)',
                  iconColor: 'hsl(var(--primary))',
                  accent: 'hsl(var(--primary) / 0.15)',
                },
              ] as { icon: React.ReactNode; title: string; text: string; iconBg: string; iconColor: string; accent: string }[]).map(p => (
                <div key={p.title} className="panel-shell p-4 relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${p.iconColor}, transparent)`, opacity: 0.4 }} />
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: p.iconBg, color: p.iconColor }}>
                    {p.icon}
                  </div>
                  <p className="font-display text-base font-semibold text-foreground">{p.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{p.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: live board preview — hidden on mobile to avoid excessive scroll */}
          {featuredMatches.length > 0 && (
            <div className="hidden md:block panel-shell relative overflow-hidden p-5 md:p-7">
              <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full blur-3xl" style={{ background: 'hsl(var(--primary) / 0.12)' }} />

              {/* Tournament banner */}
              {latest?.banner_url && (
                <div className="relative -mx-5 md:-mx-7 -mt-5 md:-mt-7 mb-5 overflow-hidden rounded-t-[inherit]" style={{ height: 120 }}>
                  <Image src={latest.banner_url} alt={latest.name} fill priority className="object-cover object-center" sizes="(max-width: 768px) 100vw, 600px" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, hsl(var(--card) / 0.85) 100%)' }} />
                </div>
              )}

              {/* Card header */}
              <div className="mb-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'hsl(var(--success))' }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'hsl(var(--success))' }} />
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'hsl(var(--success))' }}>Latest picks</span>
                  </div>
                  {latestStats && latestStats.accuracy_pct !== null && (
                    <span className="text-sm font-semibold px-3 py-1.5 rounded-full shrink-0" style={{ background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' }}>
                      {latestStats.accuracy_pct}% accuracy
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {latest?.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" src={latest.logo_url} alt={latest.name} className="w-8 h-8 object-contain shrink-0 rounded" />
                  )}
                  <Link href={`/tournaments/${latest?.slug}`} className="font-display text-3xl font-bold md:text-4xl hover:text-primary transition-colors">
                    {latest?.name ?? 'Recent picks'}
                  </Link>
                </div>
              </div>

              {/* Match rows */}
              <div className="grid gap-3 mb-5">
                {featuredMatches.slice(0, 3).map(m => {
                  const t1 = m.team_1
                  const t2 = m.team_2
                  const pick = m.predicted_winner
                  return (
                    <div
                      key={m.id}
                      className="rounded-[1.4rem] border px-5 py-4 relative overflow-hidden"
                      style={{ borderColor: 'hsl(var(--border) / 0.7)', background: 'hsl(var(--secondary) / 0.55)' }}
                    >
                      {/* Top accent line */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.35), transparent)' }} />

                      {/* Teams row */}
                      <div className="flex items-center gap-2.5 flex-wrap mb-3">
                        <div className="flex items-center gap-2">
                          {t1?.logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img loading="lazy" src={t1.logo_url} alt={t1.name} className="w-7 h-7 object-contain shrink-0" />
                          )}
                          <span className="font-display font-bold text-foreground text-lg">
                            {t1?.slug ? <Link href={`/teams/${t1.slug}`} className="hover:text-primary transition-colors">{t1?.name}</Link> : t1?.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground/50 px-1.5 py-0.5 rounded border border-border/40 tracking-wider">VS</span>
                        <div className="flex items-center gap-2">
                          {t2?.logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img loading="lazy" src={t2.logo_url} alt={t2.name} className="w-7 h-7 object-contain shrink-0" />
                          )}
                          <span className="font-display font-bold text-foreground text-lg">
                            {t2?.slug ? <Link href={`/teams/${t2.slug}`} className="hover:text-primary transition-colors">{t2?.name}</Link> : t2?.name}
                          </span>
                        </div>
                      </div>

                      {/* Analysis */}
                      {m.pre_analysis && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-6">{m.pre_analysis}</p>
                      )}

                      {/* Pick */}
                      {(pick || m.predicted_draw) && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>→ Pick</span>
                          <div
                            className="rounded-full px-3 py-1.5 flex items-center gap-1.5"
                            style={{ background: 'hsl(var(--background) / 0.65)', color: 'var(--foreground)', border: '1px solid hsl(var(--border) / 0.9)' }}
                          >
                            {pick?.logo_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img loading="lazy" src={pick.logo_url} alt={pick.name} className="w-4 h-4 object-contain" />
                            )}
                            <span className="text-sm font-bold text-foreground">{pick ? (pick.short_name ?? pick.name) : 'Draw (1–1)'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer blurb */}
              <div className="rounded-[1.6rem] border p-5 relative overflow-hidden" style={{ borderColor: 'hsl(var(--border) / 0.7)', background: 'hsl(var(--background) / 0.45)' }}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)' }} />
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground mb-2">What you get here</p>
                <p className="font-display text-xl leading-tight text-foreground">
                  One pick per match. My honest read, written before the draft. No fluff, no hedging.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* ── Latest tournament predictions (only while live/upcoming) ── */}
      {latest && !isLatestOver && (
        <hr style={{ borderColor: 'hsl(var(--border) / 0.5)', marginBottom: '2.5rem' }} />
      )}
      {tournaments.length > 0 && (
        <>
          {latest && !isLatestOver && (
            <div className="mb-5">
              {/* Banner */}
              {latest.banner_url && (
                <div className="relative rounded-2xl overflow-hidden mb-4" style={{ height: 180 }}>
                  <Image src={latest.banner_url} alt={latest.name} fill priority className="object-cover object-center" sizes="(max-width: 768px) 100vw, 800px" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 20%, hsl(var(--background) / 0.85) 100%)' }} />
                  {/* Overlay text — centered */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Link
                      href={`/tournaments/${latest.slug}`}
                      className="font-display font-black text-4xl text-white hover:opacity-80 transition-opacity drop-shadow text-center"
                    >
                      {latest.name}
                    </Link>
                    <div className="flex items-center gap-3">
                      {latestStats && latestStats.total_predictions > 0 && (
                        <span className="text-sm px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'var(--correct-dim)', color: 'var(--correct)', border: '1px solid var(--correct-border)' }}>
                          {latestStats.accuracy_pct}% accuracy
                        </span>
                      )}
                      <Link href={`/tournaments/${latest.slug}`} className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                        View all →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback: no banner */}
              {!latest.banner_url && (
                <div className="rounded-2xl px-7 py-6 mb-5 flex items-center justify-between gap-4" style={{ background: 'hsl(var(--card) / 0.6)', border: '1px solid hsl(var(--border) / 0.6)' }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'hsl(var(--primary))' }}>Latest Tournament</p>
                    <Link href={`/tournaments/${latest.slug}`} className="font-display font-bold text-3xl hover:opacity-80 transition-opacity" style={{ color: 'var(--text)' }}>
                      {latest.name}
                    </Link>
                    {latestStats && latestStats.total_predictions > 0 && (
                      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {latestStats.total_predictions} predictions · <span style={{ color: 'var(--correct)' }}>{latestStats.accuracy_pct}% accuracy</span>
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/tournaments/${latest.slug}`}
                    className="shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm transition-opacity hover:opacity-80"
                    style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
                  >
                    View all →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ── Playoff Bracket ── */}
          {latest && !isLatestOver && (
            <Suspense fallback={<div style={{ height: 120 }} />}>
              <BracketSection latestSlug={latest.slug} />
            </Suspense>
          )}

          {!isLatestOver && featuredMatches.length > 0 ? (() => {
            const activeMatches = featuredMatches.filter(m => m.score_team_1 === null || m.score_team_2 === null)
            const finishedMatches = featuredMatches.filter(m => m.score_team_1 !== null && m.score_team_2 !== null)
            return (
              <div className="mb-12">
                <h2 className="section-label mb-4">Predictions</h2>
                {activeMatches.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {activeMatches.map((match, i) => (
                      <div key={match.id} className="fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
                        <MatchCard match={match} showTournament tournament={latest ?? undefined} liveScore={resolveLiveScore(match)} />
                      </div>
                    ))}
                  </div>
                )}
                {finishedMatches.length > 0 && (
                  <details className="group">
                    <summary
                      className="flex items-center justify-between gap-3 cursor-pointer select-none rounded-2xl px-5 py-4 mb-4"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Tournament logo */}
                        {latest?.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img loading="lazy" src={latest.logo_url} alt={latest.name} className="w-7 h-7 object-contain shrink-0 rounded" />
                        )}
                        {/* Tournament name */}
                        <span className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
                          {latest?.name}
                        </span>
                        {/* Date */}
                        {finishedMatches[0]?.match_date && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: 'hsl(var(--muted))', color: 'var(--text-muted)' }}>
                            {new Date(finishedMatches[0].match_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {/* Count badge */}
                        <span
                          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black tabular-nums shrink-0"
                          style={{ background: 'hsl(var(--muted))', color: 'var(--text-muted)' }}
                        >
                          {finishedMatches.length}
                        </span>
                      </div>
                      <span
                        className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all group-open:opacity-0"
                        style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}
                      >
                        Show ▾
                      </span>
                    </summary>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {finishedMatches.map((match, i) => (
                        <div key={match.id} className="fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
                          <MatchCard match={match} showTournament tournament={latest ?? undefined} liveScore={resolveLiveScore(match)} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {activeMatches.length === 0 && finishedMatches.length === 0 && null}
              </div>
            )
          })() : (
            !isLatestOver ? (
              <div
                className="rounded-2xl p-10 text-center mb-12"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-4xl mb-3">✍️</p>
                <p className="font-semibold mb-1">No predictions written yet</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  <Link href="/admin" style={{ color: 'var(--accent)' }}>Write the first one →</Link>
                </p>
              </div>
            ) : null
          )}

          {tournaments.length > 0 && (
            <div className="mb-12">
              <h2 className="section-label mb-4">Tournaments</h2>

              {restLive.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' }}>
                      ● Live
                    </span>
                  </div>
                  {restLive.map((t, i) => (
                    <div key={t.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                      {i > 0 && <div style={{ borderTop: '1px solid hsl(var(--border) / 0.5)' }} />}
                      <TournamentCard tournament={t} status="live" />
                    </div>
                  ))}
                </div>
              )}

              {restUpcoming.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' }}>
                      Upcoming
                    </span>
                  </div>
                  {restUpcoming.map((t, i) => (
                    <div key={t.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                      {i > 0 && <div style={{ borderTop: '1px solid hsl(var(--border) / 0.5)' }} />}
                      <TournamentCard tournament={t} status="upcoming" />
                    </div>
                  ))}
                </div>
              )}

              {restFinished.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'hsl(var(--border))', color: 'var(--text-muted)' }}>
                      Completed
                    </span>
                  </div>
                  {restFinished.map((t, i) => (
                    <div key={t.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                      {i > 0 && <div style={{ borderTop: '1px solid hsl(var(--border) / 0.5)' }} />}
                      <TournamentCard tournament={t} status="finished" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  )
}

async function BracketSection({ latestSlug }: { latestSlug: string }) {
  let bracketGroups: { name: string; matches: Awaited<ReturnType<typeof fetchMatchesForSubTournament>> }[] = []
  try {
    const [upcomingPS, runningPS] = await Promise.all([
      fetchUpcomingTier1Matches(50).catch(() => []),
      fetchRunningTier1Matches(20).catch(() => []),
    ])
    const psMatches = [...runningPS, ...upcomingPS].filter(m => {
      const psSlug = `${m.league.name}-${m.serie.full_name}`
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      return psSlug === latestSlug
    })
    const byGroup = psMatches.reduce<Record<string, typeof psMatches>>((acc, m) => {
      const key = String(m.tournament.id)
      if (!acc[key]) acc[key] = []
      acc[key].push(m)
      return acc
    }, {})
    bracketGroups = await Promise.all(
      Object.entries(byGroup).map(async ([subId, matches]) => {
        const allMatches = await fetchMatchesForSubTournament(Number(subId)).catch(() => matches)
        return { name: matches[0].tournament.name, matches: allMatches }
      })
    )
  } catch { /* non-critical */ }
  return <PSBracketView groups={bracketGroups} />
}
