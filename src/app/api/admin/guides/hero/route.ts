import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { upsertHeroGuide } from '@/lib/guides'
import { heroSlug } from '@/lib/heroes'
import { submitToIndexNow } from '@/lib/indexnow'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { hero_id, hero_name, when_to_pick, tips, summary } = body
    if (!hero_id) return NextResponse.json({ error: 'hero_id required' }, { status: 400 })

    await upsertHeroGuide(Number(hero_id), {
      when_to_pick: when_to_pick || null,
      tips: Array.isArray(tips) ? tips : [],
      summary: summary || null,
    })

    const slug = hero_name ? heroSlug(hero_name) : null
    if (slug) {
      revalidatePath(`/heroes/${slug}`)
      submitToIndexNow([`https://dota2protips.com/heroes/${slug}`])
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
