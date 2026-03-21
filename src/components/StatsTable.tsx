import type { TournamentStats, TeamAccuracy } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'

function teamSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

interface Props {
  stats: TournamentStats
  teamAccuracy: TeamAccuracy[]
}

export default function StatsTable({ stats, teamAccuracy }: Props) {
  const accuracy = stats.accuracy_pct ?? 0
  const wrongPct = stats.total_predictions > 0
    ? parseFloat((100 - accuracy).toFixed(1))
    : 0

  // SVG ring (correct arc)
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (accuracy / 100) * circumference

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-8">

      {/* ── Overall accuracy card ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <p className="section-label mb-4">Prediction accuracy</p>

        <div className="flex items-center gap-5">
          {/* Ring */}
          <div className="relative shrink-0 w-16 h-16">
            <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
              <circle
                cx="32" cy="32" r={radius}
                fill="none"
                stroke="var(--surface-3)"
                strokeWidth="6"
              />
              <circle
                cx="32" cy="32" r={radius}
                fill="none"
                stroke={accuracy >= 60 ? 'var(--correct)' : 'var(--amber)'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-sm font-black tabular-nums"
                style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: accuracy >= 60 ? 'var(--correct)' : 'var(--amber)' }}
              >
                {accuracy}%
              </span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 grid gap-2">
            <StatRow
              label="Total"
              value={stats.total_predictions}
              pct="100%"
              color="var(--text)"
            />
            <StatRow
              label="Correct"
              value={stats.correct}
              pct={`${accuracy}%`}
              color="var(--correct)"
              barPct={accuracy}
              barColor="linear-gradient(90deg, var(--correct), hsl(154,71%,55%))"
            />
            <StatRow
              label="Wrong"
              value={stats.wrong}
              pct={`${wrongPct}%`}
              color="var(--wrong)"
              barPct={wrongPct}
              barColor="linear-gradient(90deg, var(--wrong), hsl(0,84%,66%))"
            />
          </div>
        </div>
      </div>

      {/* ── Team accuracy card ── */}
      {teamAccuracy.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <p className="section-label mb-4">Best predicted teams</p>

          <div className="grid gap-2.5">
            {teamAccuracy.map((row, i) => (
              <div key={row.team_id} className="flex items-center gap-3">
                {/* Rank medal */}
                <span
                  className="text-xs font-black w-5 text-center shrink-0 tabular-nums"
                  style={{
                    color: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--silver)' : 'var(--bronze)',
                  }}
                >
                  #{i + 1}
                </span>

                {/* Logo */}
                {row.logo_url ? (
                  <Image
                    src={row.logo_url}
                    alt={row.team_name}
                    width={22}
                    height={22}
                    className="object-contain rounded shrink-0"
                  />
                ) : (
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                  >
                    {row.team_name.slice(0, 1)}
                  </div>
                )}

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <Link href={`/teams/${teamSlug(row.team_name)}`} className="text-xs font-semibold truncate hover:text-primary transition-colors" style={{ color: 'var(--text)' }}>
                      {row.team_name}
                    </Link>
                    <span
                      className="text-xs font-bold tabular-nums ml-2 shrink-0"
                      style={{ color: 'var(--correct)' }}
                    >
                      {row.accuracy_pct}%
                    </span>
                  </div>
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: 'var(--surface-3)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${row.accuracy_pct}%`,
                        background: 'linear-gradient(90deg, var(--correct), hsl(154,71%,55%))',
                        transition: 'width 0.8s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatRow({
  label,
  value,
  pct,
  color,
  barPct,
  barColor,
}: {
  label: string
  value: number
  pct: string
  color: string
  barPct?: number
  barColor?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
          <span className="text-xs tabular-nums w-10 text-right" style={{ color: 'var(--text-muted)' }}>{pct}</span>
        </div>
      </div>
      {barPct !== undefined && barColor && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${barPct}%`, background: barColor, transition: 'width 0.8s ease' }}
          />
        </div>
      )}
    </div>
  )
}
