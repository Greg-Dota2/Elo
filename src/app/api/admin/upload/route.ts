import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const BUCKET = 'images'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'misc'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const safeName = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 60)
    const fileName = `${folder}/${safeName}-${Date.now()}.${ext}`

    const supabase = createAdminClient()
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { path } = await req.json()
    if (!path) return NextResponse.json({ error: 'No path' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
