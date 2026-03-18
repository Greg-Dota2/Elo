import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('stages')
    .insert({
      tournament_id: body.tournament_id,
      name: body.name,
      stage_order: body.stage_order ?? 0,
      stage_date: body.stage_date ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const supabase = createAdminClient()

  const { error } = await supabase.from('stages').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
