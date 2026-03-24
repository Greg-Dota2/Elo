import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = createAdminClient()

  // Fetch all matches that have a score result
  const { data: matches, error } = await supabase
    .from('match_predictions')
    .select('id, score_team_1, score_team_2, team_1_id, team_2_id, actual_winner_id, predicted_winner_id, predicted_draw')
    .not('score_team_1', 'is', null)
    .not('score_team_2', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!matches?.length) return NextResponse.json({ ok: true, fixed: 0 })

  let fixed = 0

  for (const m of matches) {
    const s1 = m.score_team_1 ?? 0
    const s2 = m.score_team_2 ?? 0
    const isDraw = s1 === s2

    // Always infer winner from scores using team_1_id/team_2_id — these IDs
    // always match the prediction, unlike actual_winner_id which may point to
    // a different team record (e.g. after a team rename/merge).
    const scoreWinnerId = !isDraw ? (s1 > s2 ? m.team_1_id : m.team_2_id) : null

    let is_correct: boolean | null = null
    if (isDraw) {
      is_correct = m.predicted_draw ? true : (m.predicted_winner_id ? false : null)
    } else if (m.predicted_draw) {
      is_correct = false
    } else {
      is_correct = m.predicted_winner_id ? scoreWinnerId === m.predicted_winner_id : null
    }

    const updates: Record<string, unknown> = { is_correct }
    // Backfill actual_winner_id if missing
    if (!m.actual_winner_id && scoreWinnerId) updates.actual_winner_id = scoreWinnerId

    await supabase.from('match_predictions').update(updates).eq('id', m.id)
    fixed++
  }

  return NextResponse.json({ ok: true, fixed })
}
