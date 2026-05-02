'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Post {
  title: string
  slug: string
  excerpt: string | null
  cover_image_url: string | null
  published_at: string | null
  created_at: string
  tags: string[] | null
}

const TAG_COLORS: Record<string, string> = {
  'Tournament Preview':  'bg-sky-400/10 text-sky-400 border-sky-400/20',
  'Tournament Aftermath':'bg-violet-400/10 text-violet-400 border-violet-400/20',
  'Team Analysis':       'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Player Analysis':     'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  'Hero Analysis':       'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  'Item Guide':          'bg-amber-400/10 text-amber-400 border-amber-400/20',
  'Meta Analysis':       'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'News':                'bg-rose-400/10 text-rose-400 border-rose-400/20',
  'Opinion':             'bg-slate-400/10 text-slate-400 border-slate-400/20',
}

export default function BlogListClient({ posts }: { posts: Post[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null)

  // Collect all tags that appear in at least one post
  const usedTags = [...new Set(posts.flatMap(p => p.tags ?? []))].sort()

  const filtered = activeTag
    ? posts.filter(p => p.tags?.includes(activeTag))
    : posts

  if (!posts.length) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No posts yet — check back soon.</p>
  }

  return (
    <>
      {/* Tag filter bar */}
      {usedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTag(null)}
            className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
            style={activeTag === null
              ? { background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.4)' }
              : { background: 'var(--surface)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
            }
          >
            All
          </button>
          {usedTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${activeTag === tag ? (TAG_COLORS[tag] ?? 'bg-primary/10 text-primary border-primary/20') : 'border-border/50 text-muted-foreground hover:text-foreground'}`}
              style={activeTag === tag ? {} : { background: 'var(--surface)' }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>
          No posts tagged &ldquo;{activeTag}&rdquo; yet.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {filtered.map(post => (
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
              {/* Tags row */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.tags.map(tag => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${TAG_COLORS[tag] ?? 'bg-primary/10 text-primary border-primary/20'}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
    </>
  )
}
