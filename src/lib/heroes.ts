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
  id: number
  name: string
  icon: string
  color: string
  title: string
  description: string
}

export interface ValveHeroDetail {
  id: number
  name: string
  name_loc: string
  bio_loc: string
  hype_loc: string
  abilities: ValveAbility[]
  facets: ValveFacet[]
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
  return text.replace(/%([^%]+)%/g, (match, key) => {
    const sv = lookup[key.toLowerCase()]
    if (!sv) return match
    const vals = sv.values_float.map(v => Math.round(v * 100) / 100)
    const formatted = formatLevelValues(vals)
    return sv.is_percentage ? formatted + '%' : formatted
  })
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

export async function fetchHeroDetail(heroId: number): Promise<ValveHeroDetail> {
  const res = await fetch(`${VALVE_BASE}/herodata?language=english&hero_id=${heroId}`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error('Failed to fetch hero detail')
  const json = await res.json()
  return json.result.data.heroes[0] as ValveHeroDetail
}
