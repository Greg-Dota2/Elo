import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { from_id, to_id } = await req.json().catch(() => ({}))
  if (!from_id || !to_id) {
    return NextResponse.json({ error: 'from_id and to_id are required' }, { status: 400 })
  }
  if (from_id === to_id) {
    return NextResponse.json({ error: 'from and to must be different teams' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify both teams exist
  const [{ data: fromTeam }, { data: toTeam }] = await Promise.all([
    supabase.from('teams').select('id, name').eq('id', from_id).single(),
    supabase.from('teams').select('id, name').eq('id', to_id).single(),
  ])
  if (!fromTeam) return NextResponse.json({ error: 'Source team not found' }, { status: 404 })
  if (!toTeam) return NextResponse.json({ error: 'Target team not found' }, { status: 404 })

  // Count before transferring
  const [{ count: mp1 }, { count: mp2 }, { count: players }] = await Promise.all([
    supabase.from('match_predictions').select('*', { count: 'exact', head: true }).eq('team_1_id', from_id),
    supabase.from('match_predictions').select('*', { count: 'exact', head: true }).eq('team_2_id', from_id),
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('team_id', from_id),
  ])

  // Transfer match_predictions
  await Promise.all([
    supabase.from('match_predictions').update({ team_1_id: to_id }).eq('team_1_id', from_id),
    supabase.from('match_predictions').update({ team_2_id: to_id }).eq('team_2_id', from_id),
  ])

  // Transfer players
  await supabase.from('players').update({ team_id: to_id }).eq('team_id', from_id)

  // Mark old team inactive, clear ELO
  await supabase
    .from('teams')
    .update({ is_active: false, current_elo: null })
    .eq('id', from_id)

  return NextResponse.json({
    ok: true,
    from: fromTeam.name,
    to: toTeam.name,
    matches_transferred: (mp1 ?? 0) + (mp2 ?? 0),
    players_transferred: players ?? 0,
  })
}
