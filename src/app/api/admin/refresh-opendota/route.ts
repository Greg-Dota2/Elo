import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllHeroes } from '@/lib/heroes'
import { fetchAllItems } from '@/lib/items'
import { getCachedHeroes, getCachedItems } from '@/lib/game-cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const OD = 'https://api.opendota.com/api'

async function odFetch(path: string) {
  const res = await fetch(`${OD}${path}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`OpenDota ${path} → ${res.status}`)
  return res.json()
}

// 1 request/sec keeps us well under the 60/min free-tier limit
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
const DELAY = 1100

export async function POST() {
  const supabase = createAdminClient()
  const log: string[] = []
  let errors = 0

  try {
    // ── 1. heroStats ──────────────────────────────────────────────────────────
    log.push('Fetching heroStats...')
    const heroStats = await odFetch('/heroStats')
    await supabase.from('opendota_cache').upsert({ key: 'hero_stats', data: heroStats, fetched_at: new Date().toISOString() })
    log.push(`✓ hero_stats (${heroStats.length} heroes)`)
    await sleep(DELAY)

    // ── 2. Per-hero data: fully sequential, 1 request at a time ──────────────
    const heroes = (await getCachedHeroes()) ?? (await fetchAllHeroes({ revalidate: 0 }))
    log.push(`Fetching per-hero data for ${heroes.length} heroes (benchmarks + item popularity + matchups)...`)

    for (const hero of heroes) {
      const upserts: { key: string; data: unknown; fetched_at: string }[] = []
      const ts = new Date().toISOString()

      try {
        const benchmarks = await odFetch(`/benchmarks?hero_id=${hero.id}`)
        upserts.push({ key: `benchmarks_${hero.id}`, data: benchmarks, fetched_at: ts })
      } catch (e) { errors++; log.push(`✗ benchmarks ${hero.id} (${hero.localized_name}): ${e}`) }
      await sleep(DELAY)

      try {
        const itemPopularity = await odFetch(`/heroes/${hero.id}/itemPopularity`)
        upserts.push({ key: `item_popularity_${hero.id}`, data: itemPopularity, fetched_at: ts })
      } catch (e) { errors++; log.push(`✗ itemPopularity ${hero.id} (${hero.localized_name}): ${e}`) }
      await sleep(DELAY)

      try {
        const matchups = await odFetch(`/heroes/${hero.id}/matchups`)
        upserts.push({ key: `matchups_${hero.id}`, data: matchups, fetched_at: ts })
      } catch (e) { errors++; log.push(`✗ matchups ${hero.id} (${hero.localized_name}): ${e}`) }
      await sleep(DELAY)

      if (upserts.length > 0) {
        await supabase.from('opendota_cache').upsert(upserts)
      }
    }
    log.push(`✓ per-hero data complete (${errors} errors so far)`)

    // ── 3. Item timings (per-item for accurate game counts) ───────────────────
    log.push('Fetching item timings...')
    const allItems = (await getCachedItems()) ?? (await fetchAllItems({ revalidate: 0 }))
    const upgradeKeys = allItems.filter(i => i.category === 'upgrade').map(i => i.key)

    interface TimingRow { item: string; time: number; games: string; wins: string }
    const allTimings: TimingRow[] = []

    for (const key of upgradeKeys) {
      try {
        const rows: TimingRow[] = await odFetch(`/scenarios/itemTimings?item=${key}`)
        allTimings.push(...rows)
      } catch { errors++ }
      await sleep(DELAY)
    }

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

    const itemTimings = Array.from(agg.entries())
      .filter(([, s]) => s.games >= 50)
      .map(([key, s]) => {
        let peakTiming = 0, peakGames = 0
        for (const [time, games] of s.byTiming) {
          if (games > peakGames) { peakGames = games; peakTiming = time }
        }
        return { key, win_rate: parseFloat(((s.wins / s.games) * 100).toFixed(1)), games: s.games, peak_timing: peakTiming }
      })

    await supabase.from('opendota_cache').upsert({ key: 'item_timings', data: itemTimings, fetched_at: new Date().toISOString() })
    log.push(`✓ item_timings (${itemTimings.length} items)`)

    // ── 4. Neutral item stats ─────────────────────────────────────────────────
    log.push('Fetching neutral item stats...')
    await sleep(DELAY)
    const RECENT_FLOOR = 7700000000
    const sql = encodeURIComponent(
      `SELECT pm.item_neutral, COUNT(*) AS games, ` +
      `SUM(CASE WHEN m.radiant_win = (pm.player_slot < 128) THEN 1 ELSE 0 END) AS wins ` +
      `FROM player_matches pm JOIN matches m ON m.match_id = pm.match_id ` +
      `WHERE pm.item_neutral IS NOT NULL AND pm.item_neutral != 0 AND pm.match_id > ${RECENT_FLOOR} ` +
      `GROUP BY pm.item_neutral ORDER BY games DESC`
    )
    try {
      const neutralRaw = await odFetch(`/explorer?sql=${sql}`)
      await supabase.from('opendota_cache').upsert({ key: 'neutral_item_stats', data: neutralRaw, fetched_at: new Date().toISOString() })
      log.push(`✓ neutral_item_stats (${neutralRaw.rows?.length ?? 0} rows)`)
    } catch (e) {
      errors++
      log.push(`✗ neutral_item_stats: ${e}`)
    }

    return NextResponse.json({ ok: true, log, errors })
  } catch (err) {
    log.push(`Fatal: ${err}`)
    return NextResponse.json({ ok: false, log, errors, error: String(err) }, { status: 500 })
  }
}
