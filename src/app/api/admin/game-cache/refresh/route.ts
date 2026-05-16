import { NextResponse } from 'next/server'
import { fetchAllHeroes } from '@/lib/heroes'
import { fetchAllItems } from '@/lib/items'
import { setCachedHeroes, setCachedItems, setCachedHeroDetail } from '@/lib/game-cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const VALVE_BASE = 'https://www.dota2.com/datafeed'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function POST() {
  try {
    // Fetch fresh hero + item lists, bypassing Next.js data cache
    const [heroes, items] = await Promise.all([
      fetchAllHeroes({ revalidate: 0 }),
      fetchAllItems({ revalidate: 0 }),
    ])

    await Promise.all([
      setCachedHeroes(heroes),
      setCachedItems(items),
    ])

    // Fetch and cache Valve hero detail (abilities, facets, talents) for every hero
    let detailErrors = 0
    for (const hero of heroes) {
      try {
        const res = await fetch(`${VALVE_BASE}/herodata?language=english&hero_id=${hero.id}`, { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          const detail = json.result?.data?.heroes?.[0]
          if (detail) await setCachedHeroDetail(hero.id, detail)
        }
      } catch { detailErrors++ }
      await sleep(150)
    }

    return NextResponse.json({
      ok: true,
      heroes: heroes.length,
      items: items.length,
      detail_errors: detailErrors,
      refreshed_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
