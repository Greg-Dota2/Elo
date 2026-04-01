import { fetchAllItems, itemIconUrl } from '@/lib/items'
import { NextResponse } from 'next/server'

export const revalidate = 86400

export async function GET() {
  const items = await fetchAllItems()
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
