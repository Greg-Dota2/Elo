import { createAdminClient } from '@/lib/supabase/admin'

export interface ItemGuide {
  item_key: string
  why_buy: string | null
  when_to_buy: string | null
  tips: string[]
  summary: string | null
  updated_at: string
}

export interface HeroGuide {
  hero_id: number
  when_to_pick: string | null
  tips: string[]
  summary: string | null
  updated_at: string
}

export async function fetchItemGuide(itemKey: string): Promise<ItemGuide | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('item_guides')
    .select('*')
    .eq('item_key', itemKey)
    .single()
  return data ?? null
}

export async function fetchHeroGuide(heroId: number): Promise<HeroGuide | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('hero_guides')
    .select('*')
    .eq('hero_id', heroId)
    .single()
  return data ?? null
}

export async function upsertItemGuide(
  itemKey: string,
  fields: { why_buy: string | null; when_to_buy: string | null; tips: string[]; summary: string | null }
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('item_guides')
    .upsert({ item_key: itemKey, ...fields, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function upsertHeroGuide(
  heroId: number,
  fields: { when_to_pick: string | null; tips: string[]; summary: string | null }
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('hero_guides')
    .upsert({ hero_id: heroId, ...fields, updated_at: new Date().toISOString() })
  if (error) throw error
}
