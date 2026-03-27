import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { PSMatch } from '@/lib/pandascore'

const MATCH_W = 256
const MATCH_H = 88                     // each team row = 44px
const SLOT_BASE = MATCH_H + 20        // 108 — slot height when 1 match per slot
const CONNECTOR_W = 48
const ROUND_LABEL_H = 32              // per-round label row height
const SECTION_LABEL_H = 24            // "Upper Bracket" / "Lower Bracket" label height
const SECTION_GAP = 56                // vertical gap between UB and LB
const GF_CONNECTOR_W = 64            // space between LB/UB Final and GF card
const LINE = 'hsl(var(--border)/0.6)'

interface Round {
  name: string
  order: number
  section: 'upper' | 'lower' | 'grand_final'
  matches: PSMatch[]
}

function detectSection(name: string): 'upper' | 'lower' | 'grand_final' | null {
  const n = name.toLowerCase()
  if (n.includes('grand final')) return 'grand_final'
  if (n.includes('upper') || /\bub\b/.test(n)) return 'upper'
  if (n.includes('lower') || /\blb\b/.test(n)) return 'lower'
  return null
}

// "Upper bracket semifinal 2: AUR vs TUN"    → "Upper Bracket Semifinal"
// "Lower bracket round 1 match 1: MOUZ vs X" → "Lower Bracket Round 1"
function extractRoundLabel(matchName: string): string {
  let label = matchName.replace(/\s*:\s*.+$/, '').trim()  // strip ": X vs Y"
  label = label.replace(/\s+match\s*\d*$/i, '').trim()    // strip trailing " match 1" / " match"
  label = label.replace(/(?<!\bround)\s+\d+$/i, '').trim() // strip trailing " 2", " 1" — but keep "Round 1"
  // Title-case
  return label.replace(/\b\w/g, c => c.toUpperCase()) || matchName
}

function toTeamSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function isBracketPhase(name: string): boolean {
  return /upper|lower|bracket|playoff|elimination|grand.?final/i.test(name) && !/group/i.test(name)
}

// Stable round ordering by name keywords — used when scheduled_at is unknown
function roundOrderKey(name: string): number {
  const n = name.toLowerCase()
  if (/round.?1\b/.test(n) || /\br1\b/.test(n)) return 1
  if (/round.?2\b/.test(n) || /\br2\b/.test(n)) return 2
  if (/round.?3\b/.test(n) || /\br3\b/.test(n)) return 3
  if (/quarterfinal/.test(n))                    return 4
  if (/semifinal/.test(n))                       return 5
  if (/grand.?final/.test(n))                    return 9
  if (/final/.test(n))                           return 6
  return 5
}

