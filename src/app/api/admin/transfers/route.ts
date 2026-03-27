import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { submitToIndexNow } from '@/lib/indexnow'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('transfers')
      .insert({
        player_ign:          body.player_ign,
        player_slug:         body.player_slug || null,
        player_photo_url:    body.player_photo_url || null,
        from_team:           body.from_team || null,
        from_team_logo_url:  body.from_team_logo_url || null,
        to_team:             body.to_team || null,
        to_team_logo_url:    body.to_team_logo_url || null,
        transfer_date:       body.transfer_date,
        type:                body.type || 'permanent',
        notes:               body.notes || null,
        is_published:        body.is_published ?? false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    revalidatePath('/transfers', 'layout')
    if (data.is_published) {
      submitToIndexNow(['https://dota2protips.com/transfers'])
    }
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, ...fields } = body
    const supabase = createAdminClient()

    const update: Record<string, unknown> = {}
    if (fields.player_ign !== undefined)         update.player_ign = fields.player_ign
    if (fields.player_slug !== undefined)        update.player_slug = fields.player_slug || null
    if (fields.player_photo_url !== undefined)   update.player_photo_url = fields.player_photo_url || null
    if (fields.from_team !== undefined)          update.from_team = fields.from_team || null
    if (fields.from_team_logo_url !== undefined) update.from_team_logo_url = fields.from_team_logo_url || null
    if (fields.to_team !== undefined)            update.to_team = fields.to_team || null
    if (fields.to_team_logo_url !== undefined)   update.to_team_logo_url = fields.to_team_logo_url || null
    if (fields.transfer_date !== undefined)      update.transfer_date = fields.transfer_date
    if (fields.type !== undefined)               update.type = fields.type
    if (fields.notes !== undefined)              update.notes = fields.notes || null
    if (fields.is_published !== undefined)       update.is_published = fields.is_published

    const { data, error } = await supabase
      .from('transfers')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    revalidatePath('/transfers', 'layout')
    if (data.is_published) {
      submitToIndexNow(['https://dota2protips.com/transfers'])
    }
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    const supabase = createAdminClient()
    const { error } = await supabase.from('transfers').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    revalidatePath('/transfers', 'layout')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
