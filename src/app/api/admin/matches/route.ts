import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createAdminClient()

  // Create stage if needed
  let stageId = body.stage_id || null
  if (!stageId && body.new_stage_name && body.tournament_id) {
    const { data: stageData, error: stageErr } = await supabase
      .from('stages')
      .insert({
        tournament_id: body.tournament_id,
        name: body.new_stage_name,
        stage_order: body.stage_order ?? 1,
        stage_date: body.new_stage_date || null,
      })
      .select()
      .single()
    if (stageErr) return NextResponse.json({ error: stageErr.message }, { status: 400 })
    stageId = stageData.id
  }

  const { new_stage_name, new_stage_date, stage_order, ...matchBody } = body
  const { data, error } = await supabase
    .from('match_predictions')
    .insert({ ...matchBody, stage_id: stageId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, ...body } = await req.json()
  const supabase = createAdminClient()

  // Auto-calculate is_correct
  if ('actual_winner_id' in body) {
    const isDraw = !body.actual_winner_id  // draw = no winner
    const predictedDraw = !!body.predicted_draw

    if (isDraw) {
      // Actual draw: correct only if we predicted draw
      body.is_correct = predictedDraw ? true : (predictedDraw === false && body.predicted_winner_id ? false : null)
    } else if (predictedDraw) {
      // Predicted draw but there was a winner → wrong
      body.is_correct = false
    } else if (body.predicted_winner_id !== undefined) {
      body.is_correct = body.predicted_winner_id
        ? body.actual_winner_id === body.predicted_winner_id
        : null
    }
  }

  const { data, error } = await supabase
    .from('match_predictions')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('match_predictions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
