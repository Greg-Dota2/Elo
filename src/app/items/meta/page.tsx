import type { Metadata } from 'next'
import { fetchAllItems } from '@/lib/items'
import { createAdminClient } from '@/lib/supabase/admin'
import ItemMetaClient, { type UpgradeItemStat, type NeutralItemEntry } from './ItemMetaClient'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Item Meta — Dota 2 Win Rates & Neutral Tiers',
  description: 'Dota 2 upgrade item win rates aggregated from public matches, plus all neutral items organized by tier.',
  alternates: { canonical: '/items/meta' },
}

export default async function ItemMetaPage() {
  const supabase = createAdminClient()
  const allItems = await fetchAllItems()
  const itemByKey = new Map(allItems.map(i => [i.key, i]))

  // ── Upgrade items from Supabase cache ─────────────────────────────────────
  type CachedTiming = { key: string; win_rate: number; games: number; peak_timing: number }
  let cachedTimings: CachedTiming[] = []
  try {
    const { data } = await supabase.from('opendota_cache').select('data').eq('key', 'item_timings').single()
    if (data?.data) cachedTimings = data.data
  } catch { /* cache empty, fall through */ }

  let upgradeItems: UpgradeItemStat[] = []

  if (cachedTimings.length > 0) {
    upgradeItems = cachedTimings
      .map(t => {
        const item = itemByKey.get(t.key)
        if (!item || item.category !== 'upgrade') return null
        return { key: t.key, dname: item.dname, cost: item.cost, winRate: t.win_rate, games: t.games, peakTiming: t.peak_timing }
      })
      .filter((x): x is UpgradeItemStat => x !== null)
      .sort((a, b) => b.winRate - a.winRate)
  } else {
    // Fallback: bulk endpoint (sparse but better than nothing)
    try {
      const res = await fetch('https://api.opendota.com/api/scenarios/itemTimings', { next: { revalidate: 86400 } })
      if (res.ok) {
        const rows: { item: string; time: number; games: string; wins: string }[] = await res.json()
        const agg = new Map<string, { games: number; wins: number; byTiming: Map<number, number> }>()
        for (const row of rows) {
          const g = parseInt(row.games) || 0
          const w = parseInt(row.wins) || 0
          if (!agg.has(row.item)) agg.set(row.item, { games: 0, wins: 0, byTiming: new Map() })
          const entry = agg.get(row.item)!
          entry.games += g; entry.wins += w
          entry.byTiming.set(row.time, (entry.byTiming.get(row.time) ?? 0) + g)
        }
        for (const [key, stats] of agg.entries()) {
          const item = itemByKey.get(key)
          if (!item || item.category !== 'upgrade' || stats.games < 50) continue
          let peakTiming = 0, peakGames = 0
          for (const [time, games] of stats.byTiming) {
            if (games > peakGames) { peakGames = games; peakTiming = time }
          }
          upgradeItems.push({ key, dname: item.dname, cost: item.cost, winRate: parseFloat(((stats.wins / stats.games) * 100).toFixed(1)), games: stats.games, peakTiming })
        }
        upgradeItems.sort((a, b) => b.winRate - a.winRate)
      }
    } catch { /* leave empty */ }
  }

  // ── Neutral item stats from Supabase cache ────────────────────────────────
  type NeutralRow = { item_neutral: number; games: number; wins: number }
  let neutralRows: NeutralRow[] = []
  try {
    const { data } = await supabase.from('opendota_cache').select('data').eq('key', 'neutral_item_stats').single()
    if (data?.data?.rows) neutralRows = data.data.rows
  } catch { /* fall through */ }

  if (neutralRows.length === 0) {
    const RECENT_FLOOR = 7700000000
    const sql = encodeURIComponent(
      `SELECT pm.item_neutral, COUNT(*) AS games, ` +
      `SUM(CASE WHEN m.radiant_win = (pm.player_slot < 128) THEN 1 ELSE 0 END) AS wins ` +
      `FROM player_matches pm JOIN matches m ON m.match_id = pm.match_id ` +
      `WHERE pm.item_neutral IS NOT NULL AND pm.item_neutral != 0 AND pm.match_id > ${RECENT_FLOOR} ` +
      `GROUP BY pm.item_neutral ORDER BY games DESC`
    )
    try {
      const res = await fetch(`https://api.opendota.com/api/explorer?sql=${sql}`, { next: { revalidate: 86400 } })
      if (res.ok) {
        const raw: { rows?: NeutralRow[] } = await res.json()
        neutralRows = raw.rows ?? []
      }
    } catch { /* leave empty */ }
  }

  const neutralStatById = new Map<number, { games: number; winRate: number }>()
  for (const row of neutralRows) {
    if (row.games > 0) {
      neutralStatById.set(row.item_neutral, {
        games: row.games,
        winRate: parseFloat(((row.wins / row.games) * 100).toFixed(1)),
      })
    }
  }

  const neutralItems: NeutralItemEntry[] = allItems
    .filter(i => i.category === 'neutral' && typeof i.tier === 'number')
    .map(i => {
      const stat = neutralStatById.get(i.id)
      return { key: i.key, dname: i.dname, tier: i.tier!, attrib: i.attrib, cd: i.cd, games: stat?.games ?? null, winRate: stat?.winRate ?? null }
    })
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))

  const updatedAt = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens',
  })

  return <ItemMetaClient upgradeItems={upgradeItems} neutralItems={neutralItems} updatedAt={updatedAt} />
}
