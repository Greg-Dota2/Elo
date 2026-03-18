import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'

const OPENDOTA = 'https://api.opendota.com/api'

const SERIES_TYPE_TO_BEST_OF: Record<number, number> = {
  0: 1,
  1: 3,
  2: 5,
}

interface OpenDotaMatch {
  match_id: number
  radiant_win: boolean
  start_time: number
  leagueid: number
  radiant_team_id: number
  dire_team_id: number
  series_id: number
  series_type: number
}

interface OpenDotaTeam {
  team_id: number
  name: string
  tag: string
  logo_url: string | null
}

async function fetchTeam(teamId: number): Promise<OpenDotaTeam | null> {
  try {
    const res = await fetch(`${OPENDOTA}/teams/${teamId}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function importLeague(
  supabase: ReturnType<typeof createAdminClient>,
  tournamentDbId: string,
  leagueId: number
): Promise<{ created: number; skipped: number; teams: number }> {
  // Fetch all matches from OpenDota
  const matchRes = await fetch(`${OPENDOTA}/leagues/${leagueId}/matches`)
  if (!matchRes.ok) return { created: 0, skipped: 0, teams: 0 }

  const allMatches: OpenDotaMatch[] = await matchRes.json()
  if (!allMatches.length) return { created: 0, skipped: 0, teams: 0 }

  // Group games into series
  const seriesMap = new Map<number, OpenDotaMatch[]>()
  for (const m of allMatches) {
    if (!seriesMap.has(m.series_id)) seriesMap.set(m.series_id, [])
    seriesMap.get(m.series_id)!.push(m)
  }

  // Collect unique team IDs
  const teamIds = new Set<number>()
  for (const m of allMatches) {
    if (m.radiant_team_id) teamIds.add(m.radiant_team_id)
    if (m.dire_team_id) teamIds.add(m.dire_team_id)
  }

  // Fetch team info sequentially (polite to free API)
  const teamInfoMap = new Map<number, OpenDotaTeam>()
  for (const teamId of teamIds) {
    if (!teamId) continue
    const info = await fetchTeam(teamId)
    if (info) teamInfoMap.set(teamId, info)
    await new Promise((r) => setTimeout(r, 80))
  }

  // Upsert teams
  const dbTeamIdMap = new Map<number, string>()
  for (const [odId, info] of teamInfoMap) {
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('opendota_team_id', odId)
      .maybeSingle()

    if (existing) {
      dbTeamIdMap.set(odId, existing.id)
      continue
    }

    const { data: byName } = await supabase
      .from('teams')
      .select('id')
      .eq('name', info.name)
      .maybeSingle()

    if (byName) {
      await supabase
        .from('teams')
        .update({ opendota_team_id: odId })
        .eq('id', byName.id)
      dbTeamIdMap.set(odId, byName.id)
      continue
    }

    const { data: newTeam } = await supabase
      .from('teams')
      .insert({
        name: info.name,
        short_name: info.tag || null,
        logo_url: info.logo_url || null,
        opendota_team_id: odId,
        is_active: true,
      })
      .select('id')
      .single()

    if (newTeam) dbTeamIdMap.set(odId, newTeam.id)
  }

  // Insert series as match_predictions
  let created = 0
  let skipped = 0

  for (const [seriesId, games] of seriesMap) {
    const { data: existing } = await supabase
      .from('match_predictions')
      .select('id')
      .eq('opendota_series_id', seriesId)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    const firstGame = games[0]
    const best_of = SERIES_TYPE_TO_BEST_OF[firstGame.series_type] ?? 3

    const team1OdId = firstGame.radiant_team_id
    const team2OdId = firstGame.dire_team_id
    const team1DbId = dbTeamIdMap.get(team1OdId)
    const team2DbId = dbTeamIdMap.get(team2OdId)

    if (!team1DbId || !team2DbId) {
      skipped++
      continue
    }

    const wins: Record<string, number> = { [team1DbId]: 0, [team2DbId]: 0 }
    for (const game of games) {
      const winnerOdId = game.radiant_win ? game.radiant_team_id : game.dire_team_id
      const winnerDbId = dbTeamIdMap.get(winnerOdId)
      if (winnerDbId && wins[winnerDbId] !== undefined) wins[winnerDbId]++
    }

    const score1 = wins[team1DbId] ?? 0
    const score2 = wins[team2DbId] ?? 0
    const actualWinnerId = score1 > score2 ? team1DbId : score2 > score1 ? team2DbId : null

    const matchDate = new Date(firstGame.start_time * 1000).toISOString().split('T')[0]

    const { error } = await supabase.from('match_predictions').insert({
      tournament_id: tournamentDbId,
      team_1_id: team1DbId,
      team_2_id: team2DbId,
      best_of,
      score_team_1: score1,
      score_team_2: score2,
      actual_winner_id: actualWinnerId,
      match_date: matchDate,
      opendota_series_id: seriesId,
      is_published: false,
    })

    if (error) {
      skipped++
    } else {
      created++
    }
  }

  return { created, skipped, teams: teamInfoMap.size }
}

export async function POST() {
  const supabase = createAdminClient()

  const log: string[] = []
  let totalCreated = 0
  let totalSkipped = 0

  for (const t of TIER1_TOURNAMENTS) {
    // Find or create the tournament record
    let tournamentDbId: string

    const { data: existing } = await supabase
      .from('tournaments')
      .select('id')
      .eq('opendota_league_id', t.league_id)
      .maybeSingle()

    if (existing) {
      tournamentDbId = existing.id
    } else {
      const { data: created, error } = await supabase
        .from('tournaments')
        .insert({
          name: t.name,
          slug: t.slug,
          tier: 1,
          start_date: t.start_date,
          end_date: t.end_date,
          opendota_league_id: t.league_id,
          is_published: false,
        })
        .select('id')
        .single()

      if (error || !created) {
        log.push(`❌ ${t.name}: failed to create tournament — ${error?.message}`)
        continue
      }
      tournamentDbId = created.id
    }

    const result = await importLeague(supabase, tournamentDbId, t.league_id)
    totalCreated += result.created
    totalSkipped += result.skipped
    log.push(`✅ ${t.name}: +${result.created} series (${result.skipped} skipped, ${result.teams} teams)`)
  }

  // Trigger ELO recalculation inline
  const { calculateElo, BASE_ELO } = await import('@/lib/elo')

  await supabase
    .from('teams')
    .update({ current_elo: BASE_ELO })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  await supabase
    .from('team_elo_history')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  const { data: matches } = await supabase
    .from('match_predictions')
    .select('id, team_1_id, team_2_id, actual_winner_id, score_team_1, score_team_2, best_of, match_date, stage:stages(name)')
    .not('actual_winner_id', 'is', null)
    .not('score_team_1', 'is', null)
    .order('match_date', { ascending: true })
    .order('created_at', { ascending: true })

  const { data: teams } = await supabase.from('teams').select('id, current_elo')
  const eloMap = new Map<string, number>()
  for (const t of teams ?? []) eloMap.set(t.id, t.current_elo ?? BASE_ELO)

  const historyRows: object[] = []
  let eloProcessed = 0

  for (const match of matches ?? []) {
    const { team_1_id, team_2_id, actual_winner_id, score_team_1, score_team_2 } = match
    if (!team_1_id || !team_2_id || !actual_winner_id) continue

    const eloA = eloMap.get(team_1_id) ?? BASE_ELO
    const eloB = eloMap.get(team_2_id) ?? BASE_ELO
    const teamAWon = actual_winner_id === team_1_id
    const s1 = score_team_1 ?? 1
    const s2 = score_team_2 ?? 0
    const stageName = (match.stage as { name?: string } | null)?.name ?? 'group'

    const result = calculateElo(eloA, eloB, teamAWon, Math.max(s1, s2), Math.min(s1, s2), stageName)
    eloMap.set(team_1_id, result.newEloA)
    eloMap.set(team_2_id, result.newEloB)

    historyRows.push(
      { team_id: team_1_id, match_id: match.id, elo_before: eloA, elo_after: result.newEloA, opponent_id: team_2_id, opponent_elo: eloB, won: teamAWon },
      { team_id: team_2_id, match_id: match.id, elo_before: eloB, elo_after: result.newEloB, opponent_id: team_1_id, opponent_elo: eloA, won: !teamAWon }
    )
    eloProcessed++
  }

  if (historyRows.length) {
    // Insert in chunks to avoid request size limits
    for (let i = 0; i < historyRows.length; i += 500) {
      await supabase.from('team_elo_history').insert(historyRows.slice(i, i + 500))
    }
  }

  for (const [teamId, elo] of eloMap) {
    await supabase.from('teams').update({ current_elo: elo }).eq('id', teamId)
  }

  return NextResponse.json({
    ok: true,
    tournaments: TIER1_TOURNAMENTS.length,
    series_created: totalCreated,
    series_skipped: totalSkipped,
    elo_matches_processed: eloProcessed,
    log,
  })
}
