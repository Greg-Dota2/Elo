import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { submitToIndexNow } from '@/lib/indexnow'

function toSlug(ign: string) {
  return ign.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const slug = body.slug || toSlug(body.ign)

    const { data, error } = await supabase
      .from('players')
      .insert({
        slug,
        ign: body.ign,
        full_name: body.full_name || null,
        team_id: body.team_id || null,
        position: body.position ? Number(body.position) : null,
        nationality: body.nationality || null,
        date_of_birth: body.date_of_birth || null,
        photo_url: body.photo_url || null,
        bio: body.bio || null,
        signature_heroes: body.signature_heroes
          ? body.signature_heroes.split(',').map((h: string) => h.trim()).filter(Boolean)
          : null,
        achievements: body.achievements || null,
        previous_teams: body.previous_teams || null,
        liquipedia_url: body.liquipedia_url || null,
        opendota_id: body.opendota_id ? Number(body.opendota_id) : null,
        is_published: body.is_published ?? false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    revalidatePath('/players', 'layout')
    if (data.is_published) {
      submitToIndexNow([`https://dota2protips.com/players/${data.slug}`, 'https://dota2protips.com/players'])
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
    if (fields.ign !== undefined) update.ign = fields.ign
    if (fields.slug !== undefined) update.slug = fields.slug
    if (fields.full_name !== undefined) update.full_name = fields.full_name || null
    if (fields.team_id !== undefined) update.team_id = fields.team_id || null
    if (fields.position !== undefined) update.position = fields.position ? Number(fields.position) : null
    if (fields.nationality !== undefined) update.nationality = fields.nationality || null
    if (fields.date_of_birth !== undefined) update.date_of_birth = fields.date_of_birth || null
    if (fields.photo_url !== undefined) update.photo_url = fields.photo_url || null
    if (fields.bio !== undefined) update.bio = fields.bio || null
    if (fields.signature_heroes !== undefined) {
      update.signature_heroes = fields.signature_heroes
        ? fields.signature_heroes.split(',').map((h: string) => h.trim()).filter(Boolean)
        : null
    }
    if (fields.achievements !== undefined) update.achievements = fields.achievements || null
    if (fields.previous_teams !== undefined) update.previous_teams = fields.previous_teams || null
    if (fields.liquipedia_url !== undefined) update.liquipedia_url = fields.liquipedia_url || null
    if (fields.opendota_id !== undefined) update.opendota_id = fields.opendota_id ? Number(fields.opendota_id) : null
    if (fields.is_published !== undefined) update.is_published = fields.is_published

    const { data, error } = await supabase
      .from('players')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    revalidatePath('/players', 'layout')
    revalidatePath(`/players/${data.slug}`, 'layout')
    if (data.is_published) {
      submitToIndexNow([`https://dota2protips.com/players/${data.slug}`, 'https://dota2protips.com/players'])
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
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    revalidatePath('/players', 'layout')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