// ── Match card ────────────────────────────────────────────────────────────────
function PSBracketCard({ match }: { match: PSMatch }) {
  const teamA = match.opponents[0]?.opponent
  const teamB = match.opponents[1]?.opponent
  const scoreA = match.results.find(r => r.team_id === teamA?.id)?.score
  const scoreB = match.results.find(r => r.team_id === teamB?.id)?.score
  const isLive = match.status === 'running'
  const isFinished = match.status === 'finished'
  const hasResult = (isFinished || isLive) && scoreA !== undefined && scoreB !== undefined
  const aWon = isFinished && hasResult && scoreA! > scoreB!
  const bWon = isFinished && hasResult && scoreB! > scoreA!

  const row = (
    team: PSMatch['opponents'][0]['opponent'] | undefined,
    score: number | undefined,
    divider: boolean,
    won: boolean,
    lost: boolean,
  ) => (
    <div style={{
      height: MATCH_H / 2,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 10px',
      borderBottom: divider ? '1px solid hsl(var(--border)/0.35)' : 'none',
      background: won ? 'hsl(var(--success)/0.1)' : isLive ? 'hsl(var(--destructive)/0.04)' : 'transparent',
      opacity: lost ? 0.42 : 1,
      transition: 'background 0.2s',
    }}>
      {team?.image_url
        ? <Image src={team.image_url} alt={team.name} width={18} height={18} style={{ objectFit: 'contain', flexShrink: 0 }} />
        : <div style={{ width: 18, height: 18, borderRadius: 4, background: 'hsl(var(--secondary))', flexShrink: 0 }} />
      }
      {team ? (
        <Link href={`/teams/${toTeamSlug(team.name)}`} style={{
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: 13, fontWeight: won ? 700 : 500,
          color: won ? 'hsl(var(--foreground))' : 'hsl(var(--foreground)/0.9)',
          textDecoration: 'none',
        }}>
          {team.name}
        </Link>
      ) : (
        <span style={{
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: 13, fontWeight: 400, color: 'hsl(var(--muted-foreground)/0.9)',
          fontStyle: 'italic',
        }}>
          TBD
        </span>
      )}
      {hasResult && score !== undefined && (
        <span style={{
          fontSize: 15, fontWeight: 800, flexShrink: 0, minWidth: 14, textAlign: 'right',
          color: isLive
            ? 'hsl(var(--destructive))'
            : won ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground)/0.5)',
        }}>
          {score}
        </span>
      )}
    </div>
  )

  return (
    <div style={{
      width: MATCH_W, height: MATCH_H,
      borderRadius: 10, overflow: 'hidden',
      border: isLive
        ? '1.5px solid hsl(var(--destructive)/0.55)'
        : isFinished
          ? '1px solid hsl(var(--border)/0.5)'
          : '1px solid hsl(var(--border)/0.7)',
      background: 'hsl(var(--card))',
      flexShrink: 0,
      boxShadow: isLive
        ? '0 0 0 3px hsl(var(--destructive)/0.1), 0 2px 12px hsl(var(--background)/0.5)'
        : '0 1px 6px hsl(var(--background)/0.4)',
      position: 'relative',
    }}>
      {isLive && (
        <div style={{
          position: 'absolute', top: 4, right: 6,
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          padding: '1px 4px', borderRadius: 3,
          background: 'hsl(var(--destructive))',
          color: '#fff',
          lineHeight: 1.4, zIndex: 1, pointerEvents: 'none',
        }}>
          LIVE
        </div>
      )}
      {row(teamA, scoreA, true, aWon, bWon)}
      {row(teamB, scoreB, false, bWon, aWon)}
    </div>
  )
}

