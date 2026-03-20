import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createAdminClient()

  const slug = (body.name as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data, error } = await supabase
    .from('tournaments')
    .insert({ ...body, slug, tier: 1 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/tournaments', 'layout')
  revalidatePath('/')
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, ...body } = await req.json()
  const supabase = createAdminClient()

  // Re-derive slug when name changes
  if (body.name) {
    body.slug = (body.name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const { data, error } = await supabase
    .from('tournaments')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/tournaments', 'layout')
  revalidatePath('/')
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const supabase = createAdminClient()

  // Delete stages and matches (cascade should handle it, but be explicit)
  await supabase.from('match_predictions').delete().eq('tournament_id', id)
  await supabase.from('stages').delete().eq('tournament_id', id)

  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  revalidatePath('/tournaments', 'layout')
  revalidatePath('/')
  return NextResponse.json({ ok: true })
}
