import { fetchAllHeroes, heroSlug, heroPortraitUrl } from '@/lib/heroes'
import { getCachedHeroes } from '@/lib/game-cache'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const heroes = await getCachedHeroes() ?? await fetchAllHeroes()
  const data = heroes.map(h => ({
    localized_name: h.localized_name,
    slug: heroSlug(h.name),
    portrait_url: heroPortraitUrl(heroSlug(h.name)),
    primary_attr: h.primary_attr,
  }))
  return NextResponse.json(data)
}
