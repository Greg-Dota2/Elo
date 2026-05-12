import Link from 'next/link'
import type { PrizePlacement } from '@/lib/types'

interface TeamInfo {
  slug: string | null
  logo_url: string | null
}

interface Props {
  placements: PrizePlacement[]
  teamMap: Map<string, TeamInfo>
  locale?: 'en' | 'ru'
}

const MEDAL: Record<string, string> = {
  '1st': '🥇',
  '2nd': '🥈',
  '3rd': '🥉',
  '3rd-4th': '🥉',
}

const PLACE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  '1st': { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  '2nd': { text: '#94a3b8', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.15)' },
  '3rd': { text: '#c47a3a', bg: 'rgba(180,100,40,0.06)', border: 'rgba(180,100,40,0.15)' },
  '3rd-4th': { text: '#c47a3a', bg: 'rgba(180,100,40,0.06)', border: 'rgba(180,100,40,0.15)' },
}

function formatUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
  return `$${n.toLocaleString()}`
}

export default function PrizeTable({ placements, teamMap, locale = 'en' }: Props) {
  if (!placements || placements.length === 0) return null

  const hasEPT = placements.some(p => p.ept_points != null)
  const hasPrize = placements.some(p => p.prize_usd != null)
  const hasClub = placements.some(p => p.club_reward != null)

  // Group by place label so tied entries sit together
  const grouped: { place: string; entries: PrizePlacement[] }[] = []
  for (const p of placements) {
    const last = grouped[grouped.length - 1]
    if (last && last.place === p.place) {
      last.entries.push(p)
    } else {
      grouped.push({ place: p.place, entries: [p] })
    }
  }


  const renderRow = (entry: PrizePlacement, place: string, rowIndex: number, isFirst: boolean) => {
    const color = PLACE_COLORS[place]
    const team = teamMap.get(entry.team)
    const medal = MEDAL[place]

    return (
      <div
        key={`${place}-${entry.team}`}
        className="flex items-center gap-3 px-4 py-3"
        style={{
          borderBottom: '1px solid hsl(var(--border) / 0.4)',
          background: rowIndex % 2 !== 0 ? 'hsl(var(--secondary) / 0.15)' : 'transparent',
          minWidth: 480,
        }}
      >
        {/* Place badge — only shown on first entry of a group */}
        <div className="w-16 shrink-0 flex items-center gap-1.5">
          {isFirst && (
            <>
              {medal && <span className="text-base leading-none">{medal}</span>}
              <span
                className="text-xs font-black tabular-nums"
                style={{ color: color?.text ?? 'var(--text-muted)' }}
              >
                {place}
              </span>
            </>
          )}
        </div>

        {/* Team logo + name */}
        <div className="flex items-center gap-2 flex-1" style={{ minWidth: 140 }}>
          {team?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.logo_url}
              alt={entry.team}
              className="w-6 h-6 object-contain shrink-0 rounded p-0.5"
              style={{ background: 'rgba(255,255,255,0.08)' }}
              loading="lazy"
            />
          ) : (
            <div
              className="w-6 h-6 rounded shrink-0 flex items-center justify-center text-[10px] font-black"
              style={{ background: 'hsl(var(--secondary))', color: 'var(--text-muted)' }}
            >
              {entry.team.slice(0, 2).toUpperCase()}
            </div>
          )}
          {team?.slug ? (
            <Link
              href={`${locale === 'ru' ? '/ru/teams' : '/teams'}/${team.slug}`}
              className="font-semibold text-sm truncate hover:underline"
              style={{ color: 'var(--text)' }}
            >
              {entry.team}
            </Link>
          ) : (
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
              {entry.team}
            </span>
          )}
        </div>

        {/* Prize */}
        {hasPrize && (
          <div className="w-20 text-right shrink-0">
            {entry.prize_usd != null ? (
              <span className="text-sm font-bold tabular-nums" style={{ color: '#4ade80' }}>
                {formatUSD(entry.prize_usd)}
              </span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>—</span>
            )}
          </div>
        )}

        {/* EPT Points */}
        {hasEPT && (
          <div className="w-20 text-right shrink-0">
            {entry.ept_points != null ? (
              <span className="text-sm font-bold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>
                {entry.ept_points.toLocaleString()} pts
              </span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>—</span>
            )}
          </div>
        )}

        {/* Club Reward */}
        {hasClub && (
          <div className="w-24 text-right shrink-0">
            {entry.club_reward != null ? (
              <span className="text-sm font-bold tabular-nums" style={{ color: '#a78bfa' }}>
                {formatUSD(entry.club_reward)}
              </span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>—</span>
            )}
          </div>
        )}
      </div>
    )
  }

  let rowIndex = 0

  return (
    <div
      className="rounded-xl overflow-hidden mb-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="overflow-x-auto">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'hsl(var(--secondary) / 0.3)', minWidth: 380 }}
      >
        <p className="section-label flex-1">Final Standings</p>
        {hasPrize && (
          <span className="text-xs font-semibold w-20 text-right shrink-0" style={{ color: '#4ade80' }}>
            Prize
          </span>
        )}
        {hasEPT && (
          <span className="text-xs font-semibold w-20 text-right shrink-0" style={{ color: 'hsl(var(--primary))' }}>
            EPT Pts
          </span>
        )}
        {hasClub && (
          <span className="text-xs font-semibold w-24 text-right shrink-0" style={{ color: '#a78bfa' }}>
            Club Reward
          </span>
        )}
      </div>

      {grouped.map(({ place, entries }) =>
        entries.map((entry, i) => {
          const el = renderRow(entry, place, rowIndex, i === 0)
          rowIndex++
          return el
        })
      )}
      </div>
    </div>
  )
}
