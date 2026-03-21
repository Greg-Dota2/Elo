import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllHeroes, heroSlug } from '@/lib/heroes'

const SITE_URL = 'https://dota2protips.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()

  const [{ data: tournaments }, { data: teams }, { data: players }] = await Promise.all([
    supabase.from('tournaments').select('slug').eq('is_published', true),
    supabase.from('teams').select('slug, created_at').not('slug', 'is', null),
    supabase.from('players').select('slug, created_at').eq('is_published', true).not('slug', 'is', null),
  ])

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('is_published', true)

  let heroes: Awaited<ReturnType<typeof fetchAllHeroes>> = []
  try {
    heroes = await fetchAllHeroes()
  } catch {
    // heroes optional — don't break sitemap if API is down
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/tournaments`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/teams`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/players`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/rankings`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/track-record`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/heroes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms-of-use`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  const heroRoutes: MetadataRoute.Sitemap = heroes.map(h => ({
    url: `${SITE_URL}/heroes/${heroSlug(h.name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  const tournamentRoutes: MetadataRoute.Sitemap = (tournaments ?? []).map(t => ({
    url: `${SITE_URL}/tournaments/${t.slug}`,
    lastModified: new Date(),
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

  const blogRoutes: MetadataRoute.Sitemap = (posts ?? []).map(p => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...heroRoutes, ...tournamentRoutes, ...teamRoutes, ...playerRoutes, ...blogRoutes]
}
