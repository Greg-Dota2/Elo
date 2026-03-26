import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitToIndexNow } from '@/lib/indexnow'

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

  // Notify Bing when a prediction is published
  if (body.is_published && body.tournament_id) {
    const { data: tournament } = await supabase.from('tournaments').select('slug').eq('id', body.tournament_id).single()
    if (tournament?.slug) {
      submitToIndexNow([`https://dota2protips.com/tournaments/${tournament.slug}`])
    }
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, ...body } = await req.json()
  const supabase = createAdminClient()

  // Auto-calculate is_correct when actual result is being set
  if ('actual_winner_id' in body) {
    // Fetch existing record so we always have predicted_winner_id and predicted_draw,
    // even when the PATCH only sends scores/actual_winner_id
    const { data: existing } = await supabase
      .from('match_predictions')
      .select('predicted_winner_id, predicted_draw')
      .eq('id', id)
      .single()

    const isDraw = !body.actual_winner_id
    const predictedDraw = body.predicted_draw ?? existing?.predicted_draw ?? false
    const predictedWinnerId = body.predicted_winner_id ?? existing?.predicted_winner_id ?? null

    if (isDraw) {
      body.is_correct = predictedDraw ? true : (predictedWinnerId ? false : null)
    } else if (predictedDraw) {
      body.is_correct = false
    } else {
      body.is_correct = predictedWinnerId ? body.actual_winner_id === predictedWinnerId : null
    }
  }

  const { data, error } = await supabase
    .from('match_predictions')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Notify Bing when a prediction is published or updated
  if (body.is_published !== false && data.tournament_id) {
    const { data: tournament } = await supabase.from('tournaments').select('slug').eq('id', data.tournament_id).single()
    if (tournament?.slug) {
      submitToIndexNow([`https://dota2protips.com/tournaments/${tournament.slug}`])
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('match_predictions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
