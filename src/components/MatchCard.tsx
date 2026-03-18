'use client'

import type { MatchPrediction, Team } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'
import { winProbability } from '@/lib/elo'
import { Clock, TrendingUp, X } from 'lucide-react'
import { useState } from 'react'

function TeamName({ team, className }: { team: Team; className?: string }) {
  if (team.slug) {
    return (
      <Link href={`/teams/${team.slug}`} className={`hover:text-primary transition-colors ${className ?? ''}`}>
        {team.name}
      </Link>
    )
  }
  return <span className={className}>{team.name}</span>
}

interface Props {
  match: MatchPrediction
  showTournament?: boolean
  tournament?: { name: string; logo_url: string | null }
}

function TeamLogo({ logo_url, name, dim }: { logo_url: string | null; name: string; dim?: boolean }) {
  return (
    <div
      className="flex h-20 w-20 items-center justify-center rounded-[1.35rem] border border-border/70 bg-secondary/75 p-3 transition-opacity duration-300"
      style={{ opacity: dim ? 0.35 : 1 }}
    >
      {logo_url ? (
        <Image src={logo_url} alt={name} width={56} height={56} className="h-full w-full object-contain" />
      ) : (
        <span className="font-display text-xl font-black text-muted-foreground">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  )
}

export default function MatchCard({ match, tournament }: Props) {
  const { team_1, team_2, is_correct } = match
  if (!team_1 || !team_2) return null

  const [expanded, setExpanded] = useState(false)
  const hasResult = match.score_team_1 !== null && match.score_team_2 !== null
  const t1Won = match.actual_winner_id === team_1.id
  const t2Won = match.actual_winner_id === team_2.id
  const pick = match.predicted_winner

  const { pctA, pctB } =
    team_1.current_elo && team_2.current_elo
      ? winProbability(team_1.current_elo, team_2.current_elo)
      : { pctA: 50, pctB: 50 }

  const confidence = pick?.id === team_1.id ? pctA : pctB
  const tournamentLabel = tournament?.name ?? match.stage?.name ?? ''

  return (
    <article className="match-card">
      <div className="relative z-10 w-full">

        {/* ── Header: kicker + tournament + title / time badge ── */}
        <div className="relative">
          {/* Kicker pill */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {tournament?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tournament.logo_url}
                alt={tournamentLabel}
                className="w-3.5 h-3.5 object-contain rounded shrink-0"
              />
            )}
            <span className="section-kicker">{tournamentLabel || 'Free Pick'}</span>
          </div>

          {/* Time + BO badge — absolute top-right */}
          <div className="absolute top-0 right-0 inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {match.match_date
              ? new Date(match.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : '–'}
            <span className="text-muted-foreground/40">·</span>
            <span className="font-bold">BO{match.best_of}</span>
          </div>

          {/* Big match title */}
          <h3 className="font-display text-lg font-bold md:text-xl leading-tight text-center">
            <TeamName team={team_1} className={hasResult && t2Won ? 'text-muted-foreground' : 'text-foreground'} />
            {' '}
            <span className="text-muted-foreground">vs</span>
            {' '}
            <TeamName team={team_2} className={hasResult && t1Won ? 'text-muted-foreground' : 'text-foreground'} />
          </h3>
        </div>

        {/* ── Teams ── */}
        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <TeamLogo logo_url={team_1.logo_url} name={team_1.name} dim={hasResult && t2Won} />
            <TeamName team={team_1} className={`font-display text-base font-semibold ${hasResult && t2Won ? 'text-muted-foreground' : 'text-foreground'}`} />
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            {hasResult ? (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="font-display text-4xl font-black tabular-nums leading-none"
                    style={{ color: t1Won ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }}
                  >
                    {match.score_team_1}
                  </span>
                  <span className="text-lg font-light text-muted-foreground/40">:</span>
                  <span
                    className="font-display text-4xl font-black tabular-nums leading-none"
                    style={{ color: t2Won ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }}
                  >
                    {match.score_team_2}
                  </span>
                </div>
                <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/50">final</span>
              </>
            ) : (
              <span className="font-display text-2xl font-black tracking-[0.22em] text-muted-foreground">VS</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <TeamLogo logo_url={team_2.logo_url} name={team_2.name} dim={hasResult && t1Won} />
            <TeamName team={team_2} className={`font-display text-base font-semibold ${hasResult && t1Won ? 'text-muted-foreground' : 'text-foreground'}`} />
          </div>
        </div>

        {/* ── Twitch button ── */}
        {match.twitch_url && (() => {
          const isVod = match.twitch_url.includes('/videos/')
          const hasTimestamp = match.twitch_url.includes('?t=')
          const label = isVod
            ? hasTimestamp ? '⏱ Jump to Match on Twitch' : 'Watch VOD on Twitch'
            : '🔴 Watch Live on Twitch'
          return (
            <div className="mt-5 flex justify-center">
              <a
                href={match.twitch_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: '#9146FF', color: '#fff' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                </svg>
                {label}
              </a>
            </div>
          )
        })()}

        {/* ── Prediction section ── */}
        {pick && (
          <div className="mt-8 rounded-[1.5rem] border border-border/70 bg-background/45 p-4 md:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Prediction
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {is_correct === false
                    ? <X className="h-4 w-4 flex-shrink-0" style={{ color: 'hsl(var(--destructive))' }} />
                    : <TrendingUp className="h-4 w-4 flex-shrink-0 text-success" style={{ color: 'hsl(var(--success))' }} />
                  }
                  <p
                    className="font-display text-2xl font-bold"
                    style={{ color: is_correct === false ? 'hsl(var(--destructive))' : 'hsl(var(--success))' }}
                  >
                    {pick.name}
                  </p>
                </div>
              </div>

              {is_correct !== null ? (
                <span
                  className="w-fit rounded-full px-3 py-1.5 text-sm font-semibold border"
                  style={
                    is_correct
                      ? { background: 'hsl(var(--success) / 0.09)', color: 'hsl(var(--success))', borderColor: 'hsl(var(--success) / 0.22)' }
                      : { background: 'hsl(var(--destructive) / 0.09)', color: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive) / 0.22)' }
                  }
                >
                  {is_correct ? '✓ Correct' : '✗ Wrong'}
                </span>
              ) : (
                <span className="stat-badge-success w-fit">{confidence}% confidence</span>
              )}
            </div>

            {is_correct === null && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${confidence}%` }}
                />
              </div>
            )}

            {match.pre_analysis && (
              <div className="mt-4">
                <p className={`text-sm leading-6 text-muted-foreground ${expanded ? '' : 'line-clamp-2'}`}>
                  {match.pre_analysis}
                </p>
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="mt-1.5 text-xs font-semibold transition-colors hover:text-primary"
                  style={{ color: 'hsl(var(--primary) / 0.7)' }}
                >
                  {expanded ? '↑ Show less' : '↓ Read full analysis'}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </article>
  )
}
