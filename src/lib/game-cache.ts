import { createAdminClient } from './supabase/admin'
import type { HeroData } from './heroes'
import type { ItemData } from './items'

type CacheKey = 'heroes' | 'items'

async function readCache<T>(key: CacheKey): Promise<T | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('game_cache')
      .select('data')
      .eq('key', key)
      .single()
    if (error || !data) return null
    return data.data as T
  } catch {
    return null
  }
}

async function writeCache<T>(key: CacheKey, value: T): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('game_cache').upsert({
    key,
    data: value,
    refreshed_at: new Date().toISOString(),
  })
}

export async function getCachedHeroes(): Promise<HeroData[] | null> {
  return readCache<HeroData[]>('heroes')
}

export async function getCachedItems(): Promise<ItemData[] | null> {
  return readCache<ItemData[]>('items')
}

export async function setCachedHeroes(heroes: HeroData[]): Promise<void> {
  await writeCache('heroes', heroes)
}

export async function setCachedItems(items: ItemData[]): Promise<void> {
  await writeCache('items', items)
}

export async function setCachedHeroDetail(heroId: number, detail: unknown, language = 'english'): Promise<void> {
  const supabase = createAdminClient()
  const key = language === 'english' ? `hero_detail_${heroId}` : `hero_detail_${heroId}_${language}`
  await supabase.from('opendota_cache').upsert({
    key,
    data: detail,
    fetched_at: new Date().toISOString(),
  })
}
