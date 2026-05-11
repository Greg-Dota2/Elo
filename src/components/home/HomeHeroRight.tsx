import { cache } from 'react'
import { getTournaments, getTournamentStats, getPredictionsByTournament, sortMatchesByStatus } from '@/lib/queries'
import { fetchRunningTier1Matches, fetchMatchesForSubTournament } from '@/lib/pandascore'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'
import Image from 'next/image'
import Link from 'next/link'

export const getTournamentsOnce = cache(getTournaments)

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
    latestPicks: 'Latest picks',
    pick: '→ Pick',
    draw: 'Draw (1–1)',
    whatYouGet: 'What you get here',
    blurb: 'One pick per match. My honest read, written before the draft. No fluff, no hedging.',
  },
  ru: {
    latestPicks: 'Последние прогнозы',
    pick: '→ Прогноз',
    draw: 'Ничья (1–1)',
    whatYouGet: 'Что вас ждёт',
    blurb: 'Один прогноз на матч. Моё честное мнение, записанное до драфта. Без воды и оговорок.',
  },
}

export default async function HomeHeroRight({ locale = 'en' }: { locale?: 'en' | 'ru' }) {
  const T = L10N[locale]
  const tournamentPrefix = locale === 'ru' ? '/ru/tournaments' : '/tournaments'
  const teamPrefix = locale === 'ru' ? '/ru/teams' : '/teams'

  let tournaments: Awaited<ReturnType<typeof getTournamentsOnce>> = []
  try { tournaments = await getTournamentsOnce() } catch {}

  const latest = tournaments[0] ?? null
  if (!latest) return null

  const isLatestOver = latest.end_date ? new Date(latest.end_date + 'T23:59:59Z') < new Date() : false
  const tier1Entry = TIER1_TOURNAMENTS.find(t => t.slug === latest.slug) as
    | (typeof TIER1_TOURNAMENTS[0] & { ps_group_stage_id?: number }) | undefined

  const [latestMatches, latestStats, runningPS, swissMatches] = await Promise.all([
    getPredictionsByTournament(latest.id).catch(() => []),
    getTournamentStats(latest.id).catch(() => null),
    isLatestOver ? Promise.resolve([]) : fetchRunningTier1Matches(20).catch(() => []),
    isLatestOver ? Promise.resolve([]) : tier1Entry?.ps_group_stage_id
      ? fetchMatchesForSubTournament(tier1Entry.ps_group_stage_id).catch(() => [])
      : Promise.resolve([]),
  ])

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
  if (featuredMatches.length === 0) return null

  return (
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
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'hsl(var(--success))' }}>{T.latestPicks}</span>
          </div>
          {latestStats && latestStats.accuracy_pct !== null && (
            <span className="text-sm font-semibold px-3 py-1.5 rounded-full shrink-0" style={{ background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' }}>
              {latestStats.accuracy_pct}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {latest?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" src={latest.logo_url} alt={latest.name} className="w-8 h-8 object-contain shrink-0 rounded" />
          )}
          <Link href={`${tournamentPrefix}/${latest?.slug}`} className="font-display text-3xl font-bold md:text-4xl hover:text-primary transition-colors">
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
          const live = resolveLiveScore(m, liveScoreMap)
          return (
            <div
              key={m.id}
              className="rounded-[1.4rem] border px-5 py-4 relative overflow-hidden"
              style={{ borderColor: 'hsl(var(--border) / 0.7)', background: 'hsl(var(--secondary) / 0.55)' }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.35), transparent)' }} />

              {/* Teams row */}
              <div className="flex items-center gap-2.5 flex-wrap mb-3">
                <div className="flex items-center gap-2">
                  {t1?.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" src={t1.logo_url} alt={t1.name} className="w-7 h-7 object-contain shrink-0" />
                  )}
                  <span className="font-display font-bold text-foreground text-lg">
                    {t1?.slug
                      ? <Link href={`${teamPrefix}/${t1.slug}`} className="hover:text-primary transition-colors">{t1?.name}</Link>
                      : t1?.name}
                  </span>
                </div>
                <span className="text-[10px] font-black text-muted-foreground/50 px-1.5 py-0.5 rounded border border-border/40 tracking-wider">VS</span>
                <div className="flex items-center gap-2">
                  {t2?.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" src={t2.logo_url} alt={t2.name} className="w-7 h-7 object-contain shrink-0" />
                  )}
                  <span className="font-display font-bold text-foreground text-lg">
                    {t2?.slug
                      ? <Link href={`${teamPrefix}/${t2.slug}`} className="hover:text-primary transition-colors">{t2?.name}</Link>
                      : t2?.name}
                  </span>
                </div>
              </div>

              {/* Live score */}
              {live && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: 'hsl(var(--destructive))', color: '#fff' }}>LIVE</span>
                  <span className="font-display font-black text-lg tabular-nums" style={{ color: 'hsl(var(--destructive))' }}>{live.score1} : {live.score2}</span>
                </div>
              )}

              {/* Analysis */}
              {m.pre_analysis && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-6">{m.pre_analysis}</p>
              )}

              {/* Pick */}
              {(pick || m.predicted_draw) && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>{T.pick}</span>
                  <div
                    className="rounded-full px-3 py-1.5 flex items-center gap-1.5"
                    style={{ background: 'hsl(var(--background) / 0.65)', color: 'var(--foreground)', border: '1px solid hsl(var(--border) / 0.9)' }}
                  >
                    {pick?.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={pick.logo_url} alt={pick.name} className="w-4 h-4 object-contain" />
                    )}
                    <span className="text-sm font-bold text-foreground">{pick ? (pick.short_name ?? pick.name) : T.draw}</span>
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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground mb-2">{T.whatYouGet}</p>
        <p className="font-display text-xl leading-tight text-foreground">{T.blurb}</p>
      </div>
    </div>
  )
}
