import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchRecentTier1Matches } from '@/lib/pandascore'

// Called by Vercel Cron every 15 minutes.
// Vercel automatically sends the CRON_SECRET header — reject anything else.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const log: string[] = []
  let updated = 0

  const psMatches = await fetchRecentTier1Matches(50)
  const finished = psMatches.filter(m => m.status === 'finished' && m.results.length > 0)

  const { data: predictions } = await supabase
    .from('match_predictions')
    .select('id, pandascore_match_id, predicted_winner_id, predicted_draw, team_1_id, team_2_id')
    .not('pandascore_match_id', 'is', null)
    .or('score_team_1.is.null,is_correct.is.null')

  if (!predictions?.length) {
    return NextResponse.json({ ok: true, updated: 0, log: ['Nothing to update'] })
  }

  for (const pred of predictions) {
    const psMatch = finished.find(m => String(m.id) === String(pred.pandascore_match_id))
    if (!psMatch) continue

    const r0 = psMatch.results[0]
    const r1 = psMatch.results[1]
    if (!r0 || !r1) continue

    const team0 = psMatch.opponents[0]?.opponent
    const team1 = psMatch.opponents[1]?.opponent

    const score_team_1 = r0.team_id === team0?.id ? r0.score : r1.score
    const score_team_2 = r1.team_id === team1?.id ? r1.score : r0.score
    const isDraw = score_team_1 === score_team_2

    let actual_winner_id: string | null = null
    if (!isDraw) {
      const winningPsTeam = score_team_1 > score_team_2 ? team0 : team1
      if (winningPsTeam) {
        const { data: winnerRow } = await supabase
          .from('teams')
          .select('id')
          .ilike('name', winningPsTeam.name)
          .single()
        actual_winner_id = winnerRow?.id ?? null
      }
    }

    let is_correct: boolean | null = null
    if (isDraw) {
      is_correct = pred.predicted_draw ? true : false
    } else if (actual_winner_id) {
      is_correct = actual_winner_id === pred.predicted_winner_id
    }

    const { error } = await supabase
      .from('match_predictions')
      .update({ score_team_1, score_team_2, actual_winner_id, is_correct })
      .eq('id', pred.id)

    if (error) {
      log.push(`❌ match ${pred.pandascore_match_id}: ${error.message}`)
    } else {
      log.push(`✅ match ${pred.pandascore_match_id}: ${score_team_1}–${score_team_2}, correct=${is_correct}`)
      updated++
    }
  }

  return NextResponse.json({ ok: true, updated, log })
}
