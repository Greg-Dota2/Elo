const OPENDOTA_BASE = 'https://api.opendota.com/api/constants'
const VALVE_BASE = 'https://www.dota2.com/datafeed'

export type HeroPrimaryAttr = 'str' | 'agi' | 'int' | 'all'

export interface HeroData {
  id: number
  name: string
  localized_name: string
  primary_attr: HeroPrimaryAttr
  attack_type: 'Melee' | 'Ranged'
  roles: string[]
  base_str: number
  base_agi: number
  base_int: number
  str_gain: number
  agi_gain: number
  int_gain: number
  move_speed: number
  attack_range: number
  base_armor: number
  base_attack_min: number
  base_attack_max: number
  projectile_speed: number
}

// Valve datafeed ability (from /datafeed/herodata)
export interface ValveSpecialValue {
  name: string
  heading_loc: string
  values_float: number[]
  is_percentage: boolean
  required_facet?: string
  facet_bonus?: { name: string; values: number[]; operation: number }
  bonuses?: { name: string; value: number; operation: number }[]
}

export interface ValveAbility {
  id: number
  name: string           // internal name, e.g. "antimage_mana_break"
  name_loc: string       // display name
  desc_loc: string       // description
  lore_loc: string
  notes_loc: string[]
  cooldowns: number[]
  mana_costs: number[]
  behavior: string       // numeric bitmask as string
  type: number
  target_team: number
  target_type: number
  special_values: ValveSpecialValue[]
  ability_is_innate: boolean
  ability_has_scepter: boolean
  ability_has_shard: boolean
  ability_is_granted_by_scepter: boolean
  ability_is_granted_by_shard: boolean
  scepter_loc?: string  // upgrade description for Aghanim's Scepter
  shard_loc?: string    // upgrade description for Aghanim's Shard
}

export interface ValveFacet {
  index: number
  name: string
  icon: string
  color: number       // gradient index 1–8
  gradient_id: number
  title_loc: string
  description_loc: string
}

export interface ValveHeroDetail {
  id: number
  name: string
  name_loc: string
  bio_loc: string
  hype_loc: string
  abilities: ValveAbility[]
  talents: ValveAbility[]
  facets: ValveFacet[]
  facet_abilities: { abilities: ValveAbility[] }[]
}

export function heroSlug(heroName: string): string {
  return heroName.replace('npc_dota_hero_', '')
}

// Heroes where internal slug ≠ lowercased-display-name
const HERO_SLUG_OVERRIDES: Record<string, string> = {
  'anti-mage': 'antimage',
  "nature's prophet": 'furion',
  'underlord': 'abyssal_underlord',
  'clockwerk': 'rattletrap',
  'magnus': 'magnataur',
  'outworld destroyer': 'obsidian_destroyer',
  'outworld devourer': 'obsidian_destroyer',
  'zeus': 'zuus',
  'windranger': 'windrunner',
  'queen of pain': 'queenofpain',
  'shadow fiend': 'nevermore',
  'wraith king': 'skeleton_king',
  'lifestealer': 'life_stealer',
  'timbersaw': 'shredder',
  'necrophos': 'necrolyte',
  'centaur warrunner': 'centaur',
  'io': 'wisp',
  'treant protector': 'treant',
  'doom': 'doom_bringer',
}