// ── Bracket section (upper or lower) ─────────────────────────────────────────
// firstCount: match count in the first (leftmost) round — used to fix slot heights
// so every round column has the same total rendered height regardless of match count.
function PSBracketSection({ rounds, firstCount, connectorW = CONNECTOR_W }: { rounds: Round[]; firstCount: number; connectorW?: number }) {
  const sorted = [...rounds].sort((a, b) => a.order - b.order)
  if (!sorted.length) return null

  const totalSectionH = firstCount * SLOT_BASE  // constant across all columns

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {sorted.map((round, ri) => {
        const count = round.matches.length
        // Slot height scales so total height = firstCount × SLOT_BASE always
        const slotH = Math.round(totalSectionH / count)
        const isLast = ri === sorted.length - 1
        const nextCount = sorted[ri + 1]?.matches.length ?? 0
        const isHalving = nextCount > 0 && nextCount < count

        return (
          <React.Fragment key={round.name}>
            {/* Round column */}
            <div style={{ flexShrink: 0 }}>
              <div style={{
                width: MATCH_W, height: ROUND_LABEL_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: 'hsl(var(--primary)/0.8)',
              }}>
                {round.name}
              </div>
              {round.matches.map(match => (
                <div key={match.id} style={{ height: slotH, width: MATCH_W, display: 'flex', alignItems: 'center' }}>
                  <PSBracketCard match={match} />
                </div>
              ))}
            </div>

            {/* Connector to next round */}
            {!isLast && (
              <div style={{ flexShrink: 0, width: connectorW, paddingTop: ROUND_LABEL_H }}>
                {isHalving
                  // Fork: pairs of matches feed into one next-round slot
                  ? Array.from({ length: Math.ceil(count / 2) }).map((_, gi) => {
                      const groupH = slotH * 2
                      const topY = slotH / 2
                      const botY = slotH + slotH / 2
                      return (
                        <div key={gi} style={{ position: 'relative', height: groupH, width: connectorW }}>
                          <div style={{ position: 'absolute', top: topY, left: 0, right: 0, height: 2, background: LINE }} />
                          <div style={{ position: 'absolute', top: topY, bottom: groupH - botY, right: 0, width: 2, background: LINE }} />
                          <div style={{ position: 'absolute', top: botY, left: 0, right: 0, height: 2, background: LINE }} />
                        </div>
                      )
                    })
                  // Straight: one-to-one pass-through (same match count next round)
                  : round.matches.map((_, mi) => (
                      <div key={mi} style={{ position: 'relative', height: slotH, width: connectorW }}>
                        <div style={{ position: 'absolute', top: slotH / 2, left: 0, right: 0, height: 2, background: LINE }} />
                      </div>
                    ))
                }
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PSBracketView({ groups }: { groups: { name: string; matches: PSMatch[] }[] }) {
  // Deduplicate and tag each match with its group's section
  const seen = new Set<number>()
  const tagged = groups
    .filter(g => isBracketPhase(g.name))
    .flatMap(g => g.matches.map(m => ({ m, groupSection: detectSection(g.name) })))
    .filter(({ m }) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })

  if (!tagged.length) return null

  // Group by section + round label
  const roundMap = new Map<string, { section: 'upper' | 'lower' | 'grand_final'; matches: PSMatch[] }>()
  for (const { m, groupSection } of tagged) {
    const label = extractRoundLabel(m.name)
    // Use group name for section when possible; fall back to match name
    const section: 'upper' | 'lower' | 'grand_final' =
      groupSection ?? detectSection(m.name) ?? 'upper'
    const key = `${section}::${label}`
    if (!roundMap.has(key)) roundMap.set(key, { section, matches: [] })
    roundMap.get(key)!.matches.push(m)
  }

  // Build rounds — sort by round keyword order (primary), then scheduled_at (secondary)
  const rounds: Round[] = Array.from(roundMap.entries()).map(([key, { section, matches }]) => {
    const label = key.split('::')[1]
    const keywordOrder = roundOrderKey(label)
    const earliest = matches.reduce((min, m) => {
      const t = new Date(m.scheduled_at ?? m.begin_at ?? '').getTime()
      return !isNaN(t) && t < min ? t : min
    }, Infinity)
    const order = keywordOrder * 1e13 + (isFinite(earliest) ? earliest : 0)
    return { name: label, order, section, matches }
  })

  const upper = rounds.filter(r => r.section === 'upper').sort((a, b) => a.order - b.order)
  const lower = rounds.filter(r => r.section === 'lower').sort((a, b) => a.order - b.order)
  const gfRounds = rounds.filter(r => r.section === 'grand_final')
  const gfMatch = gfRounds[0]?.matches[0] ?? null

  if (!upper.length && !lower.length) return null

  const hasUL = upper.length > 0 && lower.length > 0

  // First-round match counts (for slot height scaling)
  const ubFirst = Math.max(upper[0]?.matches.length ?? 1, 1)
  const lbFirst = Math.max(lower[0]?.matches.length ?? 1, 1)

  // Section widths — N rounds = N × MATCH_W + (N-1) × CONNECTOR_W
  const ubW = upper.length * MATCH_W + Math.max(0, upper.length - 1) * CONNECTOR_W
  const lbW = lower.length * MATCH_W + Math.max(0, lower.length - 1) * CONNECTOR_W
  // Shift UB one column left so UB Semis aligns with LB QF (not LB SF)
  // Then widen the UB connector so UB Final still aligns with LB Final (same right edge)
  const ubOffset = Math.max(0, lbW - ubW - (MATCH_W + CONNECTOR_W))
  const lbOffset = Math.max(0, ubW - lbW)
  // Custom UB connector width: fills the extra space so both sections end at the same x
  const ubConnW = upper.length > 1
    ? Math.max(CONNECTOR_W, (lbW - ubOffset - MATCH_W * upper.length) / (upper.length - 1))
    : CONNECTOR_W

  // Section content heights (label row + match slots)
  const ubSectionH = ROUND_LABEL_H + ubFirst * SLOT_BASE
  const lbSectionH = ROUND_LABEL_H + lbFirst * SLOT_BASE

  // Y-centers of UB Final and LB Final for the GF connector lines
  const ubLabelH = hasUL ? SECTION_LABEL_H : 0
  const lbLabelH = hasUL ? SECTION_LABEL_H : 0
  const ubFinalCenterY = ubLabelH + ROUND_LABEL_H + (ubFirst * SLOT_BASE) / 2
  const lbTopY = ubLabelH + ubSectionH + SECTION_GAP + lbLabelH
  const lbFinalCenterY = lbTopY + ROUND_LABEL_H + (lbFirst * SLOT_BASE) / 2

  // GF card center = midpoint between UB Final and LB Final centers
  const gfCenterY = (ubFinalCenterY + lbFinalCenterY) / 2
  const gfTopPad = Math.max(0, gfCenterY - ROUND_LABEL_H - MATCH_H / 2)

  // Total height of left column (for the connector div)
  const totalLeftH = ubLabelH + ubSectionH + (lower.length > 0 ? SECTION_GAP + lbLabelH + lbSectionH : 0)

  const sectionLabel = (text: string) => (
    <div style={{ height: SECTION_LABEL_H, display: 'flex', alignItems: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'hsl(var(--muted-foreground)/0.7)' }}>
      {text}
    </div>
  )

  return (
    <div className="mb-6">
      <p className="section-label mb-4">Playoff Bracket</p>
      <div className="rounded-2xl p-6 overflow-x-auto" style={{ background: 'hsl(var(--card)/0.5)', border: '1px solid hsl(var(--border)/0.6)' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'flex-start', minWidth: 'max-content' }}>

          {/* Left column: UB on top (offset right), LB below (offset left) — finals align */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {upper.length > 0 && (
              <div style={{ marginLeft: ubOffset }}>
                {hasUL && sectionLabel('Upper Bracket')}
                <PSBracketSection rounds={upper} firstCount={ubFirst} connectorW={ubConnW} />
              </div>
            )}
            {lower.length > 0 && (
              <div style={{ marginTop: SECTION_GAP, marginLeft: lbOffset }}>
                {hasUL && sectionLabel('Lower Bracket')}
                <PSBracketSection rounds={lower} firstCount={lbFirst} />
              </div>
            )}
          </div>

          {/* GF connector: lines from UB Final + LB Final meeting at GF midpoint */}
          {gfMatch && hasUL && (
            <div style={{ position: 'relative', width: GF_CONNECTOR_W, height: totalLeftH, flexShrink: 0 }}>
              {/* Horizontal from UB Final → midpoint */}
              <div style={{ position: 'absolute', top: ubFinalCenterY, left: 0, width: GF_CONNECTOR_W / 2, height: 2, background: LINE }} />
              {/* Horizontal from LB Final → midpoint */}
              <div style={{ position: 'absolute', top: lbFinalCenterY, left: 0, width: GF_CONNECTOR_W / 2, height: 2, background: LINE }} />
              {/* Vertical joining UB Final and LB Final at the midpoint */}
              <div style={{ position: 'absolute', left: GF_CONNECTOR_W / 2, top: ubFinalCenterY, height: lbFinalCenterY - ubFinalCenterY, width: 2, background: LINE }} />
              {/* Horizontal from midpoint → GF */}
              <div style={{ position: 'absolute', top: gfCenterY, left: GF_CONNECTOR_W / 2, right: 0, height: 2, background: LINE }} />
            </div>
          )}

          {/* Grand Final column */}
          {gfMatch && (
            <div style={{ paddingTop: gfTopPad, flexShrink: 0 }}>
              <div style={{
                width: MATCH_W, height: ROUND_LABEL_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: 'hsl(var(--primary))',
              }}>
                Grand Final
              </div>
              <PSBracketCard match={gfMatch} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
