import { Suspense } from 'react'
import { getTournamentsOnce } from './HomeHeroRight'
import { getTournamentStats, getPredictionsByTournament, sortMatchesByStatus } from '@/lib/queries'
import { fetchUpcomingTier1Matches, fetchRunningTier1Matches, fetchMatchesForSubTournament } from '@/lib/pandascore'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'
import MatchCard from '@/components/MatchCard'
import TournamentCard from '@/components/TournamentCard'
import PSBracketView from '@/components/PSBracketView'
import Image from 'next/image'
import Link from 'next/link'

function tournamentStatus(t: { start_date?: string | null; end_date?: string | null }): 'live' | 'upcoming' | 'finished' | 'unknown' {
  const now = new Date()
  if (!t.start_date) return 'unknown'
  const start = new Date(t.start_date)
  const end = t.end_date ? new Date(t.end_date + 'T23:59:59Z') : null
  if (end && end < now) return 'finished'
  if (start > now) return 'upcoming'
  return 'live'
}

interface LiveScoreEntry { nameA: string; nameB: string; scoreA: number; scoreB: number }

function resolveLiveScore(
  match: { pandascore_match_id: number | null; team_1?: { name: string } | null; team_2?: { name: string } | null },
  liveScoreMap: Map<string, LiveScoreEntry>
) {
  const t1 = match.team_1?.name ?? ''
  const t2 = match.team_2?.name ?? ''
  let entry = match.pandascore_match_id ? liveScoreMap.get(String(match.pandascore_match_id)) : undefined
  if (!entry) entry = liveScoreMap.get([t1.toLowerCase(), t2.toLowerCase()].sort().join('|'))
  if (!entry) return undefined
  const aL = entry.nameA.toLowerCase(), t1L = t1.toLowerCase()
  const t1IsA = aL === t1L || t1L.includes(aL) || aL.includes(t1L)
  return { score1: t1IsA ? entry.scoreA : entry.scoreB, score2: t1IsA ? entry.scoreB : entry.scoreA }
}

const L10N = {
  en: {
    predictions: 'Predictions',
    latestTournament: 'Latest Tournament',
    viewAll: 'View all →',
    noPredictions: 'No predictions written yet',
    writeFirst: 'Write the first one →',
    tournaments: 'Tournaments',
    show: 'Show ▾',
    dateLocale: 'en-GB' as const,
  },
  ru: {
    predictions: 'Прогнозы',
    latestTournament: 'Последний турнир',
    viewAll: 'Смотреть все →',
    noPredictions: 'Прогнозов пока нет',
    writeFirst: 'Написать первый →',
    tournaments: 'Турниры',
    show: 'Показать ▾',
    dateLocale: 'ru-RU' as const,
  },
}

