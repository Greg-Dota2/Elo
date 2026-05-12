import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAllItems, fetchItemByKey, fetchComponentMap, itemIconUrl } from '@/lib/items'
import { fetchHeroesForItem, fetchNeutralItemHeroes, fetchAllHeroes, heroSlug, heroPortraitUrl, ATTR_CONFIG } from '@/lib/heroes'
import { fetchItemGuide } from '@/lib/guides'
import { getPlayers } from '@/lib/queries'
import type React from 'react'

export const revalidate = 86400

interface Props { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params
  const item = await fetchItemByKey(key)
  if (!item) return {}
  const title = `${item.dname} — Гайд и Характеристики | Dota 2`
  const description = `${item.dname} — когда покупать, как использовать и типичные ошибки. Полный гайд на Dota2ProTips.`.slice(0, 160)
  return {
    title,
    description,
    alternates: { canonical: `/items/${key}`, languages: { 'x-default': `/items/${key}`, 'en': `/items/${key}`, 'ru': `/ru/items/${key}` } },
    openGraph: { title, description, url: `/ru/items/${key}`, images: [{ url: itemIconUrl(key), alt: item.dname }] },
    twitter: { card: 'summary', title, description, images: [itemIconUrl(key)] },
  }
}

const CATEGORY_LABEL_RU: Record<string, string> = {
  consumable: 'Расходник',
  basic: 'Базовый',
  upgrade: 'Улучшение',
  neutral: 'Нейтральный',
}

const ABILITY_TYPE_STYLES: Record<string, string> = {
  'PASSIVE': 'text-slate-300 bg-slate-400/10 border-slate-400/25',
  'ACTIVE':  'text-sky-400 bg-sky-400/10 border-sky-400/25',
  'TOGGLE':  'text-amber-400 bg-amber-400/10 border-amber-400/25',
  'AURA':    'text-purple-400 bg-purple-400/10 border-purple-400/25',
  'INNATE':  'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
}

const ABILITY_TYPE_RU: Record<string, string> = {
  'PASSIVE': 'Пассивная', 'ACTIVE': 'Активная', 'TOGGLE': 'Переключение',
  'AURA': 'Аура', 'INNATE': 'Врождённая',
}

const PHASE_RU: Record<string, string> = {
  'Starting': 'Старт', 'Early': 'Ранний', 'Core': 'Кор', 'Late': 'Лейт',
}

function resolveAttrib(display: string, value: string | number | null | undefined): string {
  const v = String(value ?? '').trim()
  return display.replace(/\{value\}/g, v)
}

