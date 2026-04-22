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
const LINE = 'hsl(var(--border)/0.9)'

const UB_COLOR = 'hsl(var(--primary))'
const LB_COLOR = 'hsl(38 92% 50%)'   // amber/orange
const UB_TINT  = 'hsl(var(--primary)/0.03)'
const LB_TINT  = 'hsl(38 92% 50% / 0.03)'

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

function extractRoundLabel(matchName: string): string {
  let label = matchName.replace(/\s*:\s*.+$/, '').trim()
  label = label.replace(/\s+match\s*\d*$/i, '').trim()
  label = label.replace(/(?<!\bround)\s+\d+$/i, '').trim()
  return label.replace(/\b\w/g, c => c.toUpperCase()) || matchName
}

function toTeamSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function isBracketPhase(name: string): boolean {
  return /upper|lower|bracket|playoff|elimination|grand.?final/i.test(name) && !/group/i.test(name)
}

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
  const isTBD = !teamA && !teamB

  const stripColor = isLive
    ? 'hsl(var(--destructive))'
    : isFinished
      ? UB_COLOR
      : `${UB_COLOR.replace(')', '/0.45)')}`

  const row = (
    team: PSMatch['opponents'][0]['opponent'] | undefined,
    score: number | undefined,
    divider: boolean,
    won: boolean,
    lost: boolean,
  ) => (
    <div style={{
      height: MATCH_H / 2,
      display: 'flex', alignItems: 'center', gap: 9,
      paddingLeft: 14, paddingRight: 10,
      borderBottom: divider ? '1px solid hsl(var(--border)/0.2)' : 'none',
      background: won
        ? 'hsl(var(--primary)/0.08)'
        : isLive
          ? 'hsl(var(--destructive)/0.05)'
          : 'transparent',
    }}>
      <div style={{ opacity: lost ? 0.3 : 1, flexShrink: 0, display: 'flex' }}>
        {team?.image_url
          ? <Image src={team.image_url} alt={team.name} width={20} height={20} style={{ objectFit: 'contain' }} />
          : <div style={{ width: 20, height: 20, borderRadius: 4, background: 'hsl(var(--secondary))' }} />
        }
      </div>
      {team ? (
        <Link href={`/teams/${toTeamSlug(team.name)}`} style={{
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em',
          color: won
            ? UB_COLOR
            : lost
              ? 'hsl(var(--foreground)/0.28)'
              : 'hsl(var(--foreground)/0.88)',
          textDecoration: 'none',
        }}>
          {team.name}
        </Link>
      ) : (
        <span style={{
          flex: 1, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
          color: 'hsl(var(--muted-foreground)/0.35)', fontStyle: 'italic',
        }}>
          TBD
        </span>
      )}
      {hasResult && score !== undefined && (
        <span style={{
          fontSize: 17, fontWeight: 900, flexShrink: 0, minWidth: 18, textAlign: 'right',
          fontFamily: 'var(--font-oxanium, monospace)',
          color: isLive
            ? 'hsl(var(--destructive))'
            : won ? LB_COLOR : 'hsl(var(--foreground)/0.22)',
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
      border: isTBD
        ? '1px dashed hsl(var(--border)/0.3)'
        : isLive
          ? '1.5px solid hsl(var(--destructive)/0.5)'
          : '1px solid hsl(var(--border)/0.55)',
      background: isTBD ? 'transparent' : 'hsl(var(--card))',
      opacity: isTBD ? 0.38 : 1,
      flexShrink: 0,
      boxShadow: isLive
        ? '0 0 0 3px hsl(var(--destructive)/0.12), 0 4px 20px hsl(var(--background)/0.7)'
        : isTBD ? 'none'
          : '0 2px 12px hsl(var(--background)/0.65)',
      position: 'relative',
    }}>
      {!isTBD && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: stripColor,
        }} />
      )}
      {isLive && (
        <div style={{
          position: 'absolute', top: 5, right: 7,
          fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
          padding: '2px 5px', borderRadius: 4,
          background: 'hsl(var(--destructive))',
          color: '#fff', lineHeight: 1.4, zIndex: 1, pointerEvents: 'none',
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
function PSBracketSection({
  rounds, firstCount, connectorW = CONNECTOR_W, labelColor = UB_COLOR,
}: {
  rounds: Round[]
  firstCount: number
  connectorW?: number
  labelColor?: string
}) {
  const sorted = [...rounds].sort((a, b) => a.order - b.order)
  if (!sorted.length) return null

  const totalSectionH = firstCount * SLOT_BASE

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {sorted.map((round, ri) => {
        const count = round.matches.length
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
                fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.18em', color: labelColor,
                opacity: 0.75,
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
                  ? Array.from({ length: Math.ceil(count / 2) }).map((_, gi) => {
                      const groupH = slotH * 2
                      const topY = slotH / 2
                      const botY = slotH + slotH / 2
                      const midY = groupH / 2
                      return (
                        <div key={gi} style={{ position: 'relative', height: groupH, width: connectorW }}>
                          <div style={{ position: 'absolute', top: topY - 1, left: 0, width: connectorW / 2, height: 2, background: LINE }} />
                          <div style={{ position: 'absolute', top: topY - 1, bottom: groupH - botY - 1, left: connectorW / 2, width: 2, background: LINE }} />
                          <div style={{ position: 'absolute', top: botY - 1, left: 0, width: connectorW / 2, height: 2, background: LINE }} />
                          <div style={{ position: 'absolute', top: midY - 1, left: connectorW / 2, right: 6, height: 2, background: LINE }} />
                          <div style={{
                            position: 'absolute', right: 0, top: midY - 5,
                            width: 0, height: 0,
                            borderTop: '6px solid transparent',
                            borderBottom: '6px solid transparent',
                            borderLeft: `8px solid ${LINE}`,
                          }} />
                        </div>
                      )
                    })
                  : round.matches.map((_, mi) => (
                      <div key={mi} style={{ position: 'relative', height: slotH, width: connectorW }}>
                        <div style={{ position: 'absolute', top: slotH / 2 - 1, left: 0, right: 6, height: 2, background: LINE }} />
                        <div style={{
                          position: 'absolute', right: 0, top: slotH / 2 - 5,
                          width: 0, height: 0,
                          borderTop: '6px solid transparent',
                          borderBottom: '6px solid transparent',
                          borderLeft: `8px solid ${LINE}`,
                        }} />
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

  const roundMap = new Map<string, { section: 'upper' | 'lower' | 'grand_final'; matches: PSMatch[] }>()
  for (const { m, groupSection } of tagged) {
    const label = extractRoundLabel(m.name)
    const section: 'upper' | 'lower' | 'grand_final' =
      groupSection ?? detectSection(m.name) ?? 'upper'
    const key = `${section}::${label}`
    if (!roundMap.has(key)) roundMap.set(key, { section, matches: [] })
    roundMap.get(key)!.matches.push(m)
  }

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

  const ubFirst = Math.max(upper[0]?.matches.length ?? 1, 1)
  const lbFirst = Math.max(lower[0]?.matches.length ?? 1, 1)

  const ubW = upper.length * MATCH_W + Math.max(0, upper.length - 1) * CONNECTOR_W
  const lbW = lower.length * MATCH_W + Math.max(0, lower.length - 1) * CONNECTOR_W
  const ubOffset = Math.max(0, lbW - ubW - (MATCH_W + CONNECTOR_W))
  const lbOffset = Math.max(0, ubW - lbW)
  const ubConnW = upper.length > 1
    ? Math.max(CONNECTOR_W, (lbW - ubOffset - MATCH_W * upper.length) / (upper.length - 1))
    : CONNECTOR_W

  const ubSectionH = ROUND_LABEL_H + ubFirst * SLOT_BASE
  const lbSectionH = ROUND_LABEL_H + lbFirst * SLOT_BASE

  const ubLabelH = hasUL ? SECTION_LABEL_H : 0
  const lbLabelH = hasUL ? SECTION_LABEL_H : 0
  const ubFinalCenterY = ubLabelH + ROUND_LABEL_H + (ubFirst * SLOT_BASE) / 2
  const lbTopY = ubLabelH + ubSectionH + SECTION_GAP + lbLabelH
  const lbFinalCenterY = lbTopY + ROUND_LABEL_H + (lbFirst * SLOT_BASE) / 2
  const gfCenterY = (ubFinalCenterY + lbFinalCenterY) / 2
  const gfTopPad = Math.max(0, gfCenterY - ROUND_LABEL_H - MATCH_H / 2)
  const totalLeftH = ubLabelH + ubSectionH + (lower.length > 0 ? SECTION_GAP + lbLabelH + lbSectionH : 0)

  const sectionLabel = (text: string, color: string) => (
    <div style={{
      height: SECTION_LABEL_H, display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em',
      color,
    }}>
      <div style={{ width: 24, height: 2, background: color, borderRadius: 1, opacity: 0.6 }} />
      {text}
    </div>
  )

  return (
    <div className="mb-6">
      <p className="section-label mb-4">Playoff Bracket</p>
      <div className="rounded-2xl p-6 overflow-x-auto" style={{ background: 'hsl(var(--card)/0.4)', border: '1px solid hsl(var(--border)/0.6)' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'flex-start', minWidth: 'max-content' }}>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {upper.length > 0 && (
              <div style={{ marginLeft: ubOffset }}>
                {hasUL && sectionLabel('Upper Bracket', UB_COLOR)}
                <div style={{ background: UB_TINT, borderRadius: 12 }}>
                  <PSBracketSection rounds={upper} firstCount={ubFirst} connectorW={ubConnW} labelColor={UB_COLOR} />
                </div>
              </div>
            )}
            {lower.length > 0 && (
              <div style={{ marginTop: SECTION_GAP, marginLeft: lbOffset }}>
                {hasUL && sectionLabel('Lower Bracket', LB_COLOR)}
                <div style={{ background: LB_TINT, borderRadius: 12 }}>
                  <PSBracketSection rounds={lower} firstCount={lbFirst} labelColor={LB_COLOR} />
                </div>
              </div>
            )}
          </div>

          {/* GF connector */}
          {gfMatch && hasUL && (
            <div style={{ position: 'relative', width: GF_CONNECTOR_W, height: totalLeftH, flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: ubFinalCenterY - 1, left: 0, width: GF_CONNECTOR_W / 2, height: 2, background: LINE }} />
              <div style={{ position: 'absolute', top: lbFinalCenterY - 1, left: 0, width: GF_CONNECTOR_W / 2, height: 2, background: LINE }} />
              <div style={{ position: 'absolute', left: GF_CONNECTOR_W / 2, top: ubFinalCenterY - 1, height: lbFinalCenterY - ubFinalCenterY, width: 2, background: LINE }} />
              <div style={{ position: 'absolute', top: gfCenterY - 1, left: GF_CONNECTOR_W / 2, right: 6, height: 2, background: LINE }} />
              <div style={{
                position: 'absolute', right: 0, top: gfCenterY - 6,
                width: 0, height: 0,
                borderTop: '7px solid transparent',
                borderBottom: '7px solid transparent',
                borderLeft: `9px solid ${LINE}`,
              }} />
            </div>
          )}

          {/* Grand Final column */}
          {gfMatch && (
            <div style={{ paddingTop: gfTopPad, flexShrink: 0 }}>
              <div style={{
                width: MATCH_W, height: ROUND_LABEL_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.18em', color: 'hsl(var(--primary))',
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