export default async function HomeMain({ locale = 'en' }: { locale?: 'en' | 'ru' }) {
  const T = L10N[locale]
  const tournamentPrefix = locale === 'ru' ? '/ru/tournaments' : '/tournaments'
  const teamPrefix = locale === 'ru' ? '/ru/teams' : '/teams'

  let tournaments: Awaited<ReturnType<typeof getTournamentsOnce>> = []
  try { tournaments = await getTournamentsOnce() } catch {}

  if (tournaments.length === 0) return null

  const latest = tournaments[0] ?? null
  const now = new Date()
  const isLatestOver = latest?.end_date ? new Date(latest.end_date + 'T23:59:59Z') < now : false

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

  const allMatches = locale === 'ru'
    ? latestMatches.map(p => ({
        ...p,
        pre_analysis: p.pre_analysis_ru ?? p.pre_analysis,
        post_commentary: p.post_commentary_ru ?? p.post_commentary,
      }))
    : latestMatches

  const featuredMatches = sortMatchesByStatus(allMatches)

  return (
    <>
      {/* ── Latest tournament predictions (only while live/upcoming) ── */}
      {latest && !isLatestOver && (
        <hr style={{ borderColor: 'hsl(var(--border) / 0.5)', marginBottom: '2.5rem' }} />
      )}

      {latest && !isLatestOver && (
        <div className="mb-5">
          {/* Banner */}
          {latest.banner_url && (
            <div className="relative rounded-2xl overflow-hidden mb-4" style={{ height: 180 }}>
              <Image src={latest.banner_url} alt={latest.name} fill priority className="object-cover object-center" sizes="(max-width: 768px) 100vw, 800px" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 20%, hsl(var(--background) / 0.85) 100%)' }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Link
                  href={`${tournamentPrefix}/${latest.slug}`}
                  className="font-display font-black text-4xl text-white hover:opacity-80 transition-opacity drop-shadow text-center"
                >
                  {latest.name}
                </Link>
                <div className="flex items-center gap-3">
                  {latestStats && latestStats.total_predictions > 0 && (
                    <span className="text-sm px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'var(--correct-dim)', color: 'var(--correct)', border: '1px solid var(--correct-border)' }}>
                      {latestStats.accuracy_pct}%
                    </span>
                  )}
                  <Link href={`${tournamentPrefix}/${latest.slug}`} className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                    {T.viewAll}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Fallback: no banner */}
          {!latest.banner_url && (
            <div className="rounded-2xl px-7 py-6 mb-5 flex items-center justify-between gap-4" style={{ background: 'hsl(var(--card) / 0.6)', border: '1px solid hsl(var(--border) / 0.6)' }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'hsl(var(--primary))' }}>{T.latestTournament}</p>
                <Link href={`${tournamentPrefix}/${latest.slug}`} className="font-display font-bold text-3xl hover:opacity-80 transition-opacity" style={{ color: 'var(--text)' }}>
                  {latest.name}
                </Link>
                {latestStats && latestStats.total_predictions > 0 && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {latestStats.total_predictions} · <span style={{ color: 'var(--correct)' }}>{latestStats.accuracy_pct}%</span>
                  </p>
                )}
              </div>
              <Link
                href={`${tournamentPrefix}/${latest.slug}`}
                className="shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm transition-opacity hover:opacity-80"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
              >
                {T.viewAll}
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
            <h2 className="section-label mb-4">{T.predictions}</h2>
            {activeMatches.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {activeMatches.map((match, i) => (
                  <div key={match.id} className="fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
                    <MatchCard
                      match={match}
                      showTournament
                      tournament={latest ?? undefined}
                      liveScore={resolveLiveScore(match, liveScoreMap)}
                      locale={locale}
                      teamPrefix={teamPrefix}
                      tournamentPrefix={tournamentPrefix}
                    />
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
                    {latest?.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={latest.logo_url} alt={latest.name} className="w-7 h-7 object-contain shrink-0 rounded" />
                    )}
                    <span className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
                      {latest?.name}
                    </span>
                    {finishedMatches[0]?.match_date && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: 'hsl(var(--muted))', color: 'var(--text-muted)' }}>
                        {new Date(finishedMatches[0].match_date + 'T00:00:00').toLocaleDateString(T.dateLocale, { day: 'numeric', month: 'short' })}
                      </span>
                    )}
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
                    {T.show}
                  </span>
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {finishedMatches.map((match, i) => (
                    <div key={match.id} className="fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
                      <MatchCard
                        match={match}
                        showTournament
                        tournament={latest ?? undefined}
                        liveScore={resolveLiveScore(match, liveScoreMap)}
                        locale={locale}
                        teamPrefix={teamPrefix}
                        tournamentPrefix={tournamentPrefix}
                      />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )
      })() : (
        !isLatestOver ? (
          <div
            className="rounded-2xl p-10 text-center mb-12"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-4xl mb-3">✍️</p>
            <p className="font-semibold mb-1">{T.noPredictions}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              <Link href="/admin" style={{ color: 'var(--accent)' }}>{T.writeFirst}</Link>
            </p>
          </div>
        ) : null
      )}

      {tournaments.length > 0 && (
        <div className="mb-12">
          <h2 className="section-label mb-4">{T.tournaments}</h2>

          {restLive.length > 0 && (
            <div className="mb-6">
              {restLive.map((t, i) => (
                <div key={t.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  {i > 0 && <div style={{ borderTop: '1px solid hsl(var(--border) / 0.5)' }} />}
                  <TournamentCard tournament={t} status="live" linkPrefix={tournamentPrefix} locale={locale} />
                </div>
              ))}
            </div>
          )}

          {restUpcoming.length > 0 && (
            <div className="mb-6">
              {restUpcoming.map((t, i) => (
                <div key={t.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  {i > 0 && <div style={{ borderTop: '1px solid hsl(var(--border) / 0.5)' }} />}
                  <TournamentCard tournament={t} status="upcoming" linkPrefix={tournamentPrefix} locale={locale} />
                </div>
              ))}
            </div>
          )}

          {restFinished.length > 0 && (
            <div className="mb-6">
              {restFinished.map((t, i) => (
                <div key={t.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  {i > 0 && <div style={{ borderTop: '1px solid hsl(var(--border) / 0.5)' }} />}
                  <TournamentCard tournament={t} status="finished" linkPrefix={tournamentPrefix} locale={locale} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
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
