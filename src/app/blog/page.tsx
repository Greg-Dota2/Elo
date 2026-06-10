import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import BlogListClient from './BlogListClient'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Dota 2 Analysis & Tournament Breakdowns',
  description: 'Match breakdowns, meta analysis, and tournament recaps from someone who watches every single game. No generic takes — just honest Dota 2 writing from Greg at Dota2ProTips.',
  keywords: ['Dota 2 analysis', 'Dota 2 blog', 'Dota 2 tournament breakdown', 'Dota 2 meta', 'pro Dota 2 predictions'],
  openGraph: {
    title: 'Dota 2 Analysis & Tournament Breakdowns',
    description: 'Match breakdowns, meta analysis, and tournament recaps from someone who watches every single game. No generic takes — just honest Dota 2 writing from Greg at Dota2ProTips.',
    url: '/blog',
  },
  twitter: {
    card: 'summary',
    title: 'Dota 2 Analysis & Tournament Breakdowns',
    description: 'Match breakdowns, meta analysis, and tournament recaps from someone who watches every single game. No generic takes — just honest Dota 2 writing from Greg.',
  },
  alternates: {
    canonical: 'https://www.dota2protips.com/blog',
    languages: {
      'en': 'https://www.dota2protips.com/blog',
      'ru': 'https://www.dota2protips.com/ru/blog',
      'x-default': 'https://www.dota2protips.com/blog',
    },
  },
}

export default async function BlogPage() {
  const supabase = createAdminClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('title, slug, excerpt, cover_image_url, published_at, created_at, tags')
    .eq('is_published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  return (
    <div className="fade-in-up max-w-5xl mx-auto py-8">
      <p className="section-label mb-3">Articles</p>
      <h1 className="font-display text-4xl font-black tracking-tight mb-2">Blog</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        Dota 2 analysis, tournament breakdowns, and my thoughts on the meta.
      </p>
      <BlogListClient posts={posts ?? []} />
    </div>
  )
}
