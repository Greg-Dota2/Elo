export interface HeroRadarStats {
  form: number        // 0-100, win rate %
  performance: number // 0-100, KDA normalized
  laning: number      // 0-100, last hits/min normalized
  farmGold: number    // 0-100, avg GPM normalized
  fighting: number    // 0-100, avg kills+assists normalized
  experience: number  // 0-100, avg XPM normalized
  matchCount: number
}

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

interface BenchmarkEntry { percentile: number; value: number }
interface BenchmarkResult {
  gold_per_min?: BenchmarkEntry[]
  xp_per_min?: BenchmarkEntry[]
  kills_per_min?: BenchmarkEntry[]
  last_hits_per_min?: BenchmarkEntry[]
  hero_damage_per_min?: BenchmarkEntry[]
  deaths?: BenchmarkEntry[]
  assists?: BenchmarkEntry[]
}

function median(entries: BenchmarkEntry[] | undefined): number {
  if (!entries || entries.length === 0) return 0
  const sorted = [...entries].sort((a, b) => a.percentile - b.percentile)
  return sorted.find(e => e.percentile >= 0.5)?.value ?? sorted[sorted.length - 1]?.value ?? 0
}

export async function fetchHeroRadarStats(heroId: number): Promise<HeroRadarStats | null> {
  try {
    const [benchRes, statsRes] = await Promise.all([
      fetch(`https://api.opendota.com/api/benchmarks?hero_id=${heroId}`, { next: { revalidate: 3600 } }),
      fetch(`https://api.opendota.com/api/heroStats`, { next: { revalidate: 3600 } }),
    ])
    if (!benchRes.ok) return null

    const benchData: { result: BenchmarkResult } = await benchRes.json()
    const r = benchData.result

    // Use median (50th percentile) for each metric
    const medGpm       = median(r.gold_per_min)
    const medXpm       = median(r.xp_per_min)
    const medKillsMin  = median(r.kills_per_min)
    const medLhMin     = median(r.last_hits_per_min)
    const medDeaths    = median(r.deaths)
    const medAssists   = median(r.assists)

    // Assume ~35 min average game for kills/assists per match
    const AVG_GAME_MIN = 35
    const medKills   = medKillsMin * AVG_GAME_MIN
    const medLh      = medLhMin * AVG_GAME_MIN
    const kda        = (medKills + medAssists) / Math.max(1, medDeaths)

    const performance = pct(kda, 7)
    const laning      = pct(medLhMin, 12)
    const farmGold    = pct(medGpm, 800)
    const fighting    = pct(medKills + medAssists, 22)
    const experience  = pct(medXpm, 900)

    // Win rate from heroStats (all-rank aggregate)
    let form = 50
    if (statsRes.ok) {
      const allStats: Array<{ id: number } & Record<string, number>> = await statsRes.json()
      const h = allStats.find(x => x.id === heroId)
      if (h) {
        const totalWins  = [1,2,3,4,5,6,7,8].reduce((s, b) => s + (h[`${b}_win`]  ?? 0), 0)
        const totalPicks = [1,2,3,4,5,6,7,8].reduce((s, b) => s + (h[`${b}_pick`] ?? 0), 0)
        if (totalPicks > 0) form = clamp(Math.round((totalWins / totalPicks) * 100))
      }
    }

    if (!medGpm && !medXpm) return null  // benchmarks returned empty data

    return { form, performance, laning, farmGold, fighting, experience, matchCount: 0 }
  } catch {
    return null
  }
}

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
