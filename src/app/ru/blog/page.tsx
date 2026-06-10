import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 86400

const SITE_URL = 'https://www.dota2protips.com'

export const metadata: Metadata = {
  title: 'Аналитика Dota 2 — Блог | Dota2ProTips',
  description: 'Разборы матчей, аналитика меты и обзоры турниров от человека, который смотрит каждую игру. Честная аналитика Dota 2 от Грега.',
  alternates: {
    canonical: `${SITE_URL}/ru/blog`,
    languages: {
      'en': `${SITE_URL}/blog`,
      'ru': `${SITE_URL}/ru/blog`,
      'x-default': `${SITE_URL}/blog`,
    },
  },
  openGraph: {
    title: 'Аналитика Dota 2 — Блог',
    description: 'Разборы матчей, аналитика меты и обзоры турниров от человека, который смотрит каждую игру.',
    url: `${SITE_URL}/ru/blog`,
  },
}

export default async function RuBlogPage() {
  const supabase = createAdminClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('title, title_ru, slug, excerpt, excerpt_ru, cover_image_url, published_at, created_at, tags')
    .eq('is_published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  return (
    <div className="fade-in-up max-w-5xl mx-auto py-8">

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <p className="section-label mb-3">Статьи</p>
          <h1 className="font-display text-4xl font-black tracking-tight mb-2">Блог</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Аналитика Dota 2, разборы турниров и мысли о мете.
          </p>
        </div>
        <Link
          href="/blog"
          className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-90 mt-1"
          style={{ background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))' }}
        >
          <span>🇬🇧</span>
          <span>English</span>
        </Link>
      </div>

      {!posts || posts.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Статей пока нет — заходите позже.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {posts.map(post => {
            const title = post.title_ru ?? post.title
            const excerpt = post.excerpt_ru ?? post.excerpt
            return (
              <Link
                key={post.slug}
                href={`/ru/blog/${post.slug}`}
                className="group flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-primary/40"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {post.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    loading="lazy"
                    src={post.cover_image_url}
                    alt={title}
                    className="w-full h-44 object-cover shrink-0 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-44 shrink-0" style={{ background: 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--card)))' }} />
                )}
                <div className="p-5 flex flex-col flex-1">
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(post.tags as string[]).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                          style={{ background: 'hsl(var(--primary) / 0.08)', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.2)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    {new Date(post.published_at ?? post.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                  <h2 className="font-display text-lg font-black leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {title}
                  </h2>
                  {excerpt && (
                    <p className="text-sm leading-6 line-clamp-3 mb-4" style={{ color: 'var(--text-muted)' }}>
                      {excerpt}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/Greg.jpg" alt="Greg Spencer" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Greg Spencer</span>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                      Читать →
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
