import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import GroupStageView, { type GroupData } from '@/components/GroupStageView'
import PSBracketView from '@/components/PSBracketView'
import {
  fetchUpcomingTier1Matches,
  fetchRunningTier1Matches,
  fetchRecentTier1Matches,
  fetchTournamentStandings,
  fetchMatchesForSubTournament,
  type PSTeam,
  type PSMatch,
} from '@/lib/pandascore'

export const revalidate = 60

// ── Shortcode parsing ────────────────────────────────────────────────────────
type Segment =
  | { type: 'markdown'; content: string }
  | { type: 'group-stage'; slug: string }
  | { type: 'playoff-bracket'; slug: string }

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = []
  const rx = /\[(group-stage|playoff-bracket):([^\]]+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = rx.exec(content)) !== null) {
    if (m.index > last) segments.push({ type: 'markdown', content: content.slice(last, m.index) })
    segments.push({ type: m[1] as 'group-stage' | 'playoff-bracket', slug: m[2].trim() })
    last = m.index + m[0].length
  }
  if (last < content.length) segments.push({ type: 'markdown', content: content.slice(last) })
  return segments
}

// ── Tournament data fetcher (same logic as tournament page) ──────────────────
async function fetchGroupsForTournament(tournamentSlug: string): Promise<GroupData[]> {
  const slugify = (league: string, serie: string) =>
    `${league}-${serie}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const buildGroup = async (subId: number, subName: string, seed: PSMatch[]): Promise<GroupData> => {
    const [standings, allMatches] = await Promise.all([
      fetchTournamentStandings(subId).catch(() => []),
      fetchMatchesForSubTournament(subId).catch(() => seed),
    ])
    const record = new Map<number, { team: PSTeam; wins: number; draws: number; losses: number }>()
    const ensure = (t: PSTeam) => { if (!record.has(t.id)) record.set(t.id, { team: t, wins: 0, draws: 0, losses: 0 }) }
    for (const m of allMatches) {
      if (m.status !== 'finished' || m.results.length < 2) continue
      const [r1, r2] = m.results
      const t1 = m.opponents.find(o => o.opponent.id === r1.team_id)?.opponent
      const t2 = m.opponents.find(o => o.opponent.id === r2.team_id)?.opponent
      if (!t1 || !t2) continue
      ensure(t1); ensure(t2)
      if (r1.score > r2.score) { record.get(t1.id)!.wins++; record.get(t2.id)!.losses++ }
      else if (r2.score > r1.score) { record.get(t2.id)!.wins++; record.get(t1.id)!.losses++ }
      else { record.get(t1.id)!.draws++; record.get(t2.id)!.draws++ }
    }
    const computed = Array.from(record.values())
      .sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws))
      .map((r, i) => ({ rank: i + 1, team: r.team, wins: r.wins, draws: r.draws, losses: r.losses, total: r.wins + r.draws + r.losses }))
    const apiHasData = standings.length > 1 && standings.some(s => s.wins > 0 || s.losses > 0)
    const derived = apiHasData ? standings
      : computed.length > 1 ? computed
      : (() => {
          const seen = new Map<number, PSTeam>()
          for (const m of allMatches) for (const o of m.opponents) if (!seen.has(o.opponent.id)) seen.set(o.opponent.id, o.opponent)
          return Array.from(seen.values()).map((team, i) => ({ rank: i + 1, team, wins: 0, draws: 0, losses: 0, total: 0 }))
        })()
    return { id: subId, name: subName, standings: derived, matches: allMatches }
  }

  const [upcoming, running] = await Promise.all([
    fetchUpcomingTier1Matches(50).catch(() => []),
    fetchRunningTier1Matches(20).catch(() => []),
  ])
  const psMatches = [...running, ...upcoming].filter(m => slugify(m.league.name, m.serie.full_name) === tournamentSlug)

  const groupBy = (matches: PSMatch[]) =>
    matches.reduce<Record<string, PSMatch[]>>((acc, m) => {
      const k = String(m.tournament.id)
      if (!acc[k]) acc[k] = []
      acc[k].push(m)
      return acc
    }, {})

  if (psMatches.length > 0) {
    const by = groupBy(psMatches)
    return Promise.all(Object.entries(by).map(([id, ms]) => buildGroup(Number(id), ms[0].tournament.name, ms)))
      .then(gs => gs.filter(g => g.standings.length > 1))
  }

  const recent = await fetchRecentTier1Matches(100).catch(() => [])
  const finished = recent.filter(m => slugify(m.league.name, m.serie.full_name) === tournamentSlug)
  const by = groupBy(finished)
  return Promise.all(Object.entries(by).map(([id, ms]) => buildGroup(Number(id), ms[0].tournament.name, ms)))
    .then(gs => gs.filter(g => g.standings.length > 1))
}

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
    description: post.excerpt ?? `Read "${post.title}" on Dota2ProTips — Dota 2 analysis and match predictions by Greg Spencer.`,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? `Read "${post.title}" on Dota2ProTips — Dota 2 analysis and match predictions by Greg Spencer.`,
      ...(post.cover_image_url ? { images: [{ url: post.cover_image_url }] } : {}),
    },
    twitter: {
      card: post.cover_image_url ? 'summary_large_image' : 'summary',
      title: post.title,
      description: post.excerpt ?? `Read "${post.title}" on Dota2ProTips — Dota 2 analysis and match predictions by Greg Spencer.`,
      ...(post.cover_image_url ? { images: [post.cover_image_url] } : {}),
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
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length)
  for (const { name, url } of sorted) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(?<!\\[)\\b${escaped}\\b(?![^[]*?\\]\\()`)
    content = content.replace(regex, `[${name}](${url})`)
  }
  return content
}

