import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAllItems, fetchItemByKey, fetchComponentMap, itemIconUrl } from '@/lib/items'
import { fetchHeroesForItem, fetchNeutralItemHeroes, fetchAllHeroes, heroSlug, heroPortraitUrl, ATTR_CONFIG } from '@/lib/heroes'
import { fetchItemGuide } from '@/lib/guides'
import { getPlayers } from '@/lib/queries'
import type React from 'react'

export const revalidate = 86400

interface Props {
  params: Promise<{ key: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params
  const item = await fetchItemByKey(key)
  if (!item) return {}
  const title = `${item.dname} — Dota 2 Item Guide`
  const statSummary = item.attrib
    .slice(0, 2)
    .map(a => a.display ? a.display.replace('{val}', a.value) : '')
    .filter(Boolean)
    .join(', ')
  const costLine = item.cost > 0 ? `${item.dname} costs ${item.cost.toLocaleString()} gold.` : `${item.dname} —`
  const statPart = statSummary ? ` ${statSummary} —` : ' —'
  const description = `${costLine}${statPart} when to buy it, how to use it correctly, and the mistakes that are costing you fights. Full guide at Dota2ProTips.`.slice(0, 160)
  return {
    title,
    description,
    alternates: { canonical: `/items/${key}` },
    openGraph: { title, description, url: `/items/${key}`, images: [{ url: itemIconUrl(key), alt: item.dname }] },
    twitter: { card: 'summary', title, description, images: [itemIconUrl(key)] },
  }
}

// No generateStaticParams — items render on-demand via ISR (revalidate=86400).
// Pre-building all ~300 items at deploy time fires 124 OpenDota requests per item
// in parallel, which saturates the 60 req/min rate limit and causes build timeouts.

const CATEGORY_LABEL: Record<string, string> = {
  consumable: 'Consumable',
  basic: 'Basic',
  upgrade: 'Upgrade',
  neutral: 'Neutral',
}

export default async function ItemPage({ params }: Props) {
  const { key } = await params
  const [item, allItems, compMap] = await Promise.all([fetchItemByKey(key), fetchAllItems(), fetchComponentMap()])
  if (!item) notFound()

  const itemMap = new Map(allItems.map(i => [i.key, i]))
  const [heroUsage, guide, allHeroes, allPlayers] = await Promise.all([
    item.category === 'neutral'
      ? fetchNeutralItemHeroes(item.id).then(r => r.map(({ hero, count }) => ({ hero, phase: 'Neutral', count })))
      : fetchHeroesForItem(item.id),
    fetchItemGuide(key).catch(() => null),
    fetchAllHeroes().catch(() => [] as Awaited<ReturnType<typeof fetchAllHeroes>>),
    getPlayers().catch(() => []),
  ])

  const SITE_URL = 'https://www.dota2protips.com'

  // Unified entity map: display name (lowercase) → href. Current item excluded.
  const entityMap = new Map<string, string>()
  for (const i of allItems) {
    if (i.key !== key && i.dname) entityMap.set(i.dname.toLowerCase(), `/items/${i.key}`)
  }
  for (const h of allHeroes) {
    entityMap.set(h.localized_name.toLowerCase(), `/heroes/${heroSlug(h.name)}`)
  }
  for (const p of allPlayers) {
    if (p.ign && p.slug) entityMap.set(p.ign.toLowerCase(), `/players/${p.slug}`)
  }
  const entityPattern = new RegExp(
    `\\b(${[...entityMap.keys()].sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
  )

  function linkEntities(text: string, budget: { left: number }, seen: Set<string>): React.ReactNode {
    if (budget.left <= 0) return text
    const parts: React.ReactNode[] = []
    let last = 0
    let m: RegExpExecArray | null
    entityPattern.lastIndex = 0
    while ((m = entityPattern.exec(text)) !== null) {
      const k = m[0].toLowerCase()
      const href = entityMap.get(k)
      if (!href || seen.has(k) || budget.left <= 0) continue
      if (m.index > last) parts.push(text.slice(last, m.index))
      parts.push(
        <Link key={m.index} href={href} className="font-medium underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors" style={{ color: 'inherit' }}>
          {m[0]}
        </Link>
      )
      seen.add(k)
      budget.left--
      last = m.index + m[0].length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length ? <>{parts}</> : text
  }

  function splitGuideText(text: string): string[] {
    if (text.includes('\n\n')) return text.split('\n\n').filter(Boolean)
    const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z"'«])/)
    if (sentences.length <= 2) return [text]
    const paras: string[] = []
    let current = ''
    for (const s of sentences) {
      const joined = current ? `${current} ${s}` : s
      if (current && joined.length > 480) {
        paras.push(current.trim())
        current = s
      } else {
        current = joined
      }
    }
    if (current) paras.push(current.trim())
    return paras
  }

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Thing',
              name: item.dname,
              url: `${SITE_URL}/items/${key}`,
              image: itemIconUrl(key),
              ...(item.lore ? { description: item.lore } : {}),
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Items', item: `${SITE_URL}/items` },
                { '@type': 'ListItem', position: 2, name: item.dname, item: `${SITE_URL}/items/${key}` },
              ],
            },
          ]),
        }}
      />
      {/* Back */}
      <Link href="/items" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        All Items
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="rounded-xl overflow-hidden border border-border/60 bg-secondary/40 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={itemIconUrl(item.key)}
            alt={item.dname}
            className="w-24 h-[70px] object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="section-label mb-1">{CATEGORY_LABEL[item.category]}</p>
          <h1 className="text-3xl font-black tracking-tight mb-2">{item.dname}</h1>
          <div className="flex items-center gap-4 text-sm">
            {item.cost > 0 && (
              <span className="font-bold text-amber-400 tabular-nums">{item.cost.toLocaleString()} Gold</span>
            )}
            {item.cd !== false && item.cd > 0 && (
              <span className="text-muted-foreground">CD: {item.cd}s</span>
            )}
            {item.mc !== false && item.mc > 0 && (
              <span className="text-muted-foreground">Mana: {item.mc}</span>
            )}
          </div>
        </div>
      </div>

      {/* Attributes */}
      {item.attrib.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Stats</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {item.attrib.filter(a => a.display).map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {a.display!.replace('{value}', a.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Abilities */}
      {item.abilities.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Abilities</p>
          <div className="space-y-4">
            {item.abilities.map((ab, i) => (
              <div key={i}>
                {ab.title && (
                  <p className="text-sm font-semibold text-foreground mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">{ab.type}</span>
                    {ab.title}
                  </p>
                )}
                {!ab.title && ab.type && (
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{ab.type}</p>
                )}
                {ab.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{ab.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Components */}
      {item.components && item.components.length > 0 && (() => {
        const hasRecipeInData = item.components!.some(c => c.includes('recipe'))
        const componentTotal = item.components!.reduce((sum, c) => sum + (compMap.get(c)?.cost ?? 0), 0)
        const recipeCost = !hasRecipeInData && item.category === 'upgrade' && item.cost > 0
          ? item.cost - componentTotal
          : 0

        const renderChip = (comp: string, name: string, cost: number, navigable: boolean) => {
          const inner = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={itemIconUrl(comp)}
                alt={name}
                className="w-12 h-[35px] object-cover shrink-0"
              />
              <div className="flex flex-col pr-3">
                <span className="text-xs font-semibold text-foreground leading-tight">{name}</span>
                {cost > 0 && (
                  <span className="text-[11px] font-bold text-amber-400 tabular-nums">{cost.toLocaleString()} Gold</span>
                )}
              </div>
            </>
          )
          return navigable ? (
            <Link
              key={comp}
              href={`/items/${comp}`}
              className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/40 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 overflow-hidden"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={comp}
              className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/40 overflow-hidden"
            >
              {inner}
            </div>
          )
        }

        const chips = [
          ...item.components!.map(comp => {
            const compData = compMap.get(comp)
            const isRecipe = comp.includes('recipe')
            const name = compData?.dname ?? comp.replace(/_/g, ' ')
            const cost = compData?.cost ?? 0
            return renderChip(comp, name, cost, !isRecipe && itemMap.has(comp))
          }),
          ...(recipeCost > 0 ? [renderChip('recipe', 'Recipe', recipeCost, false)] : []),
        ]

        return (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Components</p>
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip, i) => (
                <div key={i} className="flex items-center gap-2">
                  {chip}
                  {i < chips.length - 1 && (
                    <span className="text-muted-foreground font-bold text-base select-none">+</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Guide */}
      {guide && (guide.why_buy || guide.when_to_buy || guide.tips.length > 0 || guide.summary) && (() => {
        const linkBudget = { left: 12 }
        const linkedEntities = new Set<string>()
        return (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">Strategy</p>
            <div className="space-y-6">
              {guide.why_buy && (
                <div>
                  <p className="text-sm font-bold text-foreground mb-3">Why Buy {item.dname}?</p>
                  <div className="space-y-3">
                    {splitGuideText(guide.why_buy).map((para: string, i: number) => (
                      <p key={i} className="text-sm text-muted-foreground leading-7">{linkEntities(para, linkBudget, linkedEntities)}</p>
                    ))}
                  </div>
                </div>
              )}
              {guide.when_to_buy && (
                <div>
                  <p className="text-sm font-bold text-foreground mb-3">When to Buy {item.dname}?</p>
                  <div className="space-y-3">
                    {splitGuideText(guide.when_to_buy).map((para: string, i: number) => (
                      <p key={i} className="text-sm text-muted-foreground leading-7">{linkEntities(para, linkBudget, linkedEntities)}</p>
                    ))}
                  </div>
                </div>
              )}
              {guide.tips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-3">Tips & common mistakes</p>
                  <ul className="space-y-3">
                    {guide.tips.map((tip, i) => (
                      <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-7 pl-3 border-l-2 border-primary/25">
                        <span>{linkEntities(tip, linkBudget, linkedEntities)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {guide.summary && (
                <div className="pt-4 border-t border-border/40">
                  <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-3">Summary</p>
                  <div className="space-y-3">
                    {splitGuideText(guide.summary).map((para: string, i: number) => (
                      <p key={i} className="text-sm text-muted-foreground leading-7">{linkEntities(para, linkBudget, linkedEntities)}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Heroes */}
      {heroUsage.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Popular On</p>
          <div className="grid grid-cols-2 gap-2">
            {heroUsage.map(({ hero, phase }) => {
              const slug = heroSlug(hero.name)
              const cfg = ATTR_CONFIG[hero.primary_attr]
              return (
                <Link
                  key={hero.id}
                  href={`/heroes/${slug}`}
                  className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-secondary/40 transition-colors"
                >
                  <div className="w-12 h-7 rounded-lg overflow-hidden shrink-0 border border-border/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroPortraitUrl(slug)} alt={hero.localized_name} className="w-full h-full object-cover object-center" />
                  </div>
                  <span className="text-sm font-semibold flex-1 truncate">{hero.localized_name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                    {phase}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Lore */}
      {item.lore && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lore</p>
          <p className="text-sm text-muted-foreground italic leading-relaxed">{item.lore}</p>
        </div>
      )}
    </div>
  )
}