function cleanItemDesc(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function statColor(display: string): string {
  const d = display.toLowerCase()
  if (/health|здоровье/.test(d)) return 'text-red-400'
  if (/mana|мана/.test(d)) return 'text-blue-400'
  if (/damage|урон/.test(d)) return 'text-orange-400'
  if (/armor|броня/.test(d)) return 'text-yellow-400'
  if (/attack speed/.test(d)) return 'text-green-400'
  if (/cooldown/.test(d)) return 'text-cyan-400'
  if (/strength/.test(d)) return 'text-red-300'
  if (/agility/.test(d)) return 'text-green-300'
  if (/intelligence/.test(d)) return 'text-blue-300'
  if (/move\s*speed/.test(d)) return 'text-emerald-400'
  if (/magic resist/.test(d)) return 'text-purple-400'
  if (/spell amp/.test(d)) return 'text-violet-400'
  return 'text-foreground'
}

export default async function RuItemPage({ params }: Props) {
  const { key } = await params
  const [item, allItems, compMap] = await Promise.all([fetchItemByKey(key), fetchAllItems(), fetchComponentMap()])
  if (!item) notFound()

  const itemMap = new Map(allItems.map(i => [i.key, i]))
  const [heroUsage, guide, allHeroes, allPlayers] = await Promise.all([
    item.category === 'neutral'
      ? fetchNeutralItemHeroes(item.id).then(r => r.map(({ hero, count }) => ({ hero, phase: 'Нейтральный', count })))
      : fetchHeroesForItem(item.id),
    fetchItemGuide(key).catch(() => null),
    fetchAllHeroes().catch(() => [] as Awaited<ReturnType<typeof fetchAllHeroes>>),
    getPlayers().catch(() => []),
  ])

  // Guide content — use _ru with EN fallback
  const guideLang = guide ? {
    why_buy: guide.why_buy_ru ?? guide.why_buy,
    when_to_buy: guide.when_to_buy_ru ?? guide.when_to_buy,
    tips: (guide.tips_ru ?? guide.tips) as string[],
    summary: guide.summary_ru ?? guide.summary,
  } : null

  // Entity map → /ru/ routes
  const entityMap = new Map<string, string>()
  for (const i of allItems) {
    if (i.key !== key && i.dname) entityMap.set(i.dname.toLowerCase(), `/ru/items/${i.key}`)
  }
  for (const h of allHeroes) {
    entityMap.set(h.localized_name.toLowerCase(), `/ru/heroes/${heroSlug(h.name)}`)
  }
  for (const p of allPlayers) {
    if (p.ign && p.slug) entityMap.set(p.ign.toLowerCase(), `/ru/players/${p.slug}`)
  }
  const entityPattern = new RegExp(
    `\\b(${[...entityMap.keys()].sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
  )

  function linkEntities(text: string, budget: { left: number }, seen: Set<string>): React.ReactNode {
    if (budget.left <= 0) return text
    const parts: React.ReactNode[] = []
    let last = 0; let m: RegExpExecArray | null
    entityPattern.lastIndex = 0
    while ((m = entityPattern.exec(text)) !== null) {
      const k = m[0].toLowerCase()
      const href = entityMap.get(k)
      if (!href || seen.has(k) || budget.left <= 0) continue
      if (m.index > last) parts.push(text.slice(last, m.index))
      parts.push(<Link key={m.index} href={href} className="font-medium underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors" style={{ color: 'inherit' }}>{m[0]}</Link>)
      seen.add(k); budget.left--; last = m.index + m[0].length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length ? <>{parts}</> : text
  }

  function splitGuideText(text: string): string[] {
    if (text.includes('\n\n')) return text.split('\n\n').filter(Boolean)
    const sentences = text.split(/(?<=[.!?])\s+(?=[А-ЯA-Z"'«])/)
    if (sentences.length <= 2) return [text]
    const paras: string[] = []; let current = ''
    for (const s of sentences) {
      const joined = current ? `${current} ${s}` : s
      if (current && joined.length > 480) { paras.push(current.trim()); current = s } else { current = joined }
    }
    if (current) paras.push(current.trim())
    return paras
  }

  const SITE_URL = 'https://www.dota2protips.com'

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: item.dname,
              url: `${SITE_URL}/ru/items/${item.key}`,
              image: { '@type': 'ImageObject', url: itemIconUrl(item.key) },
              ...(item.lore ? { description: item.lore } : {}),
              author: { '@type': 'Person', name: 'Greg Spencer', url: SITE_URL },
              publisher: {
                '@type': 'Organization',
                name: 'Dota2ProTips',
                logo: { '@type': 'ImageObject', url: `${SITE_URL}/1.png` },
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Предметы', item: `${SITE_URL}/ru/items` },
                { '@type': 'ListItem', position: 2, name: item.dname, item: `${SITE_URL}/ru/items/${item.key}` },
              ],
            },
          ]),
        }}
      />
      <Link href="/ru/items" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Все предметы
      </Link>

      <div className="flex items-start gap-5 mb-8">
        <div className="rounded-xl overflow-hidden border border-border/60 bg-secondary/40 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={itemIconUrl(item.key)} alt={item.dname} className="w-24 h-[70px] object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="section-label mb-1">{CATEGORY_LABEL_RU[item.category] ?? item.category}</p>
          <h1 className="text-3xl font-black tracking-tight mb-2">{item.dname}</h1>
          <div className="flex items-center gap-4 text-sm">
            {item.cost > 0 && <span className="font-bold text-amber-400 tabular-nums">{item.cost.toLocaleString()} золота</span>}
            {item.cd !== false && item.cd > 0 && <span className="text-muted-foreground">КД: {item.cd}с</span>}
            {item.mc !== false && item.mc > 0 && <span className="text-muted-foreground">Мана: {item.mc}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      {item.attrib.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Характеристики</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {item.attrib.filter(a => a.display && a.value != null && parseFloat(String(a.value)) !== 0).map((a, i) => {
              const text = resolveAttrib(a.display!, a.value)
              if (text.includes('{')) return null
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-sm font-bold tabular-nums ${statColor(text)}`}>{text}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Abilities */}
      {item.abilities.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Способности</p>
          <div className="space-y-4">
            {item.abilities.map((ab, i) => {
              const descRu = guide?.abilities_ru?.[i]?.description
              return (
                <div key={i}>
                  {ab.type && (
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-2 ${ABILITY_TYPE_STYLES[ab.type.toUpperCase()] ?? 'text-muted-foreground bg-secondary/60 border-border/40'}`}>
                      {ABILITY_TYPE_RU[ab.type.toUpperCase()] ?? ab.type}
                    </span>
                  )}
                  {ab.title && <p className="text-sm font-bold text-foreground mb-1.5">{ab.title}</p>}
                  {ab.description && <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{cleanItemDesc(descRu ?? ab.description)}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Components */}
      {item.components && item.components.length > 0 && (() => {
        const hasRecipeInData = item.components!.some(c => c.includes('recipe'))
        const componentTotal = item.components!.reduce((sum, c) => sum + (compMap.get(c)?.cost ?? 0), 0)
        const recipeCost = !hasRecipeInData && item.category === 'upgrade' && item.cost > 0 ? item.cost - componentTotal : 0

        const renderChip = (comp: string, name: string, cost: number, navigable: boolean) => {
          const inner = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemIconUrl(comp)} alt={name} className="w-12 h-[35px] object-cover shrink-0" />
              <div className="flex flex-col pr-3">
                <span className="text-xs font-semibold text-foreground leading-tight">{name}</span>
                {cost > 0 && <span className="text-[11px] font-bold text-amber-400 tabular-nums">{cost.toLocaleString()} зол.</span>}
              </div>
            </>
          )
          return navigable ? (
            <Link key={comp} href={`/ru/items/${comp}`} className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/40 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 overflow-hidden">{inner}</Link>
          ) : (
            <div key={comp} className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/40 overflow-hidden">{inner}</div>
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
          ...(recipeCost > 0 ? [renderChip('recipe', 'Рецепт', recipeCost, false)] : []),
        ]

        return (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Компоненты</p>
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip, i) => (
                <div key={i} className="flex items-center gap-2">
                  {chip}
                  {i < chips.length - 1 && <span className="text-muted-foreground font-bold text-base select-none">+</span>}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Guide */}
      {guideLang && (guideLang.why_buy || guideLang.when_to_buy || guideLang.tips.length > 0 || guideLang.summary) && (() => {
        const linkBudget = { left: 12 }
        const linkedEntities = new Set<string>()
        return (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">Стратегия</p>
            <div className="space-y-6">
              {guideLang.why_buy && (
                <div>
                  <p className="text-sm font-bold text-foreground mb-3">Зачем покупать {item.dname}?</p>
                  <div className="space-y-3">
                    {splitGuideText(guideLang.why_buy).map((para, i) => (
                      <p key={i} className="text-sm text-muted-foreground leading-7">{linkEntities(para, linkBudget, linkedEntities)}</p>
                    ))}
                  </div>
                </div>
              )}
              {guideLang.when_to_buy && (
                <div>
                  <p className="text-sm font-bold text-foreground mb-3">Когда покупать {item.dname}?</p>
                  <div className="space-y-3">
                    {splitGuideText(guideLang.when_to_buy).map((para, i) => (
                      <p key={i} className="text-sm text-muted-foreground leading-7">{linkEntities(para, linkBudget, linkedEntities)}</p>
                    ))}
                  </div>
                </div>
              )}
              {guideLang.tips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-3">Советы и ошибки</p>
                  <ul className="space-y-3">
                    {guideLang.tips.map((tip, i) => (
                      <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-7 pl-3 border-l-2 border-primary/25">
                        <span>{linkEntities(tip, linkBudget, linkedEntities)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {guideLang.summary && (
                <div className="pt-4 border-t border-border/40">
                  <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-3">Итог</p>
                  <div className="space-y-3">
                    {splitGuideText(guideLang.summary).map((para, i) => (
                      <p key={i} className="text-sm text-muted-foreground leading-7">{linkEntities(para, linkBudget, linkedEntities)}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Popular on */}
      {heroUsage.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Популярен на</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2">
            {heroUsage.map(({ hero, phase }) => {
              const hSlug = heroSlug(hero.name)
              const cfg = ATTR_CONFIG[hero.primary_attr]
              return (
                <Link
                  key={hero.id}
                  href={`/ru/heroes/${hSlug}`}
                  className="group flex flex-col items-center gap-1.5 rounded-xl hover:bg-secondary/40 transition-colors p-1"
                >
                  <div className="w-full aspect-video rounded-lg overflow-hidden border border-border/40 bg-secondary/60 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroPortraitUrl(hSlug)} alt={hero.localized_name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200" />
                    <span className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>{PHASE_RU[phase] ?? phase}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-center leading-tight text-foreground/85 line-clamp-2 w-full">{hero.localized_name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Lore */}
      {(guide?.lore_ru ?? item.lore) && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">История</p>
          <div className="relative rounded-lg pl-4 pr-10 py-3 overflow-hidden border-l-2"
            style={{ borderLeftColor: 'rgba(215,185,105,0.5)', background: 'rgba(215,185,105,0.05)' }}>
            <span className="absolute bottom-0 right-2 text-7xl leading-none select-none pointer-events-none"
              style={{ color: 'rgba(215,185,105,0.08)', fontFamily: 'Georgia, serif' }}>&rdquo;</span>
            <p className="relative text-sm italic leading-7" style={{ color: 'rgba(215,185,105,0.9)' }}>{guide?.lore_ru ?? item.lore}</p>
          </div>
        </div>
      )}
    </div>
  )
}