function extractNodeText(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.value ?? ''
  if (Array.isArray(node.children)) return node.children.map(extractNodeText).join('')
  return ''
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: post }, { data: teams }, { data: players }, { data: tournaments }] = await Promise.all([
    supabase.from('blog_posts').select('*').eq('slug', slug).eq('is_published', true).single(),
    admin.from('teams').select('name, slug, image_url').not('slug', 'is', null),
    admin.from('players').select('ign, slug').eq('is_published', true),
    admin.from('tournaments').select('name, slug').not('slug', 'is', null),
  ])

  if (!post) notFound()

  const dbEntities = [
    ...(teams ?? []).map(t => ({ name: t.name, url: `/teams/${t.slug}` })),
    ...(players ?? []).map(p => ({ name: p.ign, url: `/players/${p.slug}` })),
    ...(tournaments ?? []).map(t => ({ name: t.name, url: `/tournaments/${t.slug}` })),
  ]

  const teamLogoMap = new Map<string, string>(
    (teams ?? [])
      .filter(t => t.slug && t.image_url)
      .map(t => [`/teams/${t.slug}`, t.image_url as string])
  )

  // Team name → url for fallback heading detection (DB only; PS teams added after fetch)
  const teamUrlByName = new Map<string, string>(
    (teams ?? []).filter(t => t.slug).map(t => [t.name.toLowerCase(), `/teams/${t.slug}`])
  )

  const rawContent = (post.content ?? '').replace(/^(#{1,6})([^\s#])/gm, '$1 $2')
  const segments = parseSegments(rawContent)

  // Fetch tournament data for any shortcode segments
  const tournamentSlugs = [...new Set(
    segments.filter(s => s.type !== 'markdown').map(s => (s as { slug: string }).slug)
  )]
  const groupsDataMap: Record<string, GroupData[]> = Object.fromEntries(
    await Promise.all(tournamentSlugs.map(async ts => [ts, await fetchGroupsForTournament(ts)]))
  )

  // Build supplemental team lookup from PandaScore data (covers teams not in the DB)
  const psTeamSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const psTeamMap = new Map<string, { imageUrl: string | null; url: string }>()
  for (const groups of Object.values(groupsDataMap)) {
    for (const group of groups) {
      for (const { team } of group.standings) {
        if (!psTeamMap.has(team.name.toLowerCase())) {
          psTeamMap.set(team.name.toLowerCase(), { imageUrl: team.image_url, url: `/teams/${psTeamSlug(team.name)}` })
        }
      }
    }
  }

  // Merge DB entities with PS teams (DB takes priority, PS fills in unknowns)
  const dbNames = new Set(dbEntities.map(e => e.name.toLowerCase()))
  const psEntities: { name: string; url: string }[] = []
  for (const groups of Object.values(groupsDataMap)) {
    for (const group of groups) {
      for (const { team } of group.standings) {
        if (!dbNames.has(team.name.toLowerCase()) && !psEntities.some(e => e.name.toLowerCase() === team.name.toLowerCase())) {
          psEntities.push({ name: team.name, url: `/teams/${psTeamSlug(team.name)}` })
        }
      }
    }
  }
  const allEntities = [...dbEntities, ...psEntities]

  const SITE_URL = 'https://dota2protips.com'

  const mdComponents = {
    h1: ({ children }: any) => <h2 className="font-display text-3xl font-black mt-8 mb-4" style={{ color: 'var(--text)' }}>{children}</h2>,
    h2: ({ children, node }: any) => {
      // Try link injected by autoLink first
      const firstChild = node?.children?.[0]
      let href: string | undefined =
        firstChild?.type === 'element' && firstChild.tagName === 'a'
          ? firstChild.properties?.href as string
          : undefined
      // Fallback: match raw heading text to DB team, then PandaScore team
      if (!href) {
        const text = extractNodeText(node).trim().toLowerCase()
        href = teamUrlByName.get(text) ?? psTeamMap.get(text)?.url
      }
      const text = extractNodeText(node).trim().toLowerCase()
      const logo = (href ? teamLogoMap.get(href) : undefined) ?? psTeamMap.get(text)?.imageUrl ?? undefined
      const needsWrapLink = href && !(firstChild?.type === 'element' && firstChild.tagName === 'a')
      return (
        <h2 className="font-display text-2xl font-bold mt-8 mb-3 flex items-center gap-2.5" style={{ color: 'var(--text)' }}>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="w-8 h-8 object-contain rounded shrink-0" style={{ background: 'rgba(255,255,255,0.06)', padding: '2px' }} />
          )}
          {needsWrapLink
            ? <a href={href} className="hover:opacity-80 transition-opacity">{children}</a>
            : children}
        </h2>
      )
    },
    h3: ({ children }: any) => <h3 className="font-display text-xl font-bold mt-6 mb-2" style={{ color: 'hsl(var(--primary))' }}>{children}</h3>,
    p: ({ children }: any) => <p className="text-base leading-8 mb-5" style={{ color: 'var(--text)' }}>{children}</p>,
    strong: ({ children }: any) => <strong className="font-bold" style={{ color: 'var(--text)' }}>{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    ul: ({ children }: any) => <ul className="list-disc pl-6 mb-5 flex flex-col gap-1.5" style={{ color: 'var(--text)' }}>{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-5 flex flex-col gap-1.5" style={{ color: 'var(--text)' }}>{children}</ol>,
    li: ({ children }: any) => <li className="text-base leading-7">{children}</li>,
    blockquote: ({ children }: any) => <blockquote className="border-l-4 pl-4 my-5 italic" style={{ borderColor: 'hsl(var(--primary))', color: 'var(--text-muted)' }}>{children}</blockquote>,
    hr: () => <hr className="my-8" style={{ borderColor: 'var(--border)' }} />,
    a: ({ href, children }: any) => <a href={href} className="underline hover:opacity-70 transition-opacity" style={{ color: 'hsl(var(--primary))' }}>{children}</a>,
    code: ({ children }: any) => <code className="px-1.5 py-0.5 rounded text-sm font-mono" style={{ background: 'var(--surface-2)', color: 'hsl(var(--primary))' }}>{children}</code>,
    img: ({ src, alt }: any) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ''} className="w-full rounded-xl my-6 object-cover" loading="lazy" />
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
    td: ({ children, node }: any) => {
      // Check if this cell contains a single team link — if so, prepend the logo
      const firstChild = node?.children?.[0]
      const href: string | undefined = firstChild?.type === 'element' && firstChild.tagName === 'a'
        ? firstChild.properties?.href as string
        : undefined
      const cellText = extractNodeText(node).trim().toLowerCase()
      const logo = (href ? teamLogoMap.get(href) : undefined)
        ?? psTeamMap.get(cellText)?.imageUrl
        ?? undefined
      return (
        <td className="px-4 py-2.5" style={{ color: 'var(--text)' }}>
          {logo ? (
            <span className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" className="w-5 h-5 object-contain rounded shrink-0" style={{ background: 'rgba(255,255,255,0.06)', padding: '1px' }} />
              {children}
            </span>
          ) : children}
        </td>
      )
    },
  }

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
      <h1 className="font-display text-4xl font-black tracking-tight leading-tight mb-6">{post.title}</h1>

      {post.excerpt && (
        <p className="text-lg leading-8 mb-6 font-medium" style={{ color: 'var(--text-muted)' }}>
          {post.excerpt}
        </p>
      )}

      {/* Author byline */}
      <div className="flex items-center gap-3 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Greg.jpg" alt="Greg Spencer" className="w-10 h-10 rounded-full object-cover shrink-0" />
        <div>
          <Link href="/about" className="text-xs font-semibold hover:text-primary transition-colors" style={{ color: 'var(--text)' }}>Greg Spencer</Link>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Ex semi-pro · watches every pro game, every tournament, no exceptions
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {new Date(post.published_at ?? post.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <hr className="mb-8" style={{ borderColor: 'var(--border)' }} />

      {/* Body — markdown segments interleaved with live tournament components */}
      {segments.map((seg, i) => {
        if (seg.type === 'markdown') {
          return (
            <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={mdComponents}>
              {autoLink(seg.content, allEntities)}
            </ReactMarkdown>
          )
        }
        const groups = groupsDataMap[(seg as any).slug] ?? []
        if (seg.type === 'group-stage') {
          const groupOnly = groups.filter(g => !/upper|lower|bracket|playoff|elimination|grand.?final/i.test(g.name) || /group/i.test(g.name))
          return <GroupStageView key={i} groups={groupOnly} />
        }
        if (seg.type === 'playoff-bracket') {
          return <PSBracketView key={i} groups={groups} />
        }
        return null
      })}

      {/* Back */}
      <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
        <Link href="/blog" className="text-sm font-semibold hover:text-primary transition-colors" style={{ color: 'var(--text-muted)' }}>
          ← Back to Blog
        </Link>
      </div>
    </div>
  )
}
