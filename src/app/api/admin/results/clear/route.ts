import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Clears result data for a specific tournament.
// The cron job will re-populate results from PandaScore after matches are played.
export async function POST(req: NextRequest) {
  const { tournament_id } = await req.json()
  if (!tournament_id) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })

  const supabase = createAdminClient()

  const { error, count } = await supabase
    .from('match_predictions')
    .update({ score_team_1: null, score_team_2: null, actual_winner_id: null, is_correct: null })
    .eq('tournament_id', tournament_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, cleared: count })
}
