import Image from 'next/image'
import Link from 'next/link'
import type { PSMatch, PSTeam } from '@/lib/pandascore'

function teamSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// Group matches by UTC date string (YYYY-MM-DD) to determine round order
function getRoundGroups(matches: PSMatch[]): PSMatch[][] {
  const dateMap = new Map<string, PSMatch[]>()
  for (const m of matches) {
    const iso = m.scheduled_at ?? m.begin_at
    if (!iso) continue
    const day = iso.slice(0, 10)
    if (!dateMap.has(day)) dateMap.set(day, [])
    dateMap.get(day)!.push(m)
  }
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, ms]) => ms)
}

interface RoundSlot {
  opponent: PSTeam | null
  result: 'W' | 'L' | 'upcoming' | 'tbd'
  score: string | null
}

interface SwissRow {
  team: PSTeam
  wins: number
  losses: number
  rounds: (RoundSlot | null)[] // null = team was eliminated before this round
  status: 'advanced' | 'eliminated' | 'playing'
}

export default function SwissStandings({ matches, advanceCount = 8, groupStageName = 'Swiss Group Stage', showSectionLabel = true }: {
  matches: PSMatch[]
  advanceCount?: number
  groupStageName?: string
  showSectionLabel?: boolean
}) {
  if (matches.length === 0) return null

  const rounds = getRoundGroups(matches)
  const numRounds = rounds.length

  // Collect all teams from all matches
  const teamMap = new Map<number, PSTeam>()
  for (const m of matches) {
    for (const o of m.opponents) {
      if (o.opponent.id && o.opponent.name !== 'TBD') {
        teamMap.set(o.opponent.id, o.opponent)
      }
    }
  }
  const allTeams = Array.from(teamMap.values())

  // Build per-team records
  const record = new Map<number, { wins: number; losses: number }>()
  for (const t of allTeams) {
    record.set(t.id, { wins: 0, losses: 0 })
  }

  // For each team, track which match they played in each round
  const teamRoundMatch = new Map<number, Map<number, PSMatch>>()
  for (const t of allTeams) {
    teamRoundMatch.set(t.id, new Map())
  }

  for (let ri = 0; ri < rounds.length; ri++) {
    for (const m of rounds[ri]) {
      const [oA, oB] = m.opponents
      if (!oA || !oB) continue
      const tA = oA.opponent
      const tB = oB.opponent
      if (!tA.id || !tB.id) continue

      teamRoundMatch.get(tA.id)?.set(ri, m)
      teamRoundMatch.get(tB.id)?.set(ri, m)

      if (m.status === 'finished' && m.results.length >= 2) {
        const rA = m.results.find(r => r.team_id === tA.id)
        const rB = m.results.find(r => r.team_id === tB.id)
        if (rA && rB) {
          const recA = record.get(tA.id)!
          const recB = record.get(tB.id)!
          if (rA.score > rB.score) { recA.wins++; recB.losses++ }
          else if (rB.score > rA.score) { recB.wins++; recA.losses++ }
        }
      }
    }
  }

  const maxWins = 3
  const maxLosses = 3

  // Build rows
  const rows: SwissRow[] = allTeams.map(team => {
    const rec = record.get(team.id) ?? { wins: 0, losses: 0 }
    const status: SwissRow['status'] =
      rec.wins >= maxWins ? 'advanced' :
      rec.losses >= maxLosses ? 'eliminated' : 'playing'

    const roundSlots: (RoundSlot | null)[] = []
    const teamMatches = teamRoundMatch.get(team.id)!

    for (let ri = 0; ri < numRounds; ri++) {
      const m = teamMatches.get(ri)
      if (!m) {
        // No match this round — either not yet scheduled (TBD opponents) or eliminated
        roundSlots.push({ opponent: null, result: 'tbd', score: null })
        continue
      }

      const [oA, oB] = m.opponents
      const isTeamA = oA?.opponent.id === team.id
      const opponent = isTeamA ? oB?.opponent : oA?.opponent

      if (m.status === 'not_started') {
        roundSlots.push({ opponent: opponent ?? null, result: 'upcoming', score: null })
      } else if (m.status === 'running') {
        roundSlots.push({ opponent: opponent ?? null, result: 'upcoming', score: null })
      } else {
        const myResult = m.results.find(r => r.team_id === team.id)
        const oppResult = m.results.find(r => r.team_id !== team.id)
        const won = myResult && oppResult && myResult.score > oppResult.score
        const scoreStr = myResult && oppResult ? `${myResult.score}–${oppResult.score}` : null
        roundSlots.push({
          opponent: opponent ?? null,
          result: won ? 'W' : 'L',
          score: scoreStr,
        })
      }
    }

    return { team, wins: rec.wins, losses: rec.losses, rounds: roundSlots, status }
  })

  // Sort: wins desc, losses asc, name asc
  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (a.losses !== b.losses) return a.losses - b.losses
    return a.team.name.localeCompare(b.team.name)
  })

  const advanceLineAfter = advanceCount - 1

  return (
    <div className="mb-8">
      {showSectionLabel && <h2 className="section-label mb-4">{groupStageName}</h2>}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{groupStageName}</h3>
          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>— Top {advanceCount} advance to Playoffs</span>
        </div>

        <div className="overflow-x-auto" style={{ background: 'var(--surface)' }}>
          <table className="w-full text-sm border-collapse" style={{ minWidth: 540 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-widest w-8" style={{ color: 'var(--text-subtle)' }}>#</th>
                <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>Team</th>
                <th className="py-2.5 px-3 text-center text-[10px] font-bold uppercase tracking-widest w-16" style={{ color: 'var(--text-subtle)' }}>W–L</th>
                {rounds.map((_, ri) => (
                  <th key={ri} className="py-2.5 px-2 text-center text-[10px] font-bold uppercase tracking-widest w-24" style={{ color: 'var(--text-subtle)' }}>
                    Round {ri + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isAdvanced = row.status === 'advanced'
                const isEliminated = row.status === 'eliminated'
                const rowBg = isAdvanced
                  ? 'rgba(34,197,94,0.04)'
                  : isEliminated
                  ? 'rgba(239,68,68,0.04)'
                  : 'transparent'
                const drawBorderAfter = idx === advanceLineAfter

                return (
                  <tr
                    key={row.team.id}
                    style={{
                      borderTop: '1px solid var(--border)',
                      background: rowBg,
                      ...(drawBorderAfter ? { borderBottom: '2px solid rgba(34,197,94,0.4)' } : {}),
                    }}
                  >
                    {/* Rank */}
                    <td className="py-2.5 px-4 text-center text-xs font-bold tabular-nums" style={{ color: 'var(--text-subtle)' }}>
                      {idx + 1}
                    </td>

                    {/* Team */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {row.team.image_url ? (
                          <Image
                            src={row.team.image_url}
                            alt={row.team.name}
                            width={20}
                            height={20}
                            className="w-5 h-5 object-contain shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded shrink-0" style={{ background: 'var(--surface-3)' }} />
                        )}
                        <Link
                          href={`/teams/${teamSlug(row.team.name)}`}
                          className="font-semibold whitespace-nowrap hover:text-primary transition-colors"
                          style={{ color: isEliminated ? 'var(--text-muted)' : 'var(--text)' }}
                        >
                          {row.team.name}
                        </Link>
                        {isAdvanced && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.15)', color: 'rgb(34,197,94)' }}>
                            ADV
                          </span>
                        )}
                        {isEliminated && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)' }}>
                            OUT
                          </span>
                        )}
                      </div>
                    </td>

                    {/* W–L */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-sm font-black tabular-nums">
                        <span style={{ color: row.wins > 0 ? 'var(--correct)' : 'var(--text-muted)' }}>{row.wins}</span>
                        <span style={{ color: 'var(--text-subtle)' }}>–</span>
                        <span style={{ color: row.losses > 0 ? 'var(--wrong)' : 'var(--text-muted)' }}>{row.losses}</span>
                      </span>
                    </td>

                    {/* Round cells */}
                    {row.rounds.map((slot, ri) => {
                      if (!slot || slot.result === 'tbd') {
                        return (
                          <td key={ri} className="py-2.5 px-2 text-center text-xs" style={{ color: 'var(--text-subtle)' }}>
                            —
                          </td>
                        )
                      }
                      if (slot.result === 'upcoming') {
                        return (
                          <td key={ri} className="py-2.5 px-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              {slot.opponent ? (
                                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                                  {slot.opponent.acronym ?? slot.opponent.name.slice(0, 4).toUpperCase()}
                                </span>
                              ) : (
                                <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>TBD</span>
                              )}
                            </div>
                          </td>
                        )
                      }
                      const won = slot.result === 'W'
                      return (
                        <td key={ri} className="py-2.5 px-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                background: won ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                                color: won ? 'var(--correct)' : 'var(--wrong)',
                              }}
                            >
                              {won ? 'W' : 'L'}
                            </span>
                            {slot.opponent && (
                              <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
                                {slot.opponent.acronym ?? slot.opponent.name.slice(0, 4).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
