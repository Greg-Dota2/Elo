import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateElo, BASE_ELO } from '@/lib/elo'

export async function POST() {
  const supabase = createAdminClient()

  // 1. Reset all team ELOs to base
  const { error: resetErr } = await supabase
    .from('teams')
    .update({ current_elo: BASE_ELO })
    .neq('id', '00000000-0000-0000-0000-000000000000') // update all

  if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 500 })

  // 2. Delete existing ELO history
  await supabase.from('team_elo_history').delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  // 3. Fetch all matches with a score result (includes draws), in chronological order
  const { data: matches, error: matchErr } = await supabase
    .from('match_predictions')
    .select(`
      id, team_1_id, team_2_id, actual_winner_id,
      score_team_1, score_team_2, best_of, match_date,
      stage:stages(name)
    `)
    .not('score_team_1', 'is', null)
    .not('score_team_2', 'is', null)
    .order('match_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 })
  if (!matches?.length) return NextResponse.json({ ok: true, processed: 0 })

  // 4. Load current ELOs into a live map
  const { data: teams } = await supabase.from('teams').select('id, current_elo')
  const eloMap = new Map<string, number>()
  for (const t of teams ?? []) eloMap.set(t.id, t.current_elo ?? BASE_ELO)

  // 5. Process each match in order
  const historyRows: object[] = []
  let processed = 0

  for (const match of matches) {
    const { team_1_id, team_2_id, actual_winner_id, score_team_1, score_team_2 } = match

    if (!team_1_id || !team_2_id) continue

    const s1 = score_team_1 ?? 0
    const s2 = score_team_2 ?? 0
    const isDraw = s1 === s2

    // Infer winner from scores if actual_winner_id wasn't set
    const winnerId = actual_winner_id ?? (!isDraw ? (s1 > s2 ? team_1_id : team_2_id) : null)

    // Skip if still no winner and not a draw (truly incomplete data)
    if (!isDraw && !winnerId) continue

    const eloA = eloMap.get(team_1_id) ?? BASE_ELO
    const eloB = eloMap.get(team_2_id) ?? BASE_ELO
    const teamAWon = winnerId === team_1_id

    const winnerScore = isDraw ? s1 : Math.max(s1, s2)
    const loserScore = isDraw ? s2 : Math.min(s1, s2)

    // Determine stage name for K multiplier
    const stageName = (match.stage as { name?: string } | null)?.name ?? 'group'

    const result = calculateElo(eloA, eloB, teamAWon, winnerScore, loserScore, stageName, undefined, isDraw)

    // Update live map
    eloMap.set(team_1_id, result.newEloA)
    eloMap.set(team_2_id, result.newEloB)

    // Queue history records
    historyRows.push({
      team_id: team_1_id,
      match_id: match.id,
      elo_before: eloA,
      elo_after: result.newEloA,
      opponent_id: team_2_id,
      opponent_elo: eloB,
      won: isDraw ? null : teamAWon,
    })
    historyRows.push({
      team_id: team_2_id,
      match_id: match.id,
      elo_before: eloB,
      elo_after: result.newEloB,
      opponent_id: team_1_id,
      opponent_elo: eloA,
      won: isDraw ? null : !teamAWon,
    })

    processed++
  }

  // 6. Bulk insert history
  if (historyRows.length) {
    await supabase.from('team_elo_history').insert(historyRows)
  }

  // 7. Update current_elo on all teams
  for (const [teamId, elo] of eloMap) {
    await supabase.from('teams').update({ current_elo: elo }).eq('id', teamId)
  }

  return NextResponse.json({ ok: true, processed, teams: eloMap.size })
}
