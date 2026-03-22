import Link from 'next/link'
import Image from 'next/image'
import type { PSStanding, PSMatch } from '@/lib/pandascore'

function teamSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export interface GroupData {
  id: number
  name: string
  standings: PSStanding[]
  matches: PSMatch[]
}

function MatchCell({ match, rowTeamId }: { match: PSMatch | undefined; rowTeamId: number }) {
  if (!match) {
    return <td className="w-16 h-10 text-center text-xs" style={{ color: 'var(--text-subtle)' }}>—</td>
  }

  if (match.status === 'running') {
    const rowResult = match.results.find(r => r.team_id === rowTeamId)
    const otherResult = match.results.find(r => r.team_id !== rowTeamId)
    const hasPartial = rowResult !== undefined && otherResult !== undefined
    return (
      <td className="w-16 h-10 text-center">
        <div className="flex flex-col items-center gap-0.5">
          {hasPartial && (
            <span className="text-sm font-black tabular-nums" style={{ color: 'hsl(var(--destructive))' }}>
              {rowResult!.score}:{otherResult!.score}
            </span>
          )}
          <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' }}>
            LIVE
          </span>
        </div>
      </td>
    )
  }

  if (match.status === 'not_started') {
    const date = match.scheduled_at
      ? new Date(match.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : '–'
    return (
      <td className="w-16 h-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        {date}
      </td>
    )
  }

  // Finished
  const rowResult = match.results.find(r => r.team_id === rowTeamId)
  const otherResult = match.results.find(r => r.team_id !== rowTeamId)
  const rowScore = rowResult?.score ?? 0
  const otherScore = otherResult?.score ?? 0
  const won = rowScore > otherScore
  const drew = rowScore === otherScore
  const color = drew ? '#f59e0b' : won ? 'var(--correct)' : 'var(--wrong)'

  return (
    <td className="w-16 h-10 text-center">
      <span
        className="text-sm font-black tabular-nums"
        style={{ color }}
      >
        {rowScore}:{otherScore}
      </span>
    </td>
  )
}

function GroupCard({ group }: { group: GroupData }) {
  const teams = group.standings.map(s => s.team)

  // Build match lookup map: matchMap[rowTeamId][colTeamId] = match
  const matchMap: Record<number, Record<number, PSMatch>> = {}
  for (const match of group.matches) {
    const [opp1, opp2] = match.opponents
    if (!opp1 || !opp2) continue
    const id1 = opp1.opponent.id
    const id2 = opp2.opponent.id
    if (!matchMap[id1]) matchMap[id1] = {}
    if (!matchMap[id2]) matchMap[id2] = {}
    matchMap[id1][id2] = match
    matchMap[id2][id1] = match
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Group header */}
      <div
        className="px-5 py-3"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}
      >
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {group.name}
        </h3>
      </div>

      <div className="overflow-x-auto" style={{ background: 'var(--surface)' }}>
        <div className="flex gap-8 p-4 min-w-max">

          {/* ── Standings table ── */}
          <table className="text-sm border-collapse shrink-0">
            <thead>
              <tr>
                <th className="pb-3 pr-2 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-subtle)', width: 20 }}>#</th>
                <th className="pb-3 pr-8 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>Team</th>
                <th className="pb-3 px-3 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--correct)' }}>W</th>
                <th className="pb-3 px-3 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--wrong)' }}>L</th>
                <th className="pb-3 pl-3 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {group.standings.map((s, i) => (
                <tr key={s.team.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <td className="py-2.5 pr-2 text-xs font-bold tabular-nums text-center" style={{ color: 'var(--text-subtle)' }}>
                    {s.rank}
                  </td>
                  <td className="py-2.5 pr-8">
                    <div className="flex items-center gap-2.5">
                      {s.team.image_url ? (
                        <Image
                          src={s.team.image_url}
                          alt={s.team.name}
                          width={20}
                          height={20}
                          className="w-5 h-5 object-contain shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded shrink-0" style={{ background: 'var(--surface-3)' }} />
                      )}
                      <Link
                        href={`/teams/${teamSlug(s.team.name)}`}
                        className="font-semibold whitespace-nowrap hover:text-primary transition-colors"
                        style={{ color: 'var(--text)' }}
                      >
                        {s.team.name}
                      </Link>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-sm font-black tabular-nums" style={{ color: 'var(--correct)' }}>
                    {s.wins}
                  </td>
                  <td className="py-2.5 px-3 text-center text-sm font-black tabular-nums" style={{ color: s.losses > 0 ? 'var(--wrong)' : 'var(--text-muted)' }}>
                    {s.losses}
                  </td>
                  <td className="py-2.5 pl-3 text-center text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>
                    {s.wins * 3 + s.draws}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Match grid ── */}
          <table className="border-collapse">
            <thead>
              <tr>
                {teams.map(t => (
                  <th key={t.id} className="w-16 pb-3 text-center">
                    {t.image_url ? (
                      <Image
                        src={t.image_url}
                        alt={t.name}
                        title={t.name}
                        width={24}
                        height={24}
                        className="w-6 h-6 object-contain mx-auto"
                      />
                    ) : (
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                        {(t.acronym ?? t.name).slice(0, 3).toUpperCase()}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((rowTeam, rowIdx) => (
                <tr key={rowTeam.id} style={{ borderTop: rowIdx > 0 ? '1px solid var(--border)' : 'none' }}>
                  {teams.map((colTeam) => {
                    if (rowTeam.id === colTeam.id) {
                      return (
                        <td
                          key={colTeam.id}
                          className="w-16 h-10"
                          style={{ background: 'var(--surface-2)' }}
                        />
                      )
                    }
                    return (
                      <MatchCell
                        key={colTeam.id}
                        match={matchMap[rowTeam.id]?.[colTeam.id]}
                        rowTeamId={rowTeam.id}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  )
}

export default function GroupStageView({ groups }: { groups: GroupData[] }) {
  if (groups.length === 0) return null

  return (
    <div className="mb-8">
      <p className="section-label mb-4">Group Stage</p>
      <div className="grid gap-4">
        {groups.map(group => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  )
}
