import type { Metadata } from 'next'
import { fetchAllItems, fetchItemIdMap } from '@/lib/items'
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
  const allItems = await fetchAllItems()

  // Build item lookup by key
  const itemByKey = new Map(allItems.map(i => [i.key, i]))

  // Bulk fetch — one request for all items instead of ~80 per-item requests that hit rate limits
  let allTimings: TimingRow[] = []
  try {
    const res = await fetch(
      'https://api.opendota.com/api/scenarios/itemTimings',
      { next: { revalidate: 86400 } }
    )
    if (res.ok) allTimings = await res.json()
  } catch {
    // leave allTimings empty; upgradeItems will be empty but page won't crash
  }

  // Aggregate: sum games + wins per item key, track timing buckets
  const agg = new Map<string, { games: number; wins: number; byTiming: Map<number, number> }>()
  for (const row of allTimings) {
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
    if (stats.games < 50) continue

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

  // Neutral item win rates via OpenDota SQL explorer (item_neutral column in player_matches)
  const RECENT_FLOOR = 7700000000
  const sql = encodeURIComponent(
    `SELECT pm.item_neutral, COUNT(*) AS games, ` +
    `SUM(CASE WHEN m.radiant_win = (pm.player_slot < 128) THEN 1 ELSE 0 END) AS wins ` +
    `FROM player_matches pm JOIN matches m ON m.match_id = pm.match_id ` +
    `WHERE pm.item_neutral IS NOT NULL AND pm.item_neutral != 0 AND pm.match_id > ${RECENT_FLOOR} ` +
    `GROUP BY pm.item_neutral ORDER BY games DESC`
  )
  const [neutralRaw, itemIdMap] = await Promise.all([
    fetch(`https://api.opendota.com/api/explorer?sql=${sql}`, { next: { revalidate: 86400 } })
      .then(r => r.ok ? r.json() as Promise<{ rows?: { item_neutral: number; games: number; wins: number }[] }> : { rows: [] })
      .catch(() => ({ rows: [] as { item_neutral: number; games: number; wins: number }[] })),
    fetchItemIdMap(),
  ])

  // Map item ID → win rate stats
  const neutralStatById = new Map<number, { games: number; winRate: number }>()
  for (const row of neutralRaw.rows ?? []) {
    if (row.games > 0) {
      neutralStatById.set(row.item_neutral, {
        games: row.games,
        winRate: parseFloat(((row.wins / row.games) * 100).toFixed(1)),
      })
    }
  }

  // Neutral items: category neutral with a tier field
  const neutralItems: NeutralItemEntry[] = allItems
    .filter(i => i.category === 'neutral' && typeof i.tier === 'number')
    .map(i => {
      const stat = neutralStatById.get(i.id)
      return {
        key: i.key,
        dname: i.dname,
        tier: i.tier!,
        attrib: i.attrib,
        cd: i.cd,
        games: stat?.games ?? null,
        winRate: stat?.winRate ?? null,
      }
    })
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))

  const updatedAt = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens',
  })

  return <ItemMetaClient upgradeItems={upgradeItems} neutralItems={neutralItems} updatedAt={updatedAt} />
}
