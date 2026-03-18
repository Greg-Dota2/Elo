'use client'

import { useState } from 'react'
import type { PSMatch } from '@/lib/pandascore'
import { format } from 'date-fns'

interface Props {
  matchesByDate: Record<string, PSMatch[]>
}

function MatchRow({ m }: { m: PSMatch }) {
  const [expanded, setExpanded] = useState(false)

  const teamA = m.opponents[0]?.opponent
  const teamB = m.opponents[1]?.opponent
  const scoreA = m.results.find(r => r.team_id === teamA?.id)?.score ?? 0
  const scoreB = m.results.find(r => r.team_id === teamB?.id)?.score ?? 0
  const aWon = scoreA > scoreB
  const bWon = scoreB > scoreA

  const stream = m.streams_list.find(s => s.official && s.language === 'en') ?? m.streams_list[0]

  return (
    <div
      className="border-b last:border-b-0 transition-colors duration-150"
      style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
    >
      <div
        className="px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Top row: tournament + BO + date + stream */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {m.league.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.league.image_url} alt={m.league.name} className="w-4 h-4 object-contain shrink-0" />
            )}
            <span className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {m.serie.full_name}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded shrink-0"
              style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))' }}
            >
              BO{m.number_of_games}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {stream && (
              <a
                href={stream.raw_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-xs px-2 py-0.5 rounded font-semibold transition-opacity hover:opacity-70"
                style={{ background: '#9146FF', color: '#fff' }}
              >
                ▶
              </a>
            )}
            <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>
              {m.begin_at ? format(new Date(m.begin_at), 'MMM d, yyyy') : ''}
            </span>
          </div>
        </div>

        {/* Score row */}
        <div className="flex items-center gap-3">
          {/* Team A */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            {teamA?.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teamA.image_url} alt={teamA.name} className="w-5 h-5 object-contain shrink-0" />
            )}
            <span
              className="font-display font-bold text-sm truncate"
              style={{ color: aWon ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}
            >
              {teamA?.name ?? 'TBD'}
            </span>
          </div>

          {/* Scores */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="font-display text-xl font-black tabular-nums w-5 text-right"
              style={{ color: aWon ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }}
            >
              {scoreA}
            </span>
            <span className="text-sm font-light" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}>-</span>
            <span
              className="font-display text-xl font-black tabular-nums w-5 text-left"
              style={{ color: bWon ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }}
            >
              {scoreB}
            </span>
          </div>

          {/* Team B */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {teamB?.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teamB.image_url} alt={teamB.name} className="w-5 h-5 object-contain shrink-0" />
            )}
            <span
              className="font-display font-bold text-sm truncate"
              style={{ color: bWon ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}
            >
              {teamB?.name ?? 'TBD'}
            </span>
          </div>

          {/* Expand chevron */}
          <span
            className="text-xs shrink-0 transition-transform duration-200"
            style={{
              color: 'hsl(var(--muted-foreground) / 0.4)',
              transform: expanded ? 'rotate(180deg)' : 'none',
            }}
          >
            ▾
          </span>
        </div>

        {/* Games count */}
        <p className="text-xs mt-1.5" style={{ color: 'hsl(var(--muted-foreground) / 0.45)' }}>
          {scoreA + scoreB} game{scoreA + scoreB !== 1 ? 's' : ''} · click to {expanded ? 'collapse' : 'expand'}
        </p>
      </div>

      {/* Expanded: stream info */}
      {expanded && (
        <div
          className="px-4 pb-3 pt-0"
          style={{ background: 'hsl(var(--secondary) / 0.3)' }}
        >
          {stream ? (
            <a
              href={stream.raw_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold rounded-full px-3 py-1.5 transition-opacity hover:opacity-80"
              style={{ background: '#9146FF', color: '#fff' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
              </svg>
              Watch on Twitch
            </a>
          ) : (
            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}>No VOD available</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function LatestResults({ matchesByDate }: Props) {
  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{
        background: 'hsl(var(--card) / 0.6)',
        borderColor: 'hsl(var(--border) / 0.6)',
      }}
    >
      {Object.entries(matchesByDate).map(([date, matches]) => (
        <div key={date}>
          <div
            className="px-4 py-2 text-xs font-bold tracking-widest"
            style={{
              background: 'hsl(var(--secondary) / 0.6)',
              color: 'hsl(var(--muted-foreground))',
              borderBottom: '1px solid hsl(var(--border) / 0.5)',
            }}
          >
            {date}
          </div>
          {matches.map(m => <MatchRow key={m.id} m={m} />)}
        </div>
      ))}
    </div>
  )
}
