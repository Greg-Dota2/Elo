import { getTournaments, getTournamentStats, getPredictionsByTournament } from '@/lib/queries'
import { fetchUpcomingTier1Matches, fetchRecentTier1Matches, PSMatch } from '@/lib/pandascore'
import MatchCard from '@/components/MatchCard'
import TournamentCard from '@/components/TournamentCard'
import LatestResults from '@/components/LatestResults'
import Link from 'next/link'
import { format, isSameDay, isFuture, parseISO } from 'date-fns'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'

export const revalidate = 60

export default async function HomePage() {
  let tournaments: Awaited<ReturnType<typeof getTournaments>> = []

  try {
    tournaments = await getTournaments()
  } catch { /* Supabase not configured */ }

  const latest = tournaments[0] ?? null
  const rest = tournaments.slice(1)

  const latestMatches = latest
    ? await getPredictionsByTournament(latest.id).catch(() => [])
    : []
  const latestStats = latest
    ? await getTournamentStats(latest.id).catch(() => null)
    : null

  const featuredMatches = latestMatches.slice(0, 12)

  const [upcomingPS, recentPS] = await Promise.all([
    fetchUpcomingTier1Matches(30).catch(() => [] as PSMatch[]),
    fetchRecentTier1Matches(20).catch(() => [] as PSMatch[]),
  ])

  const upcomingByTournament = upcomingPS.reduce<Record<string, PSMatch[]>>((acc, m) => {
    const key = String(m.tournament.id)
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const recentByDate = recentPS.reduce<Record<string, PSMatch[]>>((acc, m) => {
    const d = m.begin_at ?? m.scheduled_at
    if (!d) return acc
    const key = format(new Date(d), 'MMM d, yyyy').toUpperCase()
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

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
              ✦ Free · Tier 1 Only
            </span>

            <h1 className="font-display text-5xl font-bold leading-[0.95] md:text-7xl lg:text-[5.2rem] mb-6">
              Free Dota 2 picks with a{' '}
              <span className="gradient-text">cleaner</span>,{' '}
              faster match-day experience.
            </h1>

            <p className="text-lg leading-8 text-muted-foreground md:text-xl max-w-2xl mb-8">
              Pre-match analysis and winner predictions for every Tier 1 match — written before the draft, tracked after. Every pick free, every time.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row mb-10">
              <Link
                href={latest ? `/tournaments/${latest.slug}` : '/tournaments'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-base transition-opacity hover:opacity-85"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
              >
                See today&apos;s board →
              </Link>
              <Link
                href="/rankings"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-base border transition-colors hover:border-primary/50 text-muted-foreground"
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                View track record
              </Link>
            </div>

            {/* 3 principle cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: '🛡', title: 'Always free', text: 'No locked cards, no premium copy, no dead-end clicks.' },
                { icon: '⚡', title: 'Fast to scan', text: 'The whole slate is organised for quick reads before match start.' },
                { icon: '🕐', title: 'Built for match day', text: 'Clear timing, confidence, and picks on desktop and mobile.' },
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

          {/* Right: live board preview */}
          {featuredMatches.length > 0 && (
            <div className="panel-shell relative overflow-hidden p-5 md:p-7">
              <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full blur-3xl" style={{ background: 'hsl(var(--primary) / 0.12)' }} />

              {/* Tournament banner */}
              {latest?.banner_url && (
                <div className="relative -mx-5 md:-mx-7 -mt-5 md:-mt-7 mb-5 overflow-hidden rounded-t-[inherit]" style={{ maxHeight: 120 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={latest.banner_url} alt={latest.name} className="w-full object-cover object-center" style={{ maxHeight: 120 }} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, hsl(var(--card) / 0.85) 100%)' }} />
                </div>
              )}

              {/* Card header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="section-kicker mb-3 inline-flex items-center gap-1.5">
                    ● Latest picks
                  </span>
                  <h2 className="font-display text-3xl font-bold md:text-4xl">{latest?.name ?? 'Recent picks'}</h2>
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
                      className="flex items-center justify-between gap-4 rounded-[1.4rem] border px-4 py-4"
                      style={{ borderColor: 'hsl(var(--border) / 0.7)', background: 'hsl(var(--secondary) / 0.55)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Team 1 */}
                          <div className="flex items-center gap-1.5">
                            {t1?.logo_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={t1.logo_url} alt={t1.name} className="w-5 h-5 object-contain shrink-0" />
                            )}
                            <span className="font-display font-semibold text-foreground text-sm">
                              {t1?.slug ? <Link href={`/teams/${t1.slug}`} className="hover:text-primary transition-colors">{t1?.name}</Link> : t1?.name}
                            </span>
                          </div>
                          <span className="text-muted-foreground font-normal text-xs">vs</span>
                          {/* Team 2 */}
                          <div className="flex items-center gap-1.5">
                            {t2?.logo_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={t2.logo_url} alt={t2.name} className="w-5 h-5 object-contain shrink-0" />
                            )}
                            <span className="font-display font-semibold text-foreground text-sm">
                              {t2?.slug ? <Link href={`/teams/${t2.slug}`} className="hover:text-primary transition-colors">{t2?.name}</Link> : t2?.name}
                            </span>
                          </div>
                        </div>
                        {m.pre_analysis && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{m.pre_analysis}</p>
                        )}
                      </div>
                      {pick && (
                        <div
                          className="rounded-full border px-2.5 py-1.5 flex items-center gap-1.5 shrink-0"
                          style={{
                            borderColor: 'hsl(var(--border) / 0.7)',
                            background: 'hsl(var(--background) / 0.55)',
                            color: m.is_correct === false ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))',
                          }}
                        >
                          {pick.logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={pick.logo_url} alt={pick.name} className="w-4 h-4 object-contain" />
                          )}
                          <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                            {pick.short_name ?? pick.name}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer blurb */}
              <div className="rounded-[1.6rem] border p-5" style={{ borderColor: 'hsl(var(--border) / 0.7)', background: 'hsl(var(--background) / 0.45)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground mb-2">Why it feels better</p>
                <p className="font-display text-xl leading-tight text-foreground">
                  No locked picks. No clutter. Just fast reads with stronger visual rhythm.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Upcoming Tournaments (PandaScore or fallback) ── */}
      {Object.keys(upcomingByTournament).length > 0 && (
        <div className="mb-10">
          <p className="section-label mb-4">Upcoming Matches</p>
          <div className="grid gap-4">
            {Object.entries(upcomingByTournament).slice(0, 3).map(([, matches], blockIdx) => {
              const t = matches[0].tournament
              const league = matches[0].league
              const dates = matches.map(m => new Date(m.scheduled_at ?? m.begin_at ?? ''))
              const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
              const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
              const dateRange = isSameDay(minDate, maxDate)
                ? format(minDate, 'MMM d')
                : `${format(minDate, 'MMM d')} – ${format(maxDate, 'MMM d')}`

              return (
                <div
                  key={t.id}
                  className="rounded-2xl overflow-hidden fade-in-up"
                  style={{
                    background: 'hsl(var(--card) / 0.6)',
                    border: '1px solid hsl(var(--border) / 0.6)',
                    animationDelay: `${blockIdx * 0.07}s`,
                  }}
                >
                  {/* Tournament header */}
                  <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                    {league.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={league.image_url} alt={league.name} className="w-5 h-5 object-contain shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'hsl(var(--primary))' }}>{league.name}</p>
                      <p className="text-sm font-bold text-foreground truncate">{t.name}</p>
                    </div>
                    <span className="text-xs shrink-0 tabular-nums text-muted-foreground">{dateRange}</span>
                  </div>

                  {/* Match rows */}
                  {matches.slice(0, 6).map((m, i) => {
                    const teamA = m.opponents[0]?.opponent
                    const teamB = m.opponents[1]?.opponent
                    const time = m.scheduled_at ? format(new Date(m.scheduled_at), 'HH:mm') : '–'
                    const dateStr = m.scheduled_at ? format(new Date(m.scheduled_at), 'MMM d') : ''
                    return (
                      <div
                        key={m.id}
                        className="px-5 py-2.5 flex items-center gap-3 text-sm"
                        style={{
                          borderBottom: i < Math.min(matches.length, 6) - 1 ? '1px solid hsl(var(--border) / 0.4)' : 'none',
                          background: i % 2 !== 0 ? 'hsl(var(--secondary) / 0.2)' : 'transparent',
                        }}
                      >
                        <span className="w-20 text-xs shrink-0 tabular-nums text-muted-foreground">{dateStr} {time}</span>
                        <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                          {teamA?.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={teamA.image_url} alt={teamA.name} className="w-4 h-4 object-contain shrink-0" />
                          )}
                          <span className="font-semibold truncate text-foreground">{teamA?.name ?? 'TBD'}</span>
                        </div>
                        <span className="text-xs font-black px-2 shrink-0 text-muted-foreground/40">VS</span>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {teamB?.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={teamB.image_url} alt={teamB.name} className="w-4 h-4 object-contain shrink-0" />
                          )}
                          <span className="font-semibold truncate text-foreground">{teamB?.name ?? 'TBD'}</span>
                        </div>
                        <span className="text-xs shrink-0 px-2 py-0.5 rounded" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))' }}>
                          BO{m.number_of_games}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Fallback: upcoming from our list when PandaScore has nothing ── */}
      {Object.keys(upcomingByTournament).length === 0 && (() => {
        const upcoming = TIER1_TOURNAMENTS
          .filter(t => isFuture(parseISO(t.start_date)))
          .slice(0, 3)
        if (!upcoming.length) return null
        return (
          <div className="mb-10">
            <p className="section-label mb-4">Upcoming Tournaments</p>
            <div className="grid gap-3">
              {upcoming.map(t => (
                <div
                  key={t.slug}
                  className="rounded-2xl px-5 py-4 flex items-center gap-4"
                  style={{ background: 'hsl(var(--card) / 0.6)', border: '1px solid hsl(var(--border) / 0.6)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(t.start_date), 'MMM d')} – {format(parseISO(t.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
                    style={{ background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' }}
                  >
                    Coming Soon
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

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
                <div className="relative rounded-2xl overflow-hidden mb-4" style={{ maxHeight: 60 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={latest.banner_url} alt={latest.name} className="w-full object-cover object-center" style={{ maxHeight: 60 }} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, hsl(var(--background) / 0.75) 100%)' }} />
                  {/* Overlay text */}
                  <div className="absolute bottom-0 left-0 right-0 px-5 py-3 flex items-end justify-between gap-4">
                    <Link
                      href={`/tournaments/${latest.slug}`}
                      className="font-bold text-lg text-white hover:opacity-80 transition-opacity drop-shadow"
                    >
                      {latest.name}
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
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
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href={`/tournaments/${latest.slug}`} className="font-bold text-lg hover:text-white transition-colors" style={{ color: 'var(--text)' }}>
                      {latest.name}
                    </Link>
                    {latestStats && latestStats.total_predictions > 0 && (
                      <span className="text-sm px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'var(--correct-dim)', color: 'var(--correct)', border: '1px solid var(--correct-border)' }}>
                        {latestStats.accuracy_pct}% accuracy
                      </span>
                    )}
                  </div>
                  <Link href={`/tournaments/${latest.slug}`} className="text-sm font-medium transition-colors hover:text-white shrink-0" style={{ color: 'var(--accent)' }}>
                    View all →
                  </Link>
                </div>
              )}
            </div>
          )}

          {featuredMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {featuredMatches.map((match, i) => (
                <div key={match.id} className="fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <MatchCard match={match} showTournament tournament={latest ?? undefined} />
                </div>
              ))}
            </div>
          ) : (
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

      {/* ── Latest Results (PandaScore) ── */}
      {recentPS.length > 0 && (
        <div>
          <p className="section-label mb-4">Latest Results</p>
          <LatestResults matchesByDate={recentByDate} />
        </div>
      )}
    </div>
  )
}
