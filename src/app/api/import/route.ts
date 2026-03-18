import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const res = await fetch(`${OPENDOTA}/teams/${teamId}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { tournament_id, league_id } = await req.json()

  if (!tournament_id || !league_id) {
    return NextResponse.json(
      { error: 'tournament_id and league_id are required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // 1. Fetch all matches for the league from OpenDota
  const matchRes = await fetch(`${OPENDOTA}/leagues/${league_id}/matches`, {
    next: { revalidate: 300 },
  })
  if (!matchRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch league matches from OpenDota' }, { status: 502 })
  }
  const allMatches: OpenDotaMatch[] = await matchRes.json()

  if (!allMatches.length) {
    return NextResponse.json({ error: 'No matches found for this league ID' }, { status: 404 })
  }

  // 2. Group individual game records into series
  const seriesMap = new Map<number, OpenDotaMatch[]>()
  for (const m of allMatches) {
    if (!seriesMap.has(m.series_id)) seriesMap.set(m.series_id, [])
    seriesMap.get(m.series_id)!.push(m)
  }

  // 3. Collect all unique team IDs
  const teamIds = new Set<number>()
  for (const m of allMatches) {
    teamIds.add(m.radiant_team_id)
    teamIds.add(m.dire_team_id)
  }

  // 4. Fetch team info from OpenDota (sequential to avoid rate limits)
  const teamInfoMap = new Map<number, OpenDotaTeam>()
  for (const teamId of teamIds) {
    const info = await fetchTeam(teamId)
    if (info) teamInfoMap.set(teamId, info)
    // Small delay to be polite to the free API
    await new Promise((r) => setTimeout(r, 100))
  }

  // 5. Upsert teams into DB
  const dbTeamIdMap = new Map<number, string>() // opendota_team_id → our UUID

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

    // Check by name (in case team was added manually)
    const { data: byName } = await supabase
      .from('teams')
      .select('id')
      .eq('name', info.name)
      .maybeSingle()

    if (byName) {
      // Link opendota ID to existing team
      await supabase
        .from('teams')
        .update({ opendota_team_id: odId })
        .eq('id', byName.id)
      dbTeamIdMap.set(odId, byName.id)
      continue
    }

    // Create new team
    const { data: newTeam, error: teamErr } = await supabase
      .from('teams')
      .insert({
        name: info.name,
        short_name: info.tag || null,
        logo_url: info.logo_url || null,
        opendota_team_id: odId,
      })
      .select('id')
      .single()

    if (teamErr) {
      console.error('Failed to insert team', info.name, teamErr.message)
      continue
    }
    dbTeamIdMap.set(odId, newTeam.id)
  }

  // 6. Create match_prediction records for each series
  let created = 0
  let skipped = 0

  for (const [seriesId, games] of seriesMap) {
    // Check if already imported
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

    // Determine the two consistent team IDs for this series
    const team1OdId = firstGame.radiant_team_id
    const team2OdId = firstGame.dire_team_id

    const team1DbId = dbTeamIdMap.get(team1OdId)
    const team2DbId = dbTeamIdMap.get(team2OdId)

    if (!team1DbId || !team2DbId) {
      console.warn(`Skipping series ${seriesId}: missing team mapping`)
      skipped++
      continue
    }

    // Calculate series score: for each game, find the winning team
    const wins: Record<string, number> = { [team1DbId]: 0, [team2DbId]: 0 }
    for (const game of games) {
      const winnerOdId = game.radiant_win ? game.radiant_team_id : game.dire_team_id
      const winnerDbId = dbTeamIdMap.get(winnerOdId)
      if (winnerDbId && wins[winnerDbId] !== undefined) {
        wins[winnerDbId]++
      }
    }

    const score1 = wins[team1DbId] ?? 0
    const score2 = wins[team2DbId] ?? 0
    const actualWinnerId = score1 > score2 ? team1DbId : score2 > score1 ? team2DbId : null

    const matchDate = new Date(firstGame.start_time * 1000)
      .toISOString()
      .split('T')[0]

    const { error: insertErr } = await supabase.from('match_predictions').insert({
      tournament_id,
      team_1_id: team1DbId,
      team_2_id: team2DbId,
      best_of,
      score_team_1: score1,
      score_team_2: score2,
      actual_winner_id: actualWinnerId,
      match_date: matchDate,
      opendota_series_id: seriesId,
      is_published: false,   // Greg reviews before publishing
    })

    if (insertErr) {
      console.error('Failed to insert series', seriesId, insertErr.message)
      skipped++
    } else {
      created++
    }
  }

  // 7. Store league ID on tournament
  await supabase
    .from('tournaments')
    .update({ opendota_league_id: league_id })
    .eq('id', tournament_id)

  return NextResponse.json({
    ok: true,
    series_total: seriesMap.size,
    created,
    skipped,
    teams_found: teamInfoMap.size,
  })
}
