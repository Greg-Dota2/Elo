import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTournaments, getTournamentStats, getPredictionsByTournament, sortMatchesByStatus } from '@/lib/queries'
import MatchCard from '@/components/MatchCard'
import TournamentCard from '@/components/TournamentCard'
import PSBracketView from '@/components/PSBracketView'
import Link from 'next/link'
import Image from 'next/image'
import { fetchUpcomingTier1Matches, fetchRunningTier1Matches, fetchMatchesForSubTournament } from '@/lib/pandascore'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Dota2ProTips — Dota 2 Match Predictions',
  description: 'Expert Dota 2 match predictions for Tier 1 pro tournaments — pre-match analysis, ELO rankings, and accuracy tracked across every pick. See who wins before they play.',
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
  const rest = tournaments.slice(1)

  const [latestMatches, latestStats] = latest
    ? await Promise.all([
        getPredictionsByTournament(latest.id).catch(() => []),
        getTournamentStats(latest.id).catch(() => null),
      ])
    : [[], null]

  const featuredMatches = sortMatchesByStatus(latestMatches)

  return (
    <div className="fade-in-up">

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
            <span className="section-kicker mb-5 inline-flex items-center gap-1.5">
              ✦ Where the real Dota happens.
            </span>

            <h1 className="font-display text-5xl font-bold leading-[0.95] md:text-7xl lg:text-[5.2rem] mb-6">
              My Dota 2{' '}
              <span className="gradient-text">Predictions.</span>
            </h1>

            <p className="text-lg leading-8 text-muted-foreground md:text-xl max-w-2xl mb-8">
              This is a space where I put my predictions on upcoming matches. I predict based on my experience and the performance of Pro Teams — and I comment on every single one, with an aftermath added after each match.
            </p>

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
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-base border transition-colors hover:border-primary/50 text-muted-foreground"
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                Track record
              </Link>
            </div>

            {/* 3 principle cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: '🛡', title: 'Always free', text: 'No paywalls, no accounts, nothing to unlock. Just open the site and read.' },
                { icon: '✍️', title: 'Before the draft', text: 'I commit before the heroes are even picked. No backdating, no excuses.' },
                { icon: '📊', title: 'Tracked publicly', text: 'Every correct and every wrong call is on display. I have nowhere to hide.' },
              ].map(p => (
                <div key={p.title} className="panel-shell p-4">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'hsl(var(--secondary))' }}>
                    <span className="text-xl">{p.icon}</span>
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
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="section-kicker mb-3 inline-flex items-center gap-1.5">
                    ● Latest picks
                  </span>
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
                {latestStats && latestStats.accuracy_pct !== null && (
                  <span className="text-sm font-semibold px-3 py-1.5 rounded-full shrink-0" style={{ background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' }}>
                    {latestStats.accuracy_pct}% accuracy
                  </span>
                )}
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
                      className="rounded-[1.4rem] border px-5 py-5"
                      style={{ borderColor: 'hsl(var(--border) / 0.7)', background: 'hsl(var(--secondary) / 0.55)' }}
                    >
                      {/* Teams row */}
                      <div className="flex items-center gap-3 flex-wrap mb-4">
                        <div className="flex items-center gap-2.5">
                          {t1?.logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img loading="lazy" src={t1.logo_url} alt={t1.name} className="w-8 h-8 object-contain shrink-0" />
                          )}
                          <span className="font-display font-bold text-foreground text-xl">
                            {t1?.slug ? <Link href={`/teams/${t1.slug}`} className="hover:text-primary transition-colors">{t1?.name}</Link> : t1?.name}
                          </span>
                        </div>
                        <span className="text-muted-foreground font-normal text-base">vs</span>
                        <div className="flex items-center gap-2.5">
                          {t2?.logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img loading="lazy" src={t2.logo_url} alt={t2.name} className="w-8 h-8 object-contain shrink-0" />
                          )}
                          <span className="font-display font-bold text-foreground text-xl">
                            {t2?.slug ? <Link href={`/teams/${t2.slug}`} className="hover:text-primary transition-colors">{t2?.name}</Link> : t2?.name}
                          </span>
                        </div>
                      </div>
                      {/* Analysis */}
                      {m.pre_analysis && (
                        <p className="text-base text-muted-foreground line-clamp-2 mb-4 leading-7">{m.pre_analysis}</p>
                      )}
                      {/* Pick */}
                      {(pick || m.predicted_draw) && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground/60 uppercase tracking-widest">Pick</span>
                          <div
                            className="rounded-full border px-3 py-1.5 flex items-center gap-2"
                            style={{ borderColor: 'hsl(var(--border) / 0.7)', background: 'hsl(var(--background) / 0.55)', color: 'hsl(var(--muted-foreground))' }}
                          >
                            {pick?.logo_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img loading="lazy" src={pick.logo_url} alt={pick.name} className="w-5 h-5 object-contain" />
                            )}
                            <span className="text-base font-semibold">{pick ? (pick.short_name ?? pick.name) : 'Draw (1–1)'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer blurb */}
              <div className="rounded-[1.6rem] border p-5" style={{ borderColor: 'hsl(var(--border) / 0.7)', background: 'hsl(var(--background) / 0.45)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground mb-2">What you get here</p>
                <p className="font-display text-xl leading-tight text-foreground">
                  One pick per match. My honest read, written before the draft. No fluff, no hedging.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* ── Latest tournament predictions ── */}
      {tournaments.length > 0 && (
        <hr style={{ borderColor: 'hsl(var(--border) / 0.5)', marginBottom: '2.5rem' }} />
      )}
      {tournaments.length > 0 && (
        <>
          {latest && (
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
          <Suspense fallback={<div style={{ height: 120 }} />}>
            <BracketSection latestSlug={latest.slug} />
          </Suspense>

          {featuredMatches.length > 0 ? (() => {
            const activeMatches = featuredMatches.filter(m => m.score_team_1 === null || m.score_team_2 === null)
            const finishedMatches = featuredMatches.filter(m => m.score_team_1 !== null && m.score_team_2 !== null)
            return (
              <div className="mb-12">
                {activeMatches.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {activeMatches.map((match, i) => (
                      <div key={match.id} className="fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
                        <MatchCard match={match} showTournament tournament={latest ?? undefined} />
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
                          <MatchCard match={match} showTournament tournament={latest ?? undefined} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {activeMatches.length === 0 && finishedMatches.length === 0 && null}
              </div>
            )
          })() : (
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
          )}

          {rest.length > 0 && (
            <div className="mb-12">
              <p className="section-label mb-4">Previous Tournaments</p>
              <div className="grid gap-0">
                {rest.map((t, i) => (
                  <div key={t.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    {i > 0 && <div style={{ borderTop: '1px solid hsl(var(--border) / 0.5)' }} />}
                    <TournamentCard tournament={t} />
                  </div>
                ))}
              </div>
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
