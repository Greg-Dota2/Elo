import type { Metadata } from 'next'
import { fetchAllItems } from '@/lib/items'
import ItemMetaClient, { type UpgradeItemStat, type NeutralItemEntry } from './ItemMetaClient'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Item Meta — Dota 2 Win Rates & Neutral Tiers',
  description: 'Dota 2 upgrade item win rates aggregated from public matches, plus all neutral items organized by tier.',
  alternates: { canonical: '/items/meta' },
}

interface TimingRow {
  hero_id: number
  item: string
  time: number
  games: string
  wins: string
}

export default async function ItemMetaPage() {
  const [allItems, timingsRaw] = await Promise.all([
    fetchAllItems(),
    fetch('https://api.opendota.com/api/scenarios/itemTimings', { next: { revalidate: 86400 } })
      .then(r => r.ok ? r.json() as Promise<TimingRow[]> : [])
      .catch(() => [] as TimingRow[]),
  ])

  // Build item lookup by key
  const itemByKey = new Map(allItems.map(i => [i.key, i]))

  // Aggregate itemTimings: sum games + wins per item key, track timing buckets
  const agg = new Map<string, { games: number; wins: number; byTiming: Map<number, number> }>()
  for (const row of timingsRaw) {
    const g = parseInt(row.games) || 0
    const w = parseInt(row.wins) || 0
    if (!agg.has(row.item)) agg.set(row.item, { games: 0, wins: 0, byTiming: new Map() })
    const entry = agg.get(row.item)!
    entry.games += g
    entry.wins += w
    entry.byTiming.set(row.time, (entry.byTiming.get(row.time) ?? 0) + g)
  }

  // Build upgrade item stats (only upgrade category, has timing data, min 200 games)
  const upgradeItems: UpgradeItemStat[] = []
  for (const [key, stats] of agg.entries()) {
    const item = itemByKey.get(key)
    if (!item || item.category !== 'upgrade') continue
    if (stats.games < 200) continue

    // Peak timing = bucket with most games
    let peakTiming = 0
    let peakGames = 0
    for (const [time, games] of stats.byTiming.entries()) {
      if (games > peakGames) { peakGames = games; peakTiming = time }
    }

    upgradeItems.push({
      key,
      dname: item.dname,
      cost: item.cost,
      winRate: parseFloat(((stats.wins / stats.games) * 100).toFixed(1)),
      games: stats.games,
      peakTiming,
    })
  }

  upgradeItems.sort((a, b) => b.winRate - a.winRate)

  // Neutral items: category neutral with a tier field
  const neutralItems: NeutralItemEntry[] = allItems
    .filter(i => i.category === 'neutral' && typeof i.tier === 'number')
    .map(i => ({
      key: i.key,
      dname: i.dname,
      tier: i.tier!,
      attrib: i.attrib,
      cd: i.cd,
    }))
    .sort((a, b) => a.tier - b.tier || a.dname.localeCompare(b.dname))

  const updatedAt = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens',
  })

  return <ItemMetaClient upgradeItems={upgradeItems} neutralItems={neutralItems} updatedAt={updatedAt} />
}
