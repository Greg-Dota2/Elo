import type { MetadataRoute } from 'next'
import { fetchAllHeroes, heroSlug } from '@/lib/heroes'
import { fetchAllItems } from '@/lib/items'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 86400

const BASE = 'https://www.dota2protips.com'

const STATIC_PAGES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/',                  priority: 1.0, freq: 'daily'   },
  { path: '/heroes',            priority: 0.9, freq: 'weekly'  },
  { path: '/heroes/meta',       priority: 0.8, freq: 'daily'   },
  { path: '/items',             priority: 0.9, freq: 'weekly'  },
  { path: '/items/meta',        priority: 0.8, freq: 'daily'   },
  { path: '/players',           priority: 0.8, freq: 'weekly'  },
  { path: '/players/rankings',  priority: 0.7, freq: 'weekly'  },
  { path: '/teams',             priority: 0.8, freq: 'weekly'  },
  { path: '/rankings',          priority: 0.8, freq: 'weekly'  },
  { path: '/transfers',         priority: 0.7, freq: 'weekly'  },
  { path: '/track-record',      priority: 0.7, freq: 'weekly'  },
  { path: '/tournaments',       priority: 0.8, freq: 'weekly'  },
  { path: '/blog',              priority: 0.7, freq: 'weekly'  },
  { path: '/about',             priority: 0.5, freq: 'monthly' },
  { path: '/terms-of-use',      priority: 0.3, freq: 'monthly' },
]

function ruPath(path: string) {
  return path === '/' ? '/ru' : `/ru${path}`
}

function alt(enPath: string, ruPath: string) {
  return { languages: { 'x-default': `${BASE}${enPath}`, en: `${BASE}${enPath}`, ru: `${BASE}${ruPath}` } }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()

  const [heroes, items, teamsRes, playersRes, tournamentsRes, blogRes] = await Promise.all([
    fetchAllHeroes().catch(() => []),
    fetchAllItems().catch(() => []),
    supabase.from('teams').select('slug').eq('is_active', true).not('slug', 'is', null),
    supabase.from('players').select('slug').eq('is_published', true).not('slug', 'is', null),
    supabase.from('tournaments').select('slug, updated_at').eq('is_published', true).not('slug', 'is', null),
    supabase.from('blog_posts').select('slug, updated_at').eq('is_published', true).not('slug', 'is', null),
  ])

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, priority, freq }) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: freq,
    priority,
    alternates: alt(path, ruPath(path)),
  }))

  const heroEntries: MetadataRoute.Sitemap = heroes.map(hero => {
    const slug = heroSlug(hero.name)
    return {
      url: `${BASE}/heroes/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      alternates: alt(`/heroes/${slug}`, `/ru/heroes/${slug}`),
    }
  })

  const itemEntries: MetadataRoute.Sitemap = items.map(item => ({
    url: `${BASE}/items/${item.key}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
    alternates: alt(`/items/${item.key}`, `/ru/items/${item.key}`),
  }))

  const teamEntries: MetadataRoute.Sitemap = (teamsRes.data ?? []).map(({ slug }) => ({
    url: `${BASE}/teams/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
    alternates: alt(`/teams/${slug}`, `/ru/teams/${slug}`),
  }))

  const playerEntries: MetadataRoute.Sitemap = (playersRes.data ?? []).map(({ slug }) => ({
    url: `${BASE}/players/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
    alternates: alt(`/players/${slug}`, `/ru/players/${slug}`),
  }))

  const tournamentEntries: MetadataRoute.Sitemap = (tournamentsRes.data ?? []).map(({ slug, updated_at }) => ({
    url: `${BASE}/tournaments/${slug}`,
    lastModified: updated_at ? new Date(updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
    alternates: alt(`/tournaments/${slug}`, `/ru/tournaments/${slug}`),
  }))

  const blogEntries: MetadataRoute.Sitemap = (blogRes.data ?? []).map(({ slug, updated_at }) => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: updated_at ? new Date(updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    alternates: alt(`/blog/${slug}`, `/ru/blog/${slug}`),
  }))

  return [
    ...staticEntries,
    ...heroEntries,
    ...itemEntries,
    ...teamEntries,
    ...playerEntries,
    ...tournamentEntries,
    ...blogEntries,
  ]
}
