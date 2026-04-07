import { NextResponse } from 'next/server'
import { fetchAllHeroes } from '@/lib/heroes'
import { fetchAllItems } from '@/lib/items'
import { setCachedHeroes, setCachedItems } from '@/lib/game-cache'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Fetch fresh data, bypassing Next.js data cache
    const [heroes, items] = await Promise.all([
      fetchAllHeroes({ revalidate: 0 }),
      fetchAllItems({ revalidate: 0 }),
    ])

    await Promise.all([
      setCachedHeroes(heroes),
      setCachedItems(items),
    ])

    return NextResponse.json({
      ok: true,
      heroes: heroes.length,
      items: items.length,
      refreshed_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
