import {
  fetchUpcomingTier1Matches,
  fetchRunningTier1Matches,
  fetchMatchesForSubTournament,
  fetchTournamentStandings,
  fetchRecentTier1Matches,
  type PSTeam,
  type PSMatch,
} from './pandascore'
import { TIER1_TOURNAMENTS } from './tier1tournaments'
import type { GroupData } from '@/components/GroupStageView'
import { fetchGroupsFromDB } from './groupStageDB'

export type Tier1Entry = (typeof TIER1_TOURNAMENTS[0]) & { ps_group_stage_id?: number; ps_playoff_id?: number }

async function buildGroupData(subId: number, subName: string, seedMatches: PSMatch[]): Promise<GroupData> {
  const [standings, allMatches] = await Promise.all([
    fetchTournamentStandings(subId).catch(() => []),
    fetchMatchesForSubTournament(subId).catch(() => seedMatches),
  ])

  const record = new Map<number, { team: PSTeam; wins: number; draws: number; losses: number }>()
  const ensure = (team: PSTeam) => {
    if (!record.has(team.id)) record.set(team.id, { team, wins: 0, draws: 0, losses: 0 })
  }
  for (const m of allMatches) {
    if (m.status !== 'finished' || m.results.length < 2) continue
    const [r1, r2] = m.results
    const t1 = m.opponents.find(o => o.opponent.id === r1.team_id)?.opponent
    const t2 = m.opponents.find(o => o.opponent.id === r2.team_id)?.opponent
    if (!t1 || !t2) continue
    ensure(t1); ensure(t2)
    if (r1.score > r2.score) { record.get(t1.id)!.wins++; record.get(t2.id)!.losses++ }
    else if (r2.score > r1.score) { record.get(t2.id)!.wins++; record.get(t1.id)!.losses++ }
    else { record.get(t1.id)!.draws++; record.get(t2.id)!.draws++ }
  }
  const computedStandings = Array.from(record.values())
    .sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws))
    .map((r, i) => ({ rank: i + 1, team: r.team, wins: r.wins, draws: r.draws, losses: r.losses, total: r.wins + r.draws + r.losses }))

  const apiHasData = standings.length > 1 && standings.some(s => s.wins > 0 || s.losses > 0)
  const derivedStandings = apiHasData ? standings
    : computedStandings.length > 1 ? computedStandings
    : (() => {
        const seen = new Map<number, PSTeam>()
        for (const m of allMatches) for (const opp of m.opponents) if (!seen.has(opp.opponent.id)) seen.set(opp.opponent.id, opp.opponent)
        return Array.from(seen.values()).map((team, i) => ({ rank: i + 1, team, wins: 0, draws: 0, losses: 0, total: 0 }))
      })()

  return { id: subId, name: subName, standings: derivedStandings, matches: allMatches }
}

export async function fetchLiveGroupsData(
  slug: string,
  tier1Entry: Tier1Entry | undefined,
  isOver: boolean,
  archivedGroups: GroupData[] | null,
): Promise<GroupData[]> {
  if (archivedGroups && archivedGroups.length > 0) return archivedGroups

  const dbGroups = await fetchGroupsFromDB(slug)
  if (dbGroups.length > 0) return dbGroups

  if (isOver) return []

  const [upcomingPS, runningPS, swissMatches, playoffMatches] = await Promise.all([
    fetchUpcomingTier1Matches(50).catch(() => []),
    fetchRunningTier1Matches(20).catch(() => []),
    tier1Entry?.ps_group_stage_id
      ? fetchMatchesForSubTournament(tier1Entry.ps_group_stage_id).catch(() => [])
      : Promise.resolve([]),
    tier1Entry?.ps_playoff_id
      ? fetchMatchesForSubTournament(tier1Entry.ps_playoff_id).catch(() => [])
      : Promise.resolve([]),
  ])

  const psMatches = [...runningPS, ...upcomingPS].filter(m => {
    if (tier1Entry && 'ps_serie_id' in tier1Entry && tier1Entry.ps_serie_id) {
      return m.serie.id === tier1Entry.ps_serie_id
    }
    const psSlug = `${m.league.name}-${m.serie.full_name}`
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return psSlug === slug
  })

  const scheduleByGroup = [...psMatches, ...playoffMatches, ...swissMatches].reduce<Record<string, typeof psMatches>>((acc, m) => {
    const key = String(m.tournament.id)
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  if (Object.keys(scheduleByGroup).length > 0) {
    return await Promise.all(
      Object.entries(scheduleByGroup).map(([subId, matches]) =>
        buildGroupData(Number(subId), matches[0].tournament.name, matches)
      )
    ).then(groups => groups.filter(g => g.standings.length > 1))
  }

  const recentFinished = await fetchRecentTier1Matches(100).catch(() => [])
  const finishedPsMatches = recentFinished.filter(m => {
    const psSlug = `${m.league.name}-${m.serie.full_name}`
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return psSlug === slug
  })
  const finishedByGroup = finishedPsMatches.reduce<Record<string, typeof finishedPsMatches>>((acc, m) => {
    const key = String(m.tournament.id)
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return await Promise.all(
    Object.entries(finishedByGroup).map(([subId, matches]) =>
      buildGroupData(Number(subId), matches[0].tournament.name, matches)
    )
  ).then(groups => groups.filter(g => g.standings.length > 1))
}
