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

const TAG_STYLES: Record<string, { inactive: string; active: string; pill: string }> = {
  'Tournament Preview':  {
    inactive: 'text-sky-400/80 bg-sky-400/10 border-sky-400/30 hover:text-sky-400 hover:bg-sky-400/15 hover:border-sky-400/50',
    active:   'text-sky-400 bg-sky-400/20 border-sky-400/50',
    pill:     'bg-sky-400/10 text-sky-400 border-sky-400/20',
  },
  'Tournament Aftermath': {
    inactive: 'text-violet-400/80 bg-violet-400/10 border-violet-400/30 hover:text-violet-400 hover:bg-violet-400/15 hover:border-violet-400/50',
    active:   'text-violet-400 bg-violet-400/20 border-violet-400/50',
    pill:     'bg-violet-400/10 text-violet-400 border-violet-400/20',
  },
  'Team Analysis': {
    inactive: 'text-blue-400/80 bg-blue-400/10 border-blue-400/30 hover:text-blue-400 hover:bg-blue-400/15 hover:border-blue-400/50',
    active:   'text-blue-400 bg-blue-400/20 border-blue-400/50',
    pill:     'bg-blue-400/10 text-blue-400 border-blue-400/20',
  },
  'Player Analysis': {
    inactive: 'text-cyan-400/80 bg-cyan-400/10 border-cyan-400/30 hover:text-cyan-400 hover:bg-cyan-400/15 hover:border-cyan-400/50',
    active:   'text-cyan-400 bg-cyan-400/20 border-cyan-400/50',
    pill:     'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  },
  'Hero Analysis': {
    inactive: 'text-emerald-400/80 bg-emerald-400/10 border-emerald-400/30 hover:text-emerald-400 hover:bg-emerald-400/15 hover:border-emerald-400/50',
    active:   'text-emerald-400 bg-emerald-400/20 border-emerald-400/50',
    pill:     'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  },
  'Item Guide': {
    inactive: 'text-amber-400/80 bg-amber-400/10 border-amber-400/30 hover:text-amber-400 hover:bg-amber-400/15 hover:border-amber-400/50',
    active:   'text-amber-400 bg-amber-400/20 border-amber-400/50',
    pill:     'bg-amber-400/10 text-amber-400 border-amber-400/20',
  },
  'Meta Analysis': {
    inactive: 'text-orange-400/80 bg-orange-400/10 border-orange-400/30 hover:text-orange-400 hover:bg-orange-400/15 hover:border-orange-400/50',
    active:   'text-orange-400 bg-orange-400/20 border-orange-400/50',
    pill:     'bg-orange-400/10 text-orange-400 border-orange-400/20',
  },
  'News': {
    inactive: 'text-rose-400/80 bg-rose-400/10 border-rose-400/30 hover:text-rose-400 hover:bg-rose-400/15 hover:border-rose-400/50',
    active:   'text-rose-400 bg-rose-400/20 border-rose-400/50',
    pill:     'bg-rose-400/10 text-rose-400 border-rose-400/20',
  },
  'Opinion': {
    inactive: 'text-slate-400/80 bg-slate-400/10 border-slate-400/30 hover:text-slate-400 hover:bg-slate-400/15 hover:border-slate-400/50',
    active:   'text-slate-400 bg-slate-400/20 border-slate-400/50',
    pill:     'bg-slate-400/10 text-slate-400 border-slate-400/20',
  },
}

const DEFAULT_TAG_STYLES = {
  inactive: 'text-primary/80 bg-primary/10 border-primary/30 hover:text-primary hover:bg-primary/15 hover:border-primary/50',
  active:   'text-primary bg-primary/20 border-primary/50',
  pill:     'bg-primary/10 text-primary border-primary/20',
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
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${activeTag === null ? 'text-foreground bg-secondary border-border' : 'text-muted-foreground border-border/60 hover:text-foreground hover:border-border hover:bg-secondary/40'}`}
          >
            All
          </button>
          {usedTags.map(tag => {
            const styles = TAG_STYLES[tag] ?? DEFAULT_TAG_STYLES
            const isActive = activeTag === tag
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(isActive ? null : tag)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${isActive ? styles.active : styles.inactive}`}
              >
                {tag}
              </button>
            )
          })}
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
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${(TAG_STYLES[tag] ?? DEFAULT_TAG_STYLES).pill}`}
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
