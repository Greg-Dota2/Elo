import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAllItems, fetchItemByKey, itemIconUrl } from '@/lib/items'
import { fetchHeroesForItem, fetchNeutralItemHeroes, heroSlug, heroPortraitUrl, ATTR_CONFIG } from '@/lib/heroes'
import { fetchItemGuide } from '@/lib/guides'

export const revalidate = 86400

interface Props {
  params: Promise<{ key: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params
  const item = await fetchItemByKey(key)
  if (!item) return {}
  const title = `${item.dname} — Dota 2 Item`
  const description = item.lore ?? `${item.dname} — Dota 2 item stats, cost, and abilities.`
  return {
    title,
    description,
    alternates: { canonical: `/items/${key}` },
    openGraph: { title, description, url: `/items/${key}`, images: [{ url: itemIconUrl(key), alt: item.dname }] },
    twitter: { card: 'summary', title, description, images: [itemIconUrl(key)] },
  }
}

export async function generateStaticParams() {
  try {
    const items = await fetchAllItems()
    return items.map(i => ({ key: i.key }))
  } catch {
    return []
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  consumable: 'Consumable',
  basic: 'Basic',
  upgrade: 'Upgrade',
  neutral: 'Neutral',
}

export default async function ItemPage({ params }: Props) {
  const { key } = await params
  const [item, allItems] = await Promise.all([fetchItemByKey(key), fetchAllItems()])
  if (!item) notFound()

  const itemMap = new Map(allItems.map(i => [i.key, i]))
  const [heroUsage, guide] = await Promise.all([
    item.category === 'neutral'
      ? fetchNeutralItemHeroes(item.id).then(r => r.map(({ hero, count }) => ({ hero, phase: 'Neutral', count })))
      : fetchHeroesForItem(item.id),
    fetchItemGuide(key).catch(() => null),
  ])

  const SITE_URL = 'https://dota2protips.com'

  return (
    <div className="fade-in-up max-w-2xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Product',
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
      {item.components && item.components.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Components</p>
          <div className="flex flex-wrap gap-3">
            {item.components.map(comp => {
              const compItem = itemMap.get(comp)
              return (
                <Link
                  key={comp}
                  href={`/items/${comp}`}
                  className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/40 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 pr-3 overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={itemIconUrl(comp)}
                    alt={compItem?.dname ?? comp}
                    className="w-12 h-[35px] object-cover shrink-0"
                  />
                  <span className="text-xs font-semibold text-foreground">{compItem?.dname ?? comp.replace(/_/g, ' ')}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Guide */}
      {guide && (guide.why_buy || guide.when_to_buy || guide.tips.length > 0 || guide.summary) && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Strategy</p>
          <div className="space-y-4">
            {guide.why_buy && (
              <div>
                <p className="text-sm font-bold text-foreground mb-1">Why Buy {item.dname}?</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{guide.why_buy}</p>
              </div>
            )}
            {guide.when_to_buy && (
              <div>
                <p className="text-sm font-bold text-foreground mb-1">When to Buy {item.dname}?</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{guide.when_to_buy}</p>
              </div>
            )}
            {guide.tips.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-2">Tips & common mistakes</p>
                <ul className="space-y-1.5">
                  {guide.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                      <span className="text-primary/60 shrink-0 mt-0.5">·</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {guide.summary && (
              <div className="pt-3 border-t border-border/40">
                <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-1">Summary</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{guide.summary}</p>
              </div>
            )}
          </div>
        </div>
      )}

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
