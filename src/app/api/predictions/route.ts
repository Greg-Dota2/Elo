import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tournamentId = searchParams.get('tournament_id')
  if (!tournamentId) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('match_predictions')
    .select(`
      *,
      team_1:teams!match_predictions_team_1_id_fkey(*),
      team_2:teams!match_predictions_team_2_id_fkey(*),
      predicted_winner:teams!match_predictions_predicted_winner_id_fkey(*),
      stage:stages(*)
    `)
    .eq('tournament_id', tournamentId)
    .eq('is_published', true)
    .order('match_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
