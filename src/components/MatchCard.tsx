import type React from 'react'
import type { MatchPrediction, Team } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'
import { winProbability, seriesWinProbability, drawProbability } from '@/lib/elo'
import MatchTimer from './MatchTimer'
import ExpandableText from './ExpandableText'

// Inline icons — avoids pulling in the lucide module graph
type IconProps = { className?: string; style?: React.CSSProperties }
function IconTrendingUp({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  )
}
function IconX({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

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
  tournament?: { name: string; slug?: string | null; logo_url: string | null; telegram_url?: string | null }
}

function TeamLogo({ logo_url, name, dim }: { logo_url: string | null; name: string; dim?: boolean }) {
  return (
    <div
      className="flex h-28 w-28 items-center justify-center rounded-[1.35rem] border border-border/70 bg-secondary/75 p-4 transition-opacity duration-300"
      style={{ opacity: dim ? 0.35 : 1 }}
    >
      {logo_url ? (
        <Image src={logo_url} alt={name} width={80} height={80} className="h-full w-full object-contain" />
      ) : (
        <span className="font-display text-2xl font-black text-muted-foreground">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  )
}

export default function MatchCard({ match, tournament }: Props) {
  const { team_1, team_2, is_correct } = match
  if (!team_1 || !team_2) return null

  const hasResult = match.score_team_1 !== null && match.score_team_2 !== null

  // Compute is_correct on the fly as fallback when DB value is null
  const computedIsCorrect: boolean | null = hasResult
    ? match.score_team_1 === match.score_team_2
      ? (match.predicted_draw ? true : false)
      : match.actual_winner_id
        ? match.actual_winner_id === match.predicted_winner?.id
        : null
    : null
  const effectiveIsCorrect = is_correct ?? computedIsCorrect

  const t1Won = match.actual_winner_id === team_1.id
  const t2Won = match.actual_winner_id === team_2.id
  const pick = match.predicted_winner
  const predictedDraw = match.predicted_draw
  const hasPrediction = !!pick || predictedDraw

  const { pctA, pctB } =
    team_1.current_elo && team_2.current_elo
      ? winProbability(team_1.current_elo, team_2.current_elo)
      : { pctA: 50, pctB: 50 }

  const p = pick?.id === team_1.id ? pctA / 100 : pctB / 100
  const confidence = predictedDraw
    ? Math.round(drawProbability(pctA / 100) * 100)
    : Math.round(seriesWinProbability(p, match.best_of ?? 1) * 100)
  const tournamentLabel = tournament?.name ?? match.stage?.name ?? ''

  return (
    <article className="match-card">
      <div className="relative z-10 w-full">

        {/* ── Header: kicker + tournament + title / time badge ── */}
        <div>
          {/* Kicker + date/BO row */}
          <div className="flex flex-col items-center gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {tournament?.logo_url && (
                <Image
                  src={tournament.logo_url}
                  alt={tournamentLabel}
                  width={14}
                  height={14}
                  className="w-3.5 h-3.5 object-contain rounded shrink-0"
                />
              )}
              {tournament?.slug ? (
                <Link href={`/tournaments/${tournament.slug}`} className="section-kicker hover:opacity-70 transition-opacity truncate">
                  {tournamentLabel || 'Free Pick'}
                </Link>
              ) : (
                <span className="section-kicker truncate">{tournamentLabel || 'Free Pick'}</span>
              )}
            </div>

            {/* Date + status + BO badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/70 px-3 py-1.5 text-xs font-medium text-muted-foreground shrink-0">
              <svg className="h-3.5 w-3.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {match.match_date
                ? new Date(`${match.match_date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Europe/Athens' })
                : '–'}
              <span className="text-muted-foreground/40">·</span>
              <MatchTimer matchDate={match.match_date} matchTime={match.match_time} hasResult={hasResult} />
              <span className="text-muted-foreground/40">·</span>
              <span className="font-bold">BO{match.best_of}</span>
            </div>
          </div>

          {/* Big match title */}
          <p className="font-display text-xl font-bold md:text-2xl leading-tight text-center">
            <TeamName team={team_1} className={hasResult && t2Won ? 'text-muted-foreground' : 'text-foreground'} />
            {' '}
            <span className="text-muted-foreground">vs</span>
            {' '}
            <TeamName team={team_2} className={hasResult && t1Won ? 'text-muted-foreground' : 'text-foreground'} />
          </p>
        </div>

        {/* ── ELO win probability bar ── */}
        {team_1.current_elo && team_2.current_elo && (
          <div className="mt-6">
            <div className="flex justify-between text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <span style={{ color: pctA >= 50 ? 'hsl(var(--success))' : '#f59e0b' }}>{pctA}%</span>
              <span className="uppercase tracking-widest text-[10px]">ELO Win Probability</span>
              <span style={{ color: pctB >= 50 ? 'hsl(var(--success))' : '#f59e0b' }}>{pctB}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden flex">
              <div className="h-full" style={{ width: `${pctA}%`, background: pctA >= 50 ? 'hsl(var(--success))' : '#f59e0b' }} />
              <div className="h-full" style={{ width: `${pctB}%`, background: pctB >= 50 ? 'hsl(var(--success))' : '#f59e0b' }} />
            </div>
          </div>
        )}

        {/* ── Teams ── */}
        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <TeamLogo logo_url={team_1.logo_url} name={team_1.name} dim={hasResult && t2Won} />
            <TeamName team={team_1} className={`font-display text-lg font-bold ${hasResult && t2Won ? 'text-muted-foreground' : 'text-foreground'}`} />
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            {hasResult ? (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="font-display text-5xl font-black tabular-nums leading-none"
                    style={{ color: t1Won ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))' }}
                  >
                    {match.score_team_1}
                  </span>
                  <span className="text-lg font-light text-muted-foreground/40">:</span>
                  <span
                    className="font-display text-5xl font-black tabular-nums leading-none"
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
            <TeamName team={team_2} className={`font-display text-lg font-bold ${hasResult && t1Won ? 'text-muted-foreground' : 'text-foreground'}`} />
          </div>
        </div>

        {/* ── Dotabuff links ── */}
        {hasResult && match.dotabuff_game_ids && match.dotabuff_game_ids.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
            {match.dotabuff_game_ids.map((gameId, i) => (
              <a
                key={gameId}
                href={`https://www.dotabuff.com/matches/${gameId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-opacity hover:opacity-80"
                style={{ background: '#c23c2a', color: '#fff' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
                Game {i + 1} on Dotabuff
              </a>
            ))}
          </div>
        )}

        {/* ── Twitch + Telegram buttons ── */}
        {(match.twitch_url || tournament?.telegram_url) && (
          <div className="mt-5 flex flex-col items-center gap-2">
            {match.twitch_url && (
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
                {match.twitch_url.includes('/videos/') && match.twitch_url.includes('?t=')
                  ? '⏱ Jump to Match on Twitch'
                  : match.twitch_url.includes('/videos/')
                  ? 'Watch VOD on Twitch'
                  : 'Watch on Twitch'}
              </a>
            )}
            {tournament?.telegram_url && (
              <a
                href={tournament.telegram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: '#1d6fa4', color: '#fff' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.167l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.392z"/>
                </svg>
                Join live discussion
              </a>
            )}
          </div>
        )}

        {/* ── Prediction section ── */}
        {hasPrediction && (
          <div className="mt-8 rounded-[1.5rem] border border-border/70 bg-background/45 p-4 md:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Prediction
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {effectiveIsCorrect === false
                    ? <IconX className="h-4 w-4 flex-shrink-0" style={{ color: 'hsl(var(--destructive))' }} />
                    : <IconTrendingUp className="h-4 w-4 flex-shrink-0" style={{ color: predictedDraw ? '#f59e0b' : 'hsl(var(--success))' }} />
                  }
                  {pick?.logo_url && (
                    <Image src={pick.logo_url} alt={pick.name} width={24} height={24} className="w-6 h-6 object-contain shrink-0" />
                  )}
                  <p
                    className="font-display text-2xl font-bold"
                    style={{ color: effectiveIsCorrect === false ? 'hsl(var(--destructive))' : predictedDraw ? '#f59e0b' : 'hsl(var(--success))' }}
                  >
                    {pick ? pick.name : 'Draw (1–1)'}
                  </p>
                </div>
              </div>

              {hasResult && effectiveIsCorrect !== null ? (
                <span
                  className="w-fit rounded-full px-3 py-1.5 text-sm font-semibold border"
                  style={
                    effectiveIsCorrect
                      ? { background: 'hsl(var(--success) / 0.09)', color: 'hsl(var(--success))', borderColor: 'hsl(var(--success) / 0.22)' }
                      : { background: 'hsl(var(--destructive) / 0.09)', color: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive) / 0.22)' }
                  }
                >
                  {effectiveIsCorrect ? '✓ Correct' : '✗ Wrong'}
                </span>
              ) : !hasResult ? (
                <span className="stat-badge-success w-fit">{confidence}% confidence</span>
              ) : null}
            </div>

            {match.pre_analysis && (
              <div className="mt-5 rounded-xl px-4 py-4" style={{ background: 'hsl(var(--secondary) / 0.5)', border: '1px solid hsl(var(--border) / 0.6)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}>My take</p>
                <ExpandableText text={match.pre_analysis} />
              </div>
            )}

            {match.post_commentary && hasResult && (
              <div
                className="mt-4 rounded-xl px-4 py-4"
                style={{
                  background: effectiveIsCorrect === true
                    ? 'hsl(var(--success) / 0.07)'
                    : effectiveIsCorrect === false
                    ? 'hsl(var(--destructive) / 0.07)'
                    : 'hsl(var(--secondary) / 0.5)',
                  border: `1px solid ${effectiveIsCorrect === true ? 'hsl(var(--success) / 0.25)' : effectiveIsCorrect === false ? 'hsl(var(--destructive) / 0.25)' : 'hsl(var(--border) / 0.6)'}`,
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: effectiveIsCorrect === true ? 'hsl(var(--success))' : effectiveIsCorrect === false ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }}
                >
                  {effectiveIsCorrect === true ? '✓ Aftermath' : effectiveIsCorrect === false ? '✗ Aftermath' : 'Aftermath'}
                </p>
                <p className="text-base leading-7 font-medium text-foreground">
                  {match.post_commentary}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </article>
  )
}
