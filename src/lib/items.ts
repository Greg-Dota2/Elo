const OPENDOTA_BASE = 'https://api.opendota.com/api/constants'

export type ItemCategory = 'consumable' | 'basic' | 'upgrade' | 'neutral'

export interface ItemData {
  key: string
  id: number
  dname: string
  cost: number
  img: string
  qual: string | null
  lore: string | null
  cd: number | false
  mc: number | false
  category: ItemCategory
  abilities: { type: string; title: string; description: string }[]
  attrib: { key: string; display?: string; value: string }[]
  components: string[] | null
}

const ROSHAN_DROPS = new Set(['aegis', 'cheese', 'refresher_shard', 'aghanims_blessing'])

// Items removed from the game that still appear in OpenDota's constants
const REMOVED_ITEMS = new Set([
  'wraith_pact', 'falcon_blade', 'diffusal_blade_2',
  'courier', 'flying_courier', 'mutation_tombstone',
  'pocket_tower', 'pocket_roshan',
])

export async function fetchAllItems(): Promise<ItemData[]> {
  const res = await fetch(`${OPENDOTA_BASE}/items`, { next: { revalidate: 86400 } })
  if (!res.ok) throw new Error('Failed to fetch items')
  const raw: Record<string, {
    id: number; dname?: string; qual?: string; cost?: number | null
    img?: string; lore?: string; cd?: number | false; mc?: number | false
    abilities?: { type: string; title: string; description: string }[]
    attrib?: { key: string; display?: string; value: string }[]
    components?: string[] | null
  }> = await res.json()

  const items: ItemData[] = []

  for (const [key, v] of Object.entries(raw)) {
    // Skip recipes, unnamed, Roshan drops
    if (key.includes('recipe')) continue
    if (!v.dname) continue
    if (ROSHAN_DROPS.has(key)) continue
    // Skip removed items and old cosmetic/event key prefixes
    if (REMOVED_ITEMS.has(key)) continue
    if (key.startsWith('river_painter') || key.startsWith('enhancement_')) continue
    // Skip null-qual cost=0 items without abilities — these are pre-7.28 removed neutral items
    if ((v.cost === 0 || v.cost == null) && !v.qual && !v.abilities) continue

    const qual = v.qual?.split(';')[0] ?? null

    let category: ItemCategory
    if (qual === 'consumable') {
      category = 'consumable'
    } else if (qual === 'component' || qual === 'secret_shop') {
      category = 'basic'
    } else if (qual === 'common' || qual === 'rare' || qual === 'epic') {
      category = 'upgrade'
    } else if (v.cost === 0 || v.cost == null) {
      category = 'neutral'
    } else {
      category = 'upgrade' // catch-all for items with cost but no known qual
    }

    items.push({
      key,
      id: v.id,
      dname: v.dname,
      cost: v.cost ?? 0,
      img: v.img ?? '',
      qual,
      lore: v.lore || null,
      cd: v.cd ?? false,
      mc: v.mc ?? false,
      category,
      abilities: v.abilities ?? [],
      attrib: v.attrib ?? [],
      components: v.components ?? null,
    })
  }

  return items.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost
    return a.dname.localeCompare(b.dname)
  })
}

export const itemIconUrl = (key: string) =>
  `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${key}.png`

export async function fetchItemByKey(key: string): Promise<ItemData | null> {
  const items = await fetchAllItems()
  return items.find(i => i.key === key) ?? null
}

export async function fetchItemIdMap(): Promise<Map<number, string>> {
  const res = await fetch(`${OPENDOTA_BASE}/item_ids`, { next: { revalidate: 86400 } })
  if (!res.ok) return new Map()
  const raw: Record<string, string> = await res.json()
  return new Map(Object.entries(raw).map(([id, key]) => [Number(id), key]))
}
