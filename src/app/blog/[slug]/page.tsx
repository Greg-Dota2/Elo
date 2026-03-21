import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, cover_image_url')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!post) return { title: 'Post Not Found' }
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      ...(post.cover_image_url ? { images: [{ url: post.cover_image_url }] } : {}),
    },
    alternates: { canonical: `/blog/${slug}` },
  }
}

// Replace team/player name mentions in markdown with links,
// skipping text that's already inside a markdown link [...](...).
function autoLink(
  content: string,
  entities: Array<{ name: string; url: string }>
): string {
  // Sort longest first to avoid partial matches (e.g. "Team Spirit" before "Spirit")
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length)

  for (const { name, url } of sorted) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match the name only when NOT already inside [...]
    const regex = new RegExp(`(?<!\\[)\\b${escaped}\\b(?![^[]*?\\]\\()`, 'g')
    content = content.replace(regex, `[${name}](${url})`)
  }
  return content
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: post }, { data: teams }, { data: players }] = await Promise.all([
    supabase.from('blog_posts').select('*').eq('slug', slug).eq('is_published', true).single(),
    admin.from('teams').select('name, slug').not('slug', 'is', null),
    admin.from('players').select('ign, slug').eq('is_published', true),
  ])

  if (!post) notFound()

  const entities = [
    ...(teams ?? []).map(t => ({ name: t.name, url: `/teams/${t.slug}` })),
    ...(players ?? []).map(p => ({ name: p.ign, url: `/players/${p.slug}` })),
  ]

  const processed = autoLink(
    (post.content ?? '').replace(/^(#{1,6})([^\s#])/gm, '$1 $2'),
    entities
  )

  const SITE_URL = 'https://dota2protips.com'

  return (
    <div className="fade-in-up max-w-2xl mx-auto py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.excerpt ?? undefined,
              image: post.cover_image_url ?? undefined,
              datePublished: post.published_at ?? post.created_at,
              dateModified: post.updated_at ?? post.published_at ?? post.created_at,
              author: { '@type': 'Person', name: 'Greg Spencer', url: SITE_URL },
              publisher: {
                '@type': 'Organization',
                name: 'Dota2ProTips',
                logo: { '@type': 'ImageObject', url: `${SITE_URL}/1.png` },
              },
              url: `${SITE_URL}/blog/${slug}`,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Blog', item: `${SITE_URL}/blog` },
                { '@type': 'ListItem', position: 2, name: post.title, item: `${SITE_URL}/blog/${slug}` },
              ],
            },
          ]),
        }}
      />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
        <span>/</span>
        <span className="truncate">{post.title}</span>
      </div>

      {/* Cover */}
      {post.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          loading="lazy"
          src={post.cover_image_url}
          alt={post.title}
          className="w-full rounded-2xl object-cover mb-8"
          style={{ maxHeight: 360 }}
        />
      )}

      {/* Header */}
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        {new Date(post.published_at ?? post.created_at).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </p>
      <h1 className="font-display text-4xl font-black tracking-tight leading-tight mb-6">{post.title}</h1>

      {post.excerpt && (
        <p className="text-lg leading-8 mb-8 font-medium" style={{ color: 'var(--text-muted)' }}>
          {post.excerpt}
        </p>
      )}

      <hr className="mb-8" style={{ borderColor: 'var(--border)' }} />

      {/* Body */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="font-display text-3xl font-black mt-8 mb-4" style={{ color: 'var(--text)' }}>{children}</h1>,
          h2: ({ children }) => <h2 className="font-display text-2xl font-bold mt-8 mb-3" style={{ color: 'var(--text)' }}>{children}</h2>,
          h3: ({ children }) => <h3 className="font-display text-xl font-bold mt-6 mb-2" style={{ color: 'hsl(var(--primary))' }}>{children}</h3>,
          p: ({ children }) => <p className="text-base leading-8 mb-5" style={{ color: 'var(--text)' }}>{children}</p>,
          strong: ({ children }) => <strong className="font-bold" style={{ color: 'var(--text)' }}>{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-5 flex flex-col gap-1.5" style={{ color: 'var(--text)' }}>{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-5 flex flex-col gap-1.5" style={{ color: 'var(--text)' }}>{children}</ol>,
          li: ({ children }) => <li className="text-base leading-7">{children}</li>,
          blockquote: ({ children }) => <blockquote className="border-l-4 pl-4 my-5 italic" style={{ borderColor: 'hsl(var(--primary))', color: 'var(--text-muted)' }}>{children}</blockquote>,
          hr: () => <hr className="my-8" style={{ borderColor: 'var(--border)' }} />,
          a: ({ href, children }) => <a href={href} className="underline hover:opacity-70 transition-opacity" style={{ color: 'hsl(var(--primary))' }}>{children}</a>,
          code: ({ children }) => <code className="px-1.5 py-0.5 rounded text-sm font-mono" style={{ background: 'var(--surface-2)', color: 'hsl(var(--primary))' }}>{children}</code>,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt ?? ''} className="w-full rounded-xl my-6 object-cover" loading="lazy" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead style={{ background: 'var(--surface-2)' }}>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr style={{ borderBottom: '1px solid var(--border)' }}>{children}</tr>,
          th: ({ children }) => <th className="text-left px-4 py-2 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{children}</th>,
          td: ({ children }) => <td className="px-4 py-2.5" style={{ color: 'var(--text)' }}>{children}</td>,
        }}
      >
        {processed}
      </ReactMarkdown>

      {/* Back */}
      <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
        <Link href="/blog" className="text-sm font-semibold hover:text-primary transition-colors" style={{ color: 'var(--text-muted)' }}>
          ← Back to Blog
        </Link>
      </div>
    </div>
  )
}
