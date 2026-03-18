import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const SITE_URL = 'https://dota2protips.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()

  const [{ data: tournaments }, { data: teams }, { data: players }] = await Promise.all([
    supabase.from('tournaments').select('slug, updated_at').eq('is_published', true),
    supabase.from('teams').select('slug, created_at').not('slug', 'is', null),
    supabase.from('players').select('slug, created_at').eq('is_published', true).not('slug', 'is', null),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/tournaments`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/teams`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/players`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/rankings`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
  ]

  const tournamentRoutes: MetadataRoute.Sitemap = (tournaments ?? []).map(t => ({
    url: `${SITE_URL}/tournaments/${t.slug}`,
    lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
    changeFrequency: 'daily',
    priority: 0.85,
  }))

  const teamRoutes: MetadataRoute.Sitemap = (teams ?? []).map(t => ({
    url: `${SITE_URL}/teams/${t.slug}`,
    lastModified: t.created_at ? new Date(t.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const playerRoutes: MetadataRoute.Sitemap = (players ?? []).map(p => ({
    url: `${SITE_URL}/players/${p.slug}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...tournamentRoutes, ...teamRoutes, ...playerRoutes]
}