/** Convert a hero display name (as stored in the DB) to a URL slug for /heroes/[slug] */
export function heroDisplayNameToSlug(displayName: string): string {
  const lower = displayName.toLowerCase().replace(/'/g, '').trim()
  return HERO_SLUG_OVERRIDES[lower] ?? lower.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export const heroPortraitUrl = (slug: string) =>
  `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${slug}.png`

export const abilityIconUrl = (abilityName: string) =>
  `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${abilityName}.png`

export const ATTR_CONFIG: Record<HeroPrimaryAttr, { label: string; short: string; color: string; bg: string; border: string }> = {
  str: { label: 'Strength', short: 'STR', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  agi: { label: 'Agility', short: 'AGI', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  int: { label: 'Intelligence', short: 'INT', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  all: { label: 'Universal', short: 'UNI', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
}

// Behavior bitmask decoder (Dota 2 DOTA_ABILITY_BEHAVIOR flags)
const BEHAVIOR_FLAGS: [number, string][] = [
  [2, 'Passive'],
  [4, 'No Target'],
  [8, 'Unit Target'],
  [16, 'Point Target'],
  [32, 'AOE'],
  [128, 'Channeled'],
  [512, 'Toggle'],
]

export function decodeBehavior(behavior: string | number): string[] {
  const val = typeof behavior === 'string' ? parseInt(behavior, 10) : behavior
  if (isNaN(val)) return []
  return BEHAVIOR_FLAGS.filter(([bit]) => (val & bit) !== 0).map(([, label]) => label)
}

export function formatLevelValues(values: number[]): string {
  if (!values || values.length === 0) return ''
  // Deduplicate if all same
  const unique = [...new Set(values)]
  if (unique.length === 1) return String(unique[0])
  return values.join(' / ')
}

/** Replace %var_name% tokens in ability description text with values from special_values */
export function interpolateAbilityDesc(
  text: string,
  specialValues: ValveSpecialValue[]
): string {
  if (!text) return text
  const lookup = Object.fromEntries(specialValues.map(sv => [sv.name.toLowerCase(), sv]))
  const resolve = (key: string, match: string) => {
    const sv = lookup[key.toLowerCase()]
    if (!sv) return match
    const vals = sv.values_float.map(v => Math.round(v * 100) / 100)
    const formatted = formatLevelValues(vals)
    return sv.is_percentage ? formatted + '%' : formatted
  }
  // Single-pass: handle %% (literal %) and %var% tokens together so %% can't
  // interfere with adjacent token boundaries (e.g. %var%%%)
  return text
    .replace(/%%|%([^%]+)%/g, (match, key) => key ? resolve(key, match) : '%')
    .replace(/\{s:([^}]+)\}/g, (match, key) => resolve(key, match))
}

export async function fetchAllHeroes(): Promise<HeroData[]> {
  const res = await fetch(`${OPENDOTA_BASE}/heroes`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error('Failed to fetch heroes')
  const data: Record<string, HeroData> = await res.json()
  return Object.values(data)
    .filter(h => h.id > 0 && h.localized_name)
    .sort((a, b) => a.localized_name.localeCompare(b.localized_name))
}

export interface HeroMatchup {
  hero_id: number
  games_played: number
  wins: number
  win_rate: number
}

export interface HeroItemPhase {
  phase: string
  label: string
  items: { key: string; count: number }[]
}

export async function fetchHeroItemPopularity(
  heroId: number,
  itemIdMap: Map<number, string>,
  basicItemKeys: Set<string>,
  componentsMap: Map<string, string[]>,
): Promise<HeroItemPhase[]> {
  const res = await fetch(`https://api.opendota.com/api/heroes/${heroId}/itemPopularity`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) return []
  const raw: Record<string, Record<string, number>> = await res.json()

  const PHASES = [
    { key: 'start_game_items', label: 'Starting Items', upgradeOnly: false },
    { key: 'early_game_items', label: 'Early Game',     upgradeOnly: false },
    { key: 'mid_game_items',   label: 'Core',           upgradeOnly: true  },
    { key: 'late_game_items',  label: 'Late Game',      upgradeOnly: true  },
  ]

  const SKIP = new Set(['tpscroll', 'ward_observer', 'ward_sentry'])
  const seenAcrossPhases = new Set<string>()

  // Recursively collect all components of an item
  const allComponents = (key: string, visited = new Set<string>()): Set<string> => {
    if (visited.has(key)) return visited
    visited.add(key)
    for (const comp of componentsMap.get(key) ?? []) allComponents(comp, visited)
    return visited
  }

  return PHASES.map(({ key, label, upgradeOnly }) => {
    const phase = raw[key] ?? {}
    const candidates = Object.entries(phase)
      .map(([id, count]) => ({ key: itemIdMap.get(Number(id)) ?? '', count }))
      .filter(i => i.key && !i.key.includes('recipe') && !SKIP.has(i.key))
      .filter(i => !upgradeOnly || !basicItemKeys.has(i.key))
      .filter(i => !seenAcrossPhases.has(i.key))
      .sort((a, b) => b.count - a.count)

    // Greedily pick, skipping components of already-picked items in this phase
    const blocked = new Set<string>()
    const result: { key: string; count: number }[] = []

    for (const item of candidates) {
      if (blocked.has(item.key)) continue
      result.push(item)
      seenAcrossPhases.add(item.key)
      // Block all components (recursive) of this item within this phase
      for (const comp of allComponents(item.key)) blocked.add(comp)
      if (result.length >= 6) break
    }

    return { phase: key, label, items: result }
  }).filter(p => p.items.length > 0)
}

export interface HeroItemUsage {
  hero: HeroData
  phase: string
  count: number
}

export async function fetchHeroesForItem(itemId: number): Promise<HeroItemUsage[]> {
  const heroes = await fetchAllHeroes()

  const results = await Promise.allSettled(
    heroes.map(async hero => {
      const res = await fetch(`https://api.opendota.com/api/heroes/${hero.id}/itemPopularity`, {
        next: { revalidate: 86400 },
      })
      if (!res.ok) return null
      const raw: Record<string, Record<string, number>> = await res.json()
      return { hero, raw }
    })
  )

  const PHASE_LABELS: Record<string, string> = {
    start_game_items: 'Starting',
    early_game_items: 'Early',
    mid_game_items:   'Core',
    late_game_items:  'Late',
  }

  const usage: HeroItemUsage[] = []

  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value) continue
    const { hero, raw } = result.value

    let bestCount = 0
    let bestPhase = ''
    for (const [phaseKey, phaseLabel] of Object.entries(PHASE_LABELS)) {
      const count = raw[phaseKey]?.[String(itemId)] ?? 0
      if (count > bestCount) { bestCount = count; bestPhase = phaseLabel }
    }

    if (bestCount > 0) usage.push({ hero, phase: bestPhase, count: bestCount })
  }

  return usage.sort((a, b) => b.count - a.count).slice(0, 8)
}

// Use a high match_id floor to limit the scan to recent matches (avoids full-table timeout)
const RECENT_MATCH_FLOOR = 7700000000

export async function fetchNeutralItemHeroes(itemId: number): Promise<{ hero: HeroData; count: number }[]> {
  const sql = encodeURIComponent(
    `SELECT hero_id, count(*) AS games FROM player_matches WHERE item_neutral = ${itemId} AND hero_id IS NOT NULL AND match_id > ${RECENT_MATCH_FLOOR} GROUP BY hero_id ORDER BY games DESC LIMIT 8`
  )
  const res = await fetch(`https://api.opendota.com/api/explorer?sql=${sql}`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) return []
  const data: { rows?: { hero_id: number; games: number }[] } = await res.json()
  if (!data.rows?.length) return []

  const heroes = await fetchAllHeroes()
  const heroById = new Map(heroes.map(h => [h.id, h]))
  return data.rows
    .map(r => ({ hero: heroById.get(r.hero_id)!, count: r.games }))
    .filter(r => r.hero)
}

export async function fetchHeroNeutralItems(heroId: number): Promise<{ itemId: number; count: number }[]> {
  const sql = encodeURIComponent(
    `SELECT item_neutral, count(*) AS games FROM player_matches WHERE hero_id = ${heroId} AND item_neutral IS NOT NULL AND item_neutral != 0 AND match_id > ${RECENT_MATCH_FLOOR} GROUP BY item_neutral ORDER BY games DESC LIMIT 6`
  )
  const res = await fetch(`https://api.opendota.com/api/explorer?sql=${sql}`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) return []
  const data: { rows?: { item_neutral: number; games: number }[] } = await res.json()
  return (data.rows ?? []).map(r => ({ itemId: r.item_neutral, count: r.games }))
}

export async function fetchHeroMatchups(heroId: number): Promise<HeroMatchup[]> {
  const res = await fetch(`https://api.opendota.com/api/heroes/${heroId}/matchups`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error('Failed to fetch hero matchups')
  const data: Array<{ hero_id: number; games_played: number; wins: number }> = await res.json()
  return data
    .filter(m => m.games_played >= 100)
    .map(m => ({ ...m, win_rate: m.wins / m.games_played }))
}

/**
 * Build a map of { talentAbilityName → { paramName → value } } by scanning
 * the main abilities' special_values.bonuses arrays. The Valve datafeed stores
 * talent bonus values there rather than in the talent ability itself.
 *
 * e.g. chaos_knight_chaos_strike.special_values has:
 *   { name: "lifesteal", bonuses: [{ name: "special_bonus_unique_chaos_knight_6", value: 30 }] }
 * → map["special_bonus_unique_chaos_knight_6"]["bonus_lifesteal"] = 30
 */
export function buildTalentValueMap(abilities: ValveAbility[]): Record<string, Record<string, number>> {
  const map: Record<string, Record<string, number>> = {}
  for (const ability of abilities) {
    for (const sv of ability.special_values) {
      for (const bonus of (sv.bonuses ?? [])) {
        if (!bonus.name.startsWith('special_bonus_')) continue
        if (!map[bonus.name]) map[bonus.name] = {}
        map[bonus.name][`bonus_${sv.name.toLowerCase()}`] = bonus.value
      }
    }
  }
  return map
}

/** Resolve a talent's name_loc using both its own special_values and the cross-ability value map */
export function resolveTalentName(
  nameLocTemplate: string,
  talent: ValveAbility,
  valueMap: Record<string, Record<string, number>>
): string {
  if (!nameLocTemplate) return ''
  // Step 1: resolve tokens that are in the talent's own special_values
  const afterOwn = interpolateAbilityDesc(nameLocTemplate, talent.special_values)
  // Step 2: resolve any remaining {s:...} tokens using the cross-ability bonus map
  if (!afterOwn.includes('{s:') && !afterOwn.includes('%')) return afterOwn
  const values = valueMap[talent.name] ?? {}
  const lookup = (key: string): string | undefined => {
    const k = key.toLowerCase()
    const v = values[k] ?? values[`bonus_${k}`] ?? values[k.replace(/^bonus_/, '')]
    return v !== undefined ? String(v) : undefined
  }
  return afterOwn
    .replace(/\{s:([^}]+)\}/g, (match, key) => lookup(key) ?? match)
    .replace(/%%|%([^%]+)%/g, (match, key) => key ? (lookup(key) ?? match) : '%')
}

export async function fetchHeroDetail(heroId: number): Promise<ValveHeroDetail> {
  const res = await fetch(`${VALVE_BASE}/herodata?language=english&hero_id=${heroId}`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error('Failed to fetch hero detail')
  const json = await res.json()
  return json.result.data.heroes[0] as ValveHeroDetail
}
