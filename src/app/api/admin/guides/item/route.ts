import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { upsertItemGuide } from '@/lib/guides'
import { submitToIndexNow } from '@/lib/indexnow'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { item_key, why_buy, when_to_buy, tips, summary } = body
    if (!item_key) return NextResponse.json({ error: 'item_key required' }, { status: 400 })

    await upsertItemGuide(item_key, {
      why_buy: why_buy || null,
      when_to_buy: when_to_buy || null,
      tips: Array.isArray(tips) ? tips : [],
      summary: summary || null,
    })

    revalidatePath(`/items/${item_key}`)
    submitToIndexNow([`https://dota2protips.com/items/${item_key}`])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
