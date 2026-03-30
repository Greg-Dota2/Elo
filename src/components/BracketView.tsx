import React from 'react'
import type { MatchPrediction } from '@/lib/types'

const MATCH_W = 210
const MATCH_H = 72      // two team rows × 36px each — must match BracketCard height
const SLOT_BASE = MATCH_H + 12  // slot height for round-0 matches
const CONNECTOR_W = 40  // horizontal gap between rounds (used for connector lines)

interface Round {
  stageName: string
  stageOrder: number
  matches: MatchPrediction[]
}

// ── Detect which bracket section a stage belongs to ──────────────────────────
function detectSection(name: string): 'upper' | 'lower' | 'grand_final' {
  const n = name.toLowerCase()
  if (n.includes('grand final')) return 'grand_final'
  if (n.includes('upper') || /\bub\b/.test(n)) return 'upper'
  if (n.includes('lower') || /\blb\b/.test(n)) return 'lower'
  return 'upper'
}

// ── Fixed-height match card ───────────────────────────────────────────────────
function BracketCard({ match }: { match: MatchPrediction }) {
  const t1 = match.team_1
  const t2 = match.team_2
  const winner = match.actual_winner_id
  const hasResult = match.score_team_1 !== null && match.score_team_2 !== null

  const row = (team: typeof t1, score: number | null, divider: boolean) => {
    const isWinner = hasResult && winner === team?.id
    const isLoser = hasResult && winner !== null && winner !== team?.id
    return (
      <div style={{
        height: MATCH_H / 2,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px',
        borderBottom: divider ? '1px solid hsl(var(--border) / 0.4)' : 'none',
        background: isWinner ? 'hsl(var(--success) / 0.09)' : 'transparent',
        opacity: isLoser ? 0.4 : 1,
      }}>
        {team?.logo_url
          ? <img loading="lazy" src={team.logo_url} alt={team.name ?? ''} style={{ width: 15, height: 15, objectFit: 'contain', flexShrink: 0 }} />
          : <div style={{ width: 15, height: 15, borderRadius: 3, background: 'hsl(var(--secondary))', flexShrink: 0 }} />
        }
        <span style={{
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: 11, fontWeight: isWinner ? 700 : 500,
          color: 'hsl(var(--foreground))',
        }}>
          {team?.name ?? 'TBD'}
        </span>
        {hasResult && score !== null && (
          <span style={{
            fontSize: 13, fontWeight: 800, flexShrink: 0,
            color: isWinner ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))',
          }}>
            {score}
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{
      width: MATCH_W, height: MATCH_H,
      borderRadius: 9, overflow: 'hidden',
      border: '1px solid hsl(var(--border) / 0.6)',
      background: 'hsl(var(--card) / 0.85)',
      flexShrink: 0,
    }}>
      {row(t1, match.score_team_1, true)}
      {row(t2, match.score_team_2, false)}
    </div>
  )
}

// ── One section (upper or lower) rendered as columns with CSS connectors ──────
function BracketSection({ rounds }: { rounds: Round[] }) {
  const sorted = [...rounds].sort((a, b) => a.stageOrder - b.stageOrder)
  if (!sorted.length) return null

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {sorted.map((round, ri) => {
        const slotH = SLOT_BASE * Math.pow(2, ri)   // slot height doubles each round
        const isLast = ri === sorted.length - 1

        return (
          <React.Fragment key={round.stageName}>
            {/* ── Round column ── */}
            <div style={{ flexShrink: 0 }}>
              {/* Round label */}
              <div style={{
                width: MATCH_W,
                textAlign: 'center',
                fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'hsl(var(--primary))',
                paddingBottom: 10,
              }}>
                {round.stageName}
              </div>

              {/* Match slots */}
              {round.matches.map((match) => (
                <div key={match.id} style={{
                  height: slotH, width: MATCH_W,
                  display: 'flex', alignItems: 'center',
                }}>
                  <BracketCard match={match} />
                </div>
              ))}
            </div>

            {/* ── Connector between this round and next ── */}
            {!isLast && (
              <div style={{
                flexShrink: 0,
                width: CONNECTOR_W,
                // push down by the label height so slots align
                paddingTop: 30,
              }}>
                {/* One connector group per pair of matches */}
                {Array.from({ length: Math.ceil(round.matches.length / 2) }).map((_, gi) => {
                  const groupH = slotH * 2
                  const topLineY = slotH / 2       // center of match 0 within its slot
                  const botLineY = slotH + slotH / 2 // center of match 1 within its slot

                  return (
                    <div key={gi} style={{ position: 'relative', height: groupH, width: CONNECTOR_W }}>
                      {/* Horizontal line from match 0 */}
                      <div style={{
                        position: 'absolute',
                        top: topLineY,
                        left: 0, right: 0, height: 1.5,
                        background: 'hsl(var(--border) / 0.55)',
                      }} />
                      {/* Vertical line connecting the two horizontals (on right side) */}
                      <div style={{
                        position: 'absolute',
                        top: topLineY,
                        bottom: groupH - botLineY,
                        right: 0, width: 1.5,
                        background: 'hsl(var(--border) / 0.55)',
                      }} />
                      {/* Horizontal line from match 1 */}
                      <div style={{
                        position: 'absolute',
                        top: botLineY,
                        left: 0, right: 0, height: 1.5,
                        background: 'hsl(var(--border) / 0.55)',
                      }} />
                    </div>
                  )
                })}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function BracketView({ rounds }: { rounds: Round[] }) {
  const upper = rounds.filter(r => detectSection(r.stageName) === 'upper')
  const lower = rounds.filter(r => detectSection(r.stageName) === 'lower')
  const gf = rounds.filter(r => detectSection(r.stageName) === 'grand_final')

  // If no upper/lower detected, show everything as one section
  const hasUL = upper.length > 0 || lower.length > 0
  const displayUpper = hasUL ? upper : rounds
  const displayLower = hasUL ? lower : []

  if (!rounds.length) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: 'hsl(var(--card)/0.6)', border: '1px solid hsl(var(--border)/0.6)' }}>
        <p className="text-4xl mb-3">🏆</p>
        <p className="font-semibold mb-1">No bracket data yet</p>
        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Add stages named with &quot;Upper&quot;, &quot;Lower&quot;, or &quot;Grand Final&quot; to populate the bracket.
        </p>
      </div>
    )
  }

  const SECTION_GAP = 48

  return (
    <div className="overflow-x-auto pb-6" style={{ overflowY: 'visible' }}>
      <div style={{ display: 'inline-flex', flexDirection: 'column', paddingTop: 8, minWidth: 'max-content' }}>

        {/* Upper bracket */}
        {displayUpper.length > 0 && (
          <div>
            {displayLower.length > 0 && (
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'hsl(var(--muted-foreground))', marginBottom: 12 }}>
                Upper Bracket
              </p>
            )}
            <BracketSection rounds={displayUpper} />
          </div>
        )}

        {/* Lower bracket */}
        {displayLower.length > 0 && (
          <div style={{ marginTop: SECTION_GAP }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'hsl(var(--muted-foreground))', marginBottom: 12 }}>
              Lower Bracket
            </p>
            <BracketSection rounds={displayLower} />
          </div>
        )}

        {/* Grand Final */}
        {gf.length > 0 && (
          <div style={{ marginTop: SECTION_GAP }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'hsl(var(--primary))', marginBottom: 12 }}>
              Grand Final
            </p>
            {gf[0].matches.map(m => (
              <BracketCard key={m.id} match={m} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
