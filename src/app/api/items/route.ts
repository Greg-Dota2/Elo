import { fetchAllItems, itemIconUrl } from '@/lib/items'
import { getCachedItems } from '@/lib/game-cache'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await getCachedItems() ?? await fetchAllItems()
  const data = items
    .filter(i => i.dname && i.cost > 0)
    .map(i => ({
      key: i.key,
      dname: i.dname,
      cost: i.cost,
      category: i.category,
      icon_url: itemIconUrl(i.key),
    }))
  return NextResponse.json(data)
}
