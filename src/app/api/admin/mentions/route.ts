import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllHeroes, heroSlug } from '@/lib/heroes'
import { fetchAllItems } from '@/lib/items'

export async function GET() {
  const supabase = createAdminClient()

  const [{ data: teams }, { data: players }, heroes, items] = await Promise.all([
    supabase.from('teams').select('name, slug').eq('is_active', true).order('name'),
    supabase.from('players').select('ign, slug').order('ign'),
    fetchAllHeroes().catch(() => []),
    fetchAllItems().catch(() => []),
  ])

  const entities = [
    ...(teams ?? []).filter(t => t.slug).map(t => ({ label: t.name, href: `/teams/${t.slug}`, type: 'team' as const })),
    ...(players ?? []).filter(p => p.ign && p.slug).map(p => ({ label: p.ign, href: `/players/${p.slug}`, type: 'player' as const })),
    ...heroes.map(h => ({ label: h.localized_name, href: `/heroes/${heroSlug(h.name)}`, type: 'hero' as const })),
    ...items.map(i => ({ label: i.dname, href: `/items/${i.key}`, type: 'item' as const })),
  ]

  return NextResponse.json(entities)
}
