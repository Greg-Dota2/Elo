import Link from 'next/link'
import { format } from 'date-fns'
import { fetchLiveGroupsData, type Tier1Entry } from '@/lib/liveGroups'
import type { GroupData } from './GroupStageView'

type SchedulePrediction = {
  pandascore_match_id?: number | null
  match_date?: string | null
  team_1?: { name: string } | null
  team_2?: { name: string } | null
}

interface Props {
  slug: string
  tier1Entry: Tier1Entry | undefined
  isOver: boolean
  archivedGroups: GroupData[] | null
  predictions: SchedulePrediction[]
}

export default async function LiveSchedule({ slug, tier1Entry, isOver, archivedGroups, predictions }: Props) {
  const groupsData = await fetchLiveGroupsData(slug, tier1Entry, isOver, archivedGroups)
  if (groupsData.length === 0) return null

  const psIdToDate = new Map<number, string>()
  const teamPairToDate = new Map<string, string>()
  for (const p of predictions) {
    if (p.pandascore_match_id && p.match_date) psIdToDate.set(p.pandascore_match_id, p.match_date)
    if (p.match_date && p.team_1?.name && p.team_2?.name) {
      const key = [p.team_1.name.toLowerCase(), p.team_2.name.toLowerCase()].sort().join('|')
      teamPairToDate.set(key, p.match_date)
    }
  }

  const psTeamSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const allMatches = groupsData
    .flatMap(g => g.matches.map(m => ({ ...m, _groupName: g.name })))
    .sort((a, b) => {
      const ta = new Date(a.scheduled_at ?? a.begin_at ?? '').getTime()
      const tb = new Date(b.scheduled_at ?? b.begin_at ?? '').getTime()
      return ta - tb
    })

  const athensDayLabel = (iso: string) => {
    const d = new Date(iso)
    const [y, mo, day] = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' }).split('-').map(Number)
    return format(new Date(y, mo - 1, day), 'MMM d')
  }

  const byDay = new Map<string, typeof allMatches>()
  for (const m of allMatches) {
    let day: string
    const tA = m.opponents[0]?.opponent
    const tB = m.opponents[1]?.opponent
    const pairKey = tA && tB ? [tA.name.toLowerCase(), tB.name.toLowerCase()].sort().join('|') : null
    const dbDate = psIdToDate.get(m.id) ?? (pairKey ? teamPairToDate.get(pairKey) : undefined)
    if (dbDate) {
      const [y, mo, d] = dbDate.split('-').map(Number)
      day = format(new Date(y, mo - 1, d), 'MMM d')
    } else {
      const dateSource = (m.status === 'finished' && m.begin_at) ? m.begin_at : m.scheduled_at
      day = dateSource ? athensDayLabel(dateSource) : 'TBD'
    }
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(m)
  }

  const firstMatch = allMatches[0]
  const league = firstMatch?.league
  const todayLabel = athensDayLabel(new Date().toISOString())

  const sortDayMatches = (matches: typeof allMatches) => {
    const p = (m: typeof allMatches[0]) => m.status === 'running' ? 0 : m.status === 'finished' ? 2 : 1
    return [...matches].sort((a, b) => {
      const diff = p(a) - p(b)
      if (diff !== 0) return diff
      return new Date(a.scheduled_at ?? '').getTime() - new Date(b.scheduled_at ?? '').getTime()
    })
  }

  const activeDays: [string, typeof allMatches][] = []
  const finishedDays: [string, typeof allMatches][] = []
  for (const entry of byDay.entries()) {
    const [day, dayMatches] = entry
    const allFinished = dayMatches.every(m => m.status === 'finished')
    if (allFinished && day !== todayLabel) finishedDays.push([day, dayMatches])
    else activeDays.push([day, sortDayMatches(dayMatches)])
  }
  activeDays.reverse()
  finishedDays.reverse()
  const totalFinished = finishedDays.reduce((n, [, ms]) => n + ms.length, 0)

  const renderDayRows = (dayMatches: typeof allMatches) =>
    dayMatches.map((m, i) => {
      const teamA = m.opponents[0]?.opponent
      const teamB = m.opponents[1]?.opponent
      const time = m.scheduled_at
        ? new Date(m.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })
        : '–'
      const scoreA = m.results.find(r => r.team_id === teamA?.id)?.score
      const scoreB = m.results.find(r => r.team_id === teamB?.id)?.score
      const isLiveMatch = m.status === 'running'
      const hasScore = (m.status === 'finished' || isLiveMatch) && scoreA !== undefined && scoreB !== undefined
      const aWon = hasScore && !isLiveMatch && scoreA! > scoreB!
      const bWon = hasScore && !isLiveMatch && scoreB! > scoreA!
      const drew = hasScore && !isLiveMatch && scoreA === scoreB
      return (
        <div key={`${m.id}-${i}`} className="px-5 py-2.5 flex items-center gap-3 text-sm" style={{ borderBottom: i < dayMatches.length - 1 ? '1px solid hsl(var(--border) / 0.4)' : 'none', background: i % 2 !== 0 ? 'hsl(var(--secondary) / 0.2)' : 'transparent' }}>
          <span className="w-12 text-xs shrink-0 tabular-nums text-muted-foreground">{time}</span>
          <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {teamA?.image_url && <img loading="lazy" src={teamA.image_url} alt={teamA.name} className="w-4 h-4 object-contain shrink-0 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />}
            {teamA ? (
              <Link href={`/teams/${psTeamSlug(teamA.name)}`} className="font-semibold truncate hover:text-primary transition-colors text-foreground">{teamA.name}</Link>
            ) : <span className="font-semibold truncate text-foreground">TBD</span>}
          </div>
          {hasScore ? (
            <div className="flex flex-col items-center shrink-0 px-2">
              <span className="text-sm font-black tabular-nums">
                <span style={{ color: isLiveMatch ? 'hsl(var(--destructive))' : drew ? '#f59e0b' : aWon ? 'var(--correct)' : 'var(--wrong)' }}>{scoreA}</span>
                <span className="text-muted-foreground/40">:</span>
                <span style={{ color: isLiveMatch ? 'hsl(var(--destructive))' : drew ? '#f59e0b' : bWon ? 'var(--correct)' : 'var(--wrong)' }}>{scoreB}</span>
              </span>
              {isLiveMatch && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded leading-none" style={{ background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' }}>LIVE</span>
              )}
            </div>
          ) : (
            <span className="text-xs font-black px-2 shrink-0 text-muted-foreground/40">VS</span>
          )}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {teamB?.image_url && <img loading="lazy" src={teamB.image_url} alt={teamB.name} className="w-4 h-4 object-contain shrink-0 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />}
            {teamB ? (
              <Link href={`/teams/${psTeamSlug(teamB.name)}`} className="font-semibold truncate hover:text-primary transition-colors text-foreground">{teamB.name}</Link>
            ) : <span className="font-semibold truncate text-foreground">TBD</span>}
          </div>
          <span className="text-[10px] shrink-0 tabular-nums text-muted-foreground/50">{m._groupName}</span>
          <span className="text-xs shrink-0 px-2 py-0.5 rounded" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))' }}>BO{m.number_of_games}</span>
        </div>
      )
    })

  const totalMatches = allMatches.length
  return (
    <div className="mb-6">
      <details className="group/schedule">
        <summary className="flex items-center justify-between gap-3 mb-4 cursor-pointer select-none list-none">
          <h2 className="section-label">Schedule & Results</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full transition-colors"
            style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
            <span className="group-open/schedule:hidden">{totalMatches} matches · Show ▾</span>
            <span className="hidden group-open/schedule:inline">Hide ▴</span>
          </span>
        </summary>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card) / 0.6)', border: '1px solid hsl(var(--border) / 0.6)' }}>
          {league && (
            <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
              {league.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" src={league.image_url} alt={league.name} className="w-5 h-5 object-contain shrink-0" />
              )}
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'hsl(var(--primary))' }}>{league.name}</p>
            </div>
          )}

          {activeDays.map(([day, dayMatches]) => (
            <div key={day}>
              <div className="px-5 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: 'hsl(var(--secondary) / 0.35)', borderBottom: '1px solid hsl(var(--border) / 0.4)', color: 'hsl(var(--primary))' }}>
                {day}
              </div>
              {renderDayRows(dayMatches)}
            </div>
          ))}

          {finishedDays.length > 0 && (
            <details className="group">
              <summary
                className="flex items-center justify-between gap-3 px-5 py-3 cursor-pointer select-none"
                style={{ background: 'hsl(var(--secondary) / 0.2)', borderTop: activeDays.length > 0 ? '1px solid hsl(var(--border) / 0.5)' : 'none' }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black tabular-nums shrink-0"
                    style={{ background: 'hsl(var(--muted))', color: 'var(--text-muted)' }}
                  >
                    {totalFinished}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Completed matches ({finishedDays.map(([d]) => d).join(', ')})
                  </span>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full group-open:opacity-0 transition-opacity" style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
                  Show ▾
                </span>
              </summary>
              {finishedDays.map(([day, dayMatches]) => (
                <div key={day}>
                  <div className="px-5 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: 'hsl(var(--secondary) / 0.35)', borderTop: '1px solid hsl(var(--border) / 0.4)', borderBottom: '1px solid hsl(var(--border) / 0.4)', color: 'hsl(var(--muted-foreground))' }}>
                    {day}
                  </div>
                  {renderDayRows(dayMatches)}
                </div>
              ))}
            </details>
          )}
        </div>
      </details>
    </div>
  )
}
