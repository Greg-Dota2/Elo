import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateElo, BASE_ELO } from '@/lib/elo'

// Called by cron once daily (e.g. 03:00 UTC).
// Recalculates ELO ratings from scratch based on all recorded results.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { error: resetErr } = await supabase
    .from('teams')
    .update({ current_elo: BASE_ELO })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 500 })

  await supabase.from('team_elo_history').delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  const { data: matches, error: matchErr } = await supabase
    .from('match_predictions')
    .select(`id, team_1_id, team_2_id, actual_winner_id, score_team_1, score_team_2, best_of, match_date, stage:stages(name)`)
    .not('actual_winner_id', 'is', null)
    .not('score_team_1', 'is', null)
    .order('match_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 })
  if (!matches?.length) return NextResponse.json({ ok: true, processed: 0 })

  const { data: teams } = await supabase.from('teams').select('id, current_elo')
  const eloMap = new Map<string, number>()
  for (const t of teams ?? []) eloMap.set(t.id, t.current_elo ?? BASE_ELO)

  const historyRows: object[] = []
  let processed = 0

  for (const match of matches) {
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
    processed++
  }

  if (historyRows.length) await supabase.from('team_elo_history').insert(historyRows)

  for (const [teamId, elo] of eloMap) {
    await supabase.from('teams').update({ current_elo: elo }).eq('id', teamId)
  }

  return NextResponse.json({ ok: true, processed, teams: eloMap.size })
}
