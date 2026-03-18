import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  getTournamentBySlug,
  getPredictionsByTournament,
  getTournamentStats,
  getTeamAccuracy,
} from '@/lib/queries'
import TournamentContent from '@/components/TournamentContent'
import type { MatchPrediction } from '@/lib/types'
// StatsTable is now rendered inside TournamentContent

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const t = await getTournamentBySlug(slug)
    const title = `${t.name} — Predictions & Analysis`
    const description = t.overview
      ? t.overview.slice(0, 155)
      : `Match predictions, analysis, and accuracy tracking for ${t.name} on Dota2ProTips.`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/tournaments/${slug}`,
        ...(t.logo_url ? { images: [{ url: t.logo_url, alt: t.name }] } : {}),
      },
      twitter: { card: 'summary', title, description },
      alternates: { canonical: `/tournaments/${slug}` },
    }
  } catch {
    return { title: 'Tournament Not Found' }
  }
}

interface Props {
  params: Promise<{ slug: string }>
}

function groupByStage(
  predictions: MatchPrediction[]
): { stageName: string; stageDate: string | null; matches: MatchPrediction[] }[] {
  const map = new Map<
    string,
    { stageName: string; stageDate: string | null; stageOrder: number; matches: MatchPrediction[] }
  >()

  for (const p of predictions) {
    const key = p.stage?.id ?? 'ungrouped'
    const stageName = p.stage?.name ?? 'Matches'
    const stageDate = p.stage?.stage_date ?? null
    const stageOrder = p.stage?.stage_order ?? 0

    if (!map.has(key)) {
      map.set(key, { stageName, stageDate, stageOrder, matches: [] })
    }
    map.get(key)!.matches.push(p)
  }

  return Array.from(map.values()).sort((a, b) => b.stageOrder - a.stageOrder)
}

export default async function TournamentPage({ params }: Props) {
  const { slug } = await params

  let tournament
  try {
    tournament = await getTournamentBySlug(slug)
  } catch {
    notFound()
  }

  const [predictions, stats, teamAccuracy] = await Promise.all([
    getPredictionsByTournament(tournament.id).catch(() => []),
    getTournamentStats(tournament.id).catch(() => null),
    getTeamAccuracy(tournament.id, 3).catch(() => []),
  ])

  const stages = groupByStage(predictions)

  return (
    <div className="fade-in-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Link
          href="/tournaments"
          className="transition-colors duration-150 hover:text-white"
        >
          Tournaments
        </Link>
        <span style={{ color: 'var(--text-subtle)' }}>/</span>
        <span>{tournament.name}</span>
      </div>

      {/* ── Tournament header ── */}
      <div
        className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Subtle glow */}
        <div
          className="absolute top-0 right-0 w-64 h-32 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at top right, rgba(232,77,28,0.06) 0%, transparent 70%)',
          }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              {tournament.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tournament.logo_url}
                  alt={tournament.name}
                  className="w-10 h-10 object-contain rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', padding: '2px' }}
                />
              )}
              <span className="badge badge-accent">Tier 1</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-1">{tournament.name}</h1>
            {tournament.start_date && tournament.end_date && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {new Date(tournament.start_date).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}{' '}
                —{' '}
                {new Date(tournament.end_date).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Accuracy pill */}
          {stats && stats.total_predictions > 0 && (
            <div
              className="shrink-0 rounded-xl px-4 py-3 text-right"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <div
                className="text-2xl font-black tabular-nums leading-none"
                style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: (stats.accuracy_pct ?? 0) >= 60 ? 'var(--correct)' : 'var(--amber)' }}
              >
                {stats.accuracy_pct}%
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {stats.correct}/{stats.total_predictions} correct
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Telegram CTA */}
      {tournament.telegram_url && (
        <a
          href={tournament.telegram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full rounded-xl py-3 mb-6 font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ background: '#1d6fa4', color: '#fff', boxShadow: '0 2px 12px rgba(29,111,164,0.3)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.167l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.392z"/>
          </svg>
          Join Live Discussion on Telegram
        </a>
      )}

      {/* Overview */}
      {tournament.overview && (
        <div
          className="rounded-xl p-5 mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="section-label mb-2">Overview</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {tournament.overview}
          </p>
        </div>
      )}

      {/* Format */}
      {tournament.format && (
        <div
          className="rounded-xl p-5 mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="section-label mb-2">Format</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {tournament.format}
          </p>
        </div>
      )}

      <TournamentContent
        tournament={tournament}
        stages={stages}
        stats={stats}
        teamAccuracy={teamAccuracy}
      />
    </div>
  )
}
