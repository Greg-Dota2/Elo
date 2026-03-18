import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Admin data fetching — bypasses RLS, sees all records including unpublished
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const resource = searchParams.get('resource')
  const tournamentId = searchParams.get('tournament_id')
  const id = searchParams.get('id')

  const supabase = createAdminClient()

  if (resource === 'tournaments') {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  if (resource === 'tournament' && id) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  if (resource === 'matches' && tournamentId) {
    const { data, error } = await supabase
      .from('match_predictions')
      .select(`
        *,
        team_1:teams!match_predictions_team_1_id_fkey(*),
        team_2:teams!match_predictions_team_2_id_fkey(*)
      `)
      .eq('tournament_id', tournamentId)
      .order('match_date', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  if (resource === 'match' && id) {
    const { data, error } = await supabase
      .from('match_predictions')
      .select(`
        *,
        team_1:teams!match_predictions_team_1_id_fkey(*),
        team_2:teams!match_predictions_team_2_id_fkey(*)
      `)
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  if (resource === 'teams') {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  if (resource === 'stages' && tournamentId) {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('stage_order')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown resource' }, { status: 400 })
}
