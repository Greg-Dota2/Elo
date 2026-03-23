export interface PlayerRadarStats {
  form: number        // 0-100, win rate %
  performance: number // 0-100, KDA normalized
  heroPool: number    // raw count of distinct heroes
  laning: number      // 0-100, last hits/min normalized
  farmGold: number    // 0-100, avg GPM normalized
  fighting: number    // 0-100, avg kills+assists normalized
  experience: number  // 0-100, avg XPM normalized
  matchCount: number
}

interface OdMatch {
  radiant_win: boolean
  player_slot: number
  kills: number
  deaths: number
  assists: number
  last_hits: number
  gold_per_min: number
  xp_per_min: number
  hero_id: number
  duration: number
}

function clamp(v: number) { return Math.min(100, Math.max(0, Math.round(v))) }
function pct(value: number, max: number) { return clamp((value / max) * 100) }

export async function fetchPlayerRadarStats(opendotaId: number): Promise<PlayerRadarStats | null> {
  try {
    const res = await fetch(
      `https://api.opendota.com/api/players/${opendotaId}/recentMatches`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const matches: OdMatch[] = await res.json()
    if (!Array.isArray(matches) || matches.length === 0) return null

    const n = matches.length

    const wins = matches.filter(m => (m.player_slot < 128) === m.radiant_win).length
    const form = Math.round((wins / n) * 100)

    const avgKills = matches.reduce((s, m) => s + m.kills, 0) / n
    const avgDeaths = matches.reduce((s, m) => s + m.deaths, 0) / n
    const avgAssists = matches.reduce((s, m) => s + m.assists, 0) / n
    const kda = (avgKills + avgAssists) / Math.max(1, avgDeaths)
    const performance = pct(kda, 7) // 7.0 KDA = 100% (pro ceiling)

    const heroPool = new Set(matches.map(m => m.hero_id)).size

    const avgLastHits = matches.reduce((s, m) => s + m.last_hits, 0) / n
    const avgDurMin = matches.reduce((s, m) => s + m.duration, 0) / n / 60
    const lhPerMin = avgDurMin > 0 ? avgLastHits / avgDurMin : 0
    const laning = pct(lhPerMin, 12) // 12 LH/min = 100% (pro carry ceiling)

    const avgGpm = matches.reduce((s, m) => s + m.gold_per_min, 0) / n
    const farmGold = pct(avgGpm, 800) // 800 GPM = 100% (pro carry ceiling)

    const avgFight = matches.reduce((s, m) => s + m.kills + m.assists, 0) / n
    const fighting = pct(avgFight, 22) // 22 combined = 100% (pro ceiling)

    const avgXpm = matches.reduce((s, m) => s + m.xp_per_min, 0) / n
    const experience = pct(avgXpm, 900) // 900 XPM = 100% (pro ceiling)

    return { form, performance, heroPool, laning, farmGold, fighting, experience, matchCount: n }
  } catch {
    return null
  }
}
