import { createAdminClient } from '@/lib/supabase/admin'
import type { GroupData } from '@/components/GroupStageView'
import type { PSTeam, PSMatch, PSStanding } from '@/lib/pandascore'

/**
 * Builds GroupData from match_predictions + stages in the DB.
 * Used as a fallback when PandaScore has no data for a tournament.
 * Only stages whose name starts with "Group" are included.
 */
export async function fetchGroupsFromDB(tournamentSlug: string): Promise<GroupData[]> {
  const admin = createAdminClient()

  const { data: tournament } = await admin
    .from('tournaments')
    .select('id')
    .eq('slug', tournamentSlug)
    .single()
  if (!tournament) return []

  const { data: stages } = await admin
    .from('stages')
    .select('id, name, stage_order')
    .eq('tournament_id', tournament.id)
    .ilike('name', 'Group%')
    .order('stage_order')
  if (!stages?.length) return []

  // UUID → stable small integer (GroupStageView uses numeric IDs)
  const teamIdMap = new Map<string, number>()
  let nextNumId = 1
  const numId = (uuid: string) => {
    if (!teamIdMap.has(uuid)) teamIdMap.set(uuid, nextNumId++)
    return teamIdMap.get(uuid)!
  }

  const groups: GroupData[] = []

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]

    const { data: rows } = await admin
      .from('match_predictions')
      .select(`
        id, score_team_1, score_team_2, actual_winner_id, match_date, best_of,
        team_1:teams!team_1_id(id, name, logo_url),
        team_2:teams!team_2_id(id, name, logo_url)
      `)
      .eq('stage_id', stage.id)
      .order('match_order', { nullsFirst: false })
    if (!rows?.length) continue

    // Build PSTeam lookup
    const teamMap = new Map<string, PSTeam>()
    for (const r of rows) {
      const t1 = r.team_1 as any, t2 = r.team_2 as any
      if (t1 && !teamMap.has(t1.id))
        teamMap.set(t1.id, { id: numId(t1.id), name: t1.name, acronym: null, image_url: t1.logo_url ?? null })
      if (t2 && !teamMap.has(t2.id))
        teamMap.set(t2.id, { id: numId(t2.id), name: t2.name, acronym: null, image_url: t2.logo_url ?? null })
    }

    // Shape each DB row as a PSMatch-compatible object
    const psMatches: PSMatch[] = rows.map((r, mi) => {
      const t1 = r.team_1 as any, t2 = r.team_2 as any
      const id1 = t1 ? numId(t1.id) : 0
      const id2 = t2 ? numId(t2.id) : 0
      const done = r.actual_winner_id != null
      return {
        id: mi,
        name: '',
        status: done ? 'finished' : 'not_started',
        number_of_games: r.best_of,
        scheduled_at: r.match_date ? `${r.match_date}T12:00:00Z` : null,
        begin_at: null,
        opponents: [
          { opponent: teamMap.get(t1?.id) ?? { id: id1, name: t1?.name ?? '', acronym: null, image_url: null } },
          { opponent: teamMap.get(t2?.id) ?? { id: id2, name: t2?.name ?? '', acronym: null, image_url: null } },
        ],
        results: done
          ? [{ team_id: id1, score: r.score_team_1 ?? 0 }, { team_id: id2, score: r.score_team_2 ?? 0 }]
          : [],
        tournament: { id: i, name: stage.name, tier: '', region: null, image_url: null },
        league: { id: 0, name: '', image_url: null },
        serie: { id: 0, full_name: '', image_url: null },
        streams_list: [],
      } as PSMatch
    })

    // Compute standings from finished matches
    const record = new Map<number, { team: PSTeam; wins: number; draws: number; losses: number }>()
    for (const t of teamMap.values()) record.set(t.id, { team: t, wins: 0, draws: 0, losses: 0 })
    for (const m of psMatches) {
      if (m.status !== 'finished' || m.results.length < 2) continue
      const [r1, r2] = m.results
      const t1 = m.opponents.find(o => o.opponent.id === r1.team_id)?.opponent
      const t2 = m.opponents.find(o => o.opponent.id === r2.team_id)?.opponent
      if (!t1 || !t2) continue
      if (r1.score > r2.score) { record.get(t1.id)!.wins++; record.get(t2.id)!.losses++ }
      else if (r2.score > r1.score) { record.get(t2.id)!.wins++; record.get(t1.id)!.losses++ }
      else { record.get(t1.id)!.draws++; record.get(t2.id)!.draws++ }
    }

    const standings: PSStanding[] = Array.from(record.values())
      .sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws))
      .map((r, idx) => ({ rank: idx + 1, team: r.team, wins: r.wins, draws: r.draws, losses: r.losses, total: r.wins + r.draws + r.losses }))

    if (standings.length > 1) {
      groups.push({ id: i + 1, name: stage.name, standings, matches: psMatches })
    }
  }

  return groups
}
