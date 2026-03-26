import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { submitToIndexNow } from '@/lib/indexnow'

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, is_published, published_at, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()
  const slug = body.slug || toSlug(body.title)
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: body.title,
      slug,
      content: body.content ?? '',
      excerpt: body.excerpt ?? '',
      cover_image_url: body.cover_image_url ?? null,
      is_published: body.is_published ?? false,
      published_at: body.is_published ? new Date().toISOString() : null,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (body.is_published) {
    submitToIndexNow([`https://dota2protips.com/blog/${slug}`, 'https://dota2protips.com/blog'])
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  if (fields.title && !fields.slug) fields.slug = toSlug(fields.title)
  if (fields.is_published && !fields.published_at) fields.published_at = new Date().toISOString()

  const { error } = await supabase
    .from('blog_posts')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (fields.is_published && fields.slug) {
    submitToIndexNow([`https://dota2protips.com/blog/${fields.slug}`, 'https://dota2protips.com/blog'])
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
