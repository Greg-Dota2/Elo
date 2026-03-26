import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { submitToIndexNow } from '@/lib/indexnow'

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createAdminClient()
  const payload = {
    name: body.name,
    short_name: body.short_name || null,
    region: body.region || null,
    logo_url: body.logo_url || null,
    banner_url: body.banner_url || null,
    liquipedia_url: body.liquipedia_url || null,
    website_url: body.website_url || null,
    bio: body.bio || null,
    achievements: body.achievements || null,
    founded_year: body.founded_year ? Number(body.founded_year) : null,
    is_active: body.is_active ?? true,
    slug: body.slug || toSlug(body.name),
  }
  const { data, error } = await supabase.from('teams').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/teams', 'layout')
  submitToIndexNow([`https://dota2protips.com/teams/${data.slug}`, 'https://dota2protips.com/teams'])
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body
  const supabase = createAdminClient()
  const update: Record<string, unknown> = {}
  const strings = ['name','short_name','region','logo_url','banner_url','liquipedia_url','website_url','bio','achievements','slug','opendota_team_id']
  for (const k of strings) { if (fields[k] !== undefined) update[k] = fields[k] || null }
  if (fields.is_active !== undefined) update.is_active = fields.is_active
  if (fields.founded_year !== undefined) update.founded_year = fields.founded_year ? Number(fields.founded_year) : null
  const { data, error } = await supabase.from('teams').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/teams', 'layout')
  if (data.slug) {
    revalidatePath('/teams/' + data.slug, 'layout')
    submitToIndexNow([`https://dota2protips.com/teams/${data.slug}`, 'https://dota2protips.com/teams'])
  }
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/teams', 'layout')
  return NextResponse.json({ ok: true })
}
