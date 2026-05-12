import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import GroupStageView, { type GroupData } from '@/components/GroupStageView'
import PSBracketView from '@/components/PSBracketView'
import TweetEmbed from '@/components/TweetEmbed'
import HeroCard from '@/components/HeroCard'
import TeamCard from '@/components/TeamCard'
import PlayerCard from '@/components/PlayerCard'
import ItemCard from '@/components/ItemCard'
import { fetchGroupsFromDB } from '@/lib/groupStageDB'

function autoLink(content: string, entities: Array<{ name: string; url: string }>): string {
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length)
  for (const { name, url } of sorted) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(?<!\\[)\\b${escaped}\\b(?![^[]*?\\]\\()`)
    content = content.replace(regex, `[${name}](${url})`)
  }
  return content
}

export const revalidate = 300

const SITE_URL = 'https://www.dota2protips.com'

// Same shortcode parser as the English blog page
type Segment =
  | { type: 'markdown'; content: string }
  | { type: 'group-stage'; slug: string }
  | { type: 'playoff-bracket'; slug: string }
  | { type: 'tweet'; url: string }
  | { type: 'hero'; slug: string }
  | { type: 'team'; slug: string }
  | { type: 'player'; slug: string }
  | { type: 'item'; key: string }

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = []
  const rx = /\[(group-stage|playoff-bracket):([^\]]+)\]|\[tweet:([^\]]+)\]|\[hero:([^\]]+)\]|\[team:([^\]]+)\]|\[player:([^\]]+)\]|\[item:([^\]]+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = rx.exec(content)) !== null) {
    if (m.index > last) segments.push({ type: 'markdown', content: content.slice(last, m.index) })
    if (m[1]) {
      segments.push({ type: m[1] as 'group-stage' | 'playoff-bracket', slug: m[2].trim() })
    } else if (m[3]) {
      segments.push({ type: 'tweet', url: m[3].trim() })
    } else if (m[4]) {
      segments.push({ type: 'hero', slug: m[4].trim() })
    } else if (m[5]) {
      segments.push({ type: 'team', slug: m[5].trim() })
    } else if (m[6]) {
      segments.push({ type: 'player', slug: m[6].trim() })
    } else {
      segments.push({ type: 'item', key: m[7].trim() })
    }
    last = m.index + m[0].length
  }
  if (last < content.length) segments.push({ type: 'markdown', content: content.slice(last) })
  return segments
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, title_ru, excerpt, excerpt_ru, cover_image_url')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (!post) return { title: 'Статья не найдена' }
  const title = post.title_ru ?? post.title
  const description = post.excerpt_ru ?? post.excerpt ?? `Читайте "${title}" на Dota2ProTips.`
  return {
    title,
    description,
    openGraph: { title, description, ...(post.cover_image_url ? { images: [{ url: post.cover_image_url }] } : {}) },
    twitter: { card: post.cover_image_url ? 'summary_large_image' : 'summary', title, description },
    alternates: {
      canonical: `${SITE_URL}/ru/blog/${slug}`,
      languages: {
        'en': `${SITE_URL}/blog/${slug}`,
        'ru': `${SITE_URL}/ru/blog/${slug}`,
        'x-default': `${SITE_URL}/blog/${slug}`,
      },
    },
  }
}

export default async function RuBlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createAdminClient()
  const [{ data: post }, { data: teams }, { data: players }, { data: tournaments }] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('title, title_ru, excerpt, excerpt_ru, content, content_ru, cover_image_url, published_at, created_at, tags')
      .eq('slug', slug)
      .eq('is_published', true)
      .single(),
    supabase.from('teams').select('name, slug').not('slug', 'is', null),
    supabase.from('players').select('ign, slug').eq('is_published', true),
    supabase.from('tournaments').select('name, slug').not('slug', 'is', null),
  ])

  if (!post) notFound()

  const useAutoLink = new Date(post.created_at) < new Date('2026-04-20')
  const allEntities = useAutoLink ? [
    ...(teams ?? []).filter(t => t.slug).map(t => ({ name: t.name, url: `/ru/teams/${t.slug}` })),
    ...(players ?? []).filter(p => p.slug).map(p => ({ name: p.ign, url: `/ru/players/${p.slug}` })),
    ...(tournaments ?? []).filter(t => t.slug).map(t => ({ name: t.name, url: `/ru/tournaments/${t.slug}` })),
  ] : []

  const title = post.title_ru ?? post.title
  const excerpt = post.excerpt_ru ?? post.excerpt
  const content = post.content_ru ?? post.content ?? ''
  const isTranslated = !!post.content_ru

  const rawContent = content
    .replace(/^(#{1,6})([^\s#])/gm, '$1 $2')
    .replace(/\]\(\/(?!ru\/)/g, '](/ru/')
  const segments = parseSegments(rawContent)

  // Load DB group stage data for any group-stage/playoff-bracket shortcodes (no PandaScore calls)
  const tournamentSlugs = [...new Set(
    segments
      .filter(s => s.type === 'group-stage' || s.type === 'playoff-bracket')
      .map(s => (s as { slug: string }).slug)
  )]
  const groupsDataMap: Record<string, GroupData[]> = Object.fromEntries(
    await Promise.all(tournamentSlugs.map(async ts => [ts, await fetchGroupsFromDB(ts).catch(() => [])]))
  )

  const mdComponents = {
    h1: ({ children }: any) => <h2 className="font-display text-3xl font-black mt-8 mb-4" style={{ color: 'var(--text)' }}>{children}</h2>,
    h2: ({ children }: any) => <h2 className="font-display text-2xl font-bold mt-8 mb-3" style={{ color: 'var(--text)' }}>{children}</h2>,
    h3: ({ children }: any) => <h3 className="font-display text-xl font-bold mt-6 mb-2" style={{ color: 'hsl(var(--primary))' }}>{children}</h3>,
    p: ({ children }: any) => <p className="text-base leading-8 mb-5" style={{ color: 'var(--text)' }}>{children}</p>,
    strong: ({ children }: any) => <strong className="font-bold" style={{ color: 'var(--text)' }}>{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    ul: ({ children }: any) => <ul className="list-disc pl-6 mb-5 flex flex-col gap-1.5" style={{ color: 'var(--text)' }}>{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-5 flex flex-col gap-1.5" style={{ color: 'var(--text)' }}>{children}</ol>,
    li: ({ children }: any) => <li className="text-base leading-7">{children}</li>,
    blockquote: ({ children }: any) => <blockquote className="border-l-4 pl-4 my-5 italic" style={{ borderColor: 'hsl(var(--primary))', color: 'var(--text-muted)' }}>{children}</blockquote>,
    hr: () => <hr className="my-8" style={{ borderColor: 'var(--border)' }} />,
    a: ({ href, children }: any) => {
      const finalHref = href && href.startsWith('/') && !href.startsWith('/ru/')
        ? `/ru${href}`
        : href
      return <a href={finalHref} className="underline hover:opacity-70 transition-opacity" style={{ color: 'hsl(var(--primary))' }}>{children}</a>
    },
    img: ({ src, alt }: any) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ''} className="max-w-full h-auto rounded-xl my-6 block mx-auto" loading="lazy" />
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead style={{ background: 'var(--surface-2)' }}>{children}</thead>,
    tbody: ({ children }: any) => <tbody>{children}</tbody>,
    tr: ({ children }: any) => <tr style={{ borderBottom: '1px solid var(--border)' }}>{children}</tr>,
    th: ({ children }: any) => <th className="text-left px-4 py-2 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{children}</th>,
    td: ({ children }: any) => <td className="px-4 py-2.5" style={{ color: 'var(--text)' }}>{children}</td>,
  }

  return (
    <div className="fade-in-up max-w-3xl mx-auto py-8">

      {!isTranslated && (
        <div className="rounded-xl px-4 py-3 mb-6 text-sm font-semibold flex items-center justify-between"
          style={{ background: 'hsl(45 100% 50% / 0.1)', border: '1px solid hsl(45 100% 50% / 0.25)', color: 'hsl(45 100% 60%)' }}>
          <span>Перевод этой статьи скоро появится.</span>
          <Link href={`/blog/${slug}`} className="text-xs underline hover:opacity-70">Читать на английском</Link>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Link href="/ru/blog" className="hover:text-white transition-colors">Блог</Link>
          <span>/</span>
          <span className="truncate">{title}</span>
        </div>
        <Link
          href={`/blog/${slug}`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-90 shrink-0"
          style={{ background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))' }}
        >
          <span>🇬🇧</span>
          <span>English</span>
        </Link>
      </div>

      {post.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" src={post.cover_image_url} alt={title}
          className="w-full rounded-2xl object-cover mb-8" style={{ maxHeight: 360 }} />
      )}

      {post.tags && (post.tags as string[]).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(post.tags as string[]).map((tag: string) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              style={{ background: 'hsl(var(--primary) / 0.08)', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.2)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <h1 className="font-display text-4xl font-black tracking-tight leading-tight mb-6">{title}</h1>

      {excerpt && (
        <p className="text-lg leading-8 mb-6 font-medium" style={{ color: 'var(--text-muted)' }}>{excerpt}</p>
      )}

      <div className="flex items-center gap-3 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Greg.jpg" alt="Greg Spencer" className="w-10 h-10 rounded-full object-cover shrink-0" />
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Greg Spencer</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(post.published_at ?? post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <hr className="mb-8" style={{ borderColor: 'var(--border)' }} />

      {segments.map((seg, i) => {
        if (seg.type === 'markdown') {
          return (
            <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={mdComponents}>
              {useAutoLink ? autoLink(seg.content, allEntities) : seg.content}
            </ReactMarkdown>
          )
        }
        const groups = groupsDataMap[(seg as any).slug] ?? []
        if (seg.type === 'group-stage') {
          const groupOnly = groups.filter(g => !/upper|lower|bracket|playoff|elimination|grand.?final/i.test(g.name) || /group/i.test(g.name))
          return <GroupStageView key={i} groups={groupOnly} locale="ru" />
        }
        if (seg.type === 'playoff-bracket') {
          return <PSBracketView key={i} groups={groups} locale="ru" />
        }
        if (seg.type === 'tweet') {
          return <TweetEmbed key={i} url={(seg as { type: 'tweet'; url: string }).url} />
        }
        if (seg.type === 'hero') {
          return <HeroCard key={i} slug={(seg as { type: 'hero'; slug: string }).slug} locale="ru" />
        }
        if (seg.type === 'team') {
          return <TeamCard key={i} slug={(seg as { type: 'team'; slug: string }).slug} locale="ru" />
        }
        if (seg.type === 'player') {
          return <PlayerCard key={i} slug={(seg as { type: 'player'; slug: string }).slug} locale="ru" />
        }
        if (seg.type === 'item') {
          return <ItemCard key={i} itemKey={(seg as { type: 'item'; key: string }).key} locale="ru" />
        }
        return null
      })}

      <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
        <Link href="/ru/blog" className="text-sm font-semibold hover:text-primary transition-colors" style={{ color: 'var(--text-muted)' }}>
          ← Назад к блогу
        </Link>
      </div>
    </div>
  )
}
