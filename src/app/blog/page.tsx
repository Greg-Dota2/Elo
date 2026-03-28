import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Dota 2 match analysis, tournament breakdowns, and meta reads by Greg Spencer — a former semi-pro tracking Tier 1 Dota 2.',
  openGraph: {
    title: 'Blog | Dota2ProTips',
    description: 'Dota 2 match analysis, tournament breakdowns, and meta reads by Greg Spencer — a former semi-pro tracking Tier 1 Dota 2.',
    url: '/blog',
  },
  twitter: {
    card: 'summary',
    title: 'Blog | Dota2ProTips',
    description: 'Dota 2 match analysis, tournament breakdowns, and meta reads by Greg Spencer — a former semi-pro tracking Tier 1 Dota 2.',
  },
  alternates: { canonical: '/blog' },
}

export default async function BlogPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('title, slug, excerpt, cover_image_url, published_at, created_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  return (
    <div className="fade-in-up max-w-3xl mx-auto py-8">
      <p className="section-label mb-3">Articles</p>
      <h1 className="font-display text-4xl font-black tracking-tight mb-2">Blog</h1>
      <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>
        Dota 2 analysis, tournament breakdowns, and my thoughts on the meta.
      </p>

      {!posts?.length ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No posts yet — check back soon.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl overflow-hidden transition-opacity hover:opacity-90"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {post.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  loading="lazy"
                  src={post.cover_image_url}
                  alt={post.title}
                  className="w-full object-cover"
                  style={{ maxHeight: 220 }}
                />
              )}
              <div className="p-6">
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  {new Date(post.published_at ?? post.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
                <h2 className="font-display text-xl font-black mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-sm leading-6 line-clamp-2 mb-4" style={{ color: 'var(--text-muted)' }}>
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Greg.jpg" alt="Greg Spencer" className="w-7 h-7 rounded-full object-cover shrink-0" />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Greg Spencer</span>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                    Read more →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
