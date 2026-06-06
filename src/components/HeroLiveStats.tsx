import Link from 'next/link'
import {
  fetchHeroMatchups,
  fetchHeroItemPopularity,
  fetchHeroNeutralItems,
  fetchAllHeroes,
  heroSlug,
  heroPortraitUrl,
} from '@/lib/heroes'
import { fetchAllItems, fetchItemIdMap, itemIconUrl } from '@/lib/items'
import { fetchHeroRadarStats } from '@/lib/opendota'
import HeroRadar from './HeroRadar'

const T = {
  en: { strong: 'Strong Against', weak: 'Weak Against', items: 'Popular Items', neutral: 'Popular Neutral Items' },
  ru: { strong: 'Сильнее против', weak: 'Слабее против', items: 'Популярные предметы', neutral: 'Популярные нейтральные предметы' },
}

// ── Radar (OpenDota benchmarks) — isolated Suspense section ──────────────────
export async function HeroRadarSection({ heroId }: { heroId: number }) {
  const stats = await fetchHeroRadarStats(heroId).catch(() => null)
  if (!stats) return null
  return <HeroRadar stats={stats} />
}

// ── Matchups + popular items + neutral items (all OpenDota) ──────────────────
export async function HeroMatchupsItems({ heroId, locale = 'en' }: { heroId: number; locale?: 'en' | 'ru' }) {
  const prefix = locale === 'ru' ? '/ru' : ''
  const t = T[locale]

  const [allItems, heroes, itemIdMap] = await Promise.all([
    fetchAllItems().catch(() => []),
    fetchAllHeroes().catch(() => []),
    fetchItemIdMap().catch(() => new Map<number, string>()),
  ])
  const basicItemKeys = new Set(
    allItems.filter(i => i.category === 'basic' || i.category === 'consumable').map(i => i.key)
  )
  const componentsMap = new Map(
    allItems.filter(i => i.components?.length).map(i => [i.key, i.components!])
  )

  const [matchups, itemPhases, neutralItemIds] = await Promise.all([
    fetchHeroMatchups(heroId).catch(() => []),
    fetchHeroItemPopularity(heroId, itemIdMap, basicItemKeys, componentsMap).catch(() => []),
    fetchHeroNeutralItems(heroId).catch(() => []),
  ])

  const heroById = Object.fromEntries(heroes.map(h => [h.id, h]))
  const sorted = [...matchups].sort((a, b) => b.win_rate - a.win_rate)
  const bestAgainst = sorted.slice(0, 5).map(m => heroById[m.hero_id]).filter(Boolean)
  const worstAgainst = sorted.slice(-5).reverse().map(m => heroById[m.hero_id]).filter(Boolean)
  const neutralItems = neutralItemIds
    .map(({ itemId }) => allItems.find(i => i.id === itemId))
    .filter(Boolean) as typeof allItems

  return (
    <>
      {/* Matchups */}
      {(bestAgainst.length > 0 || worstAgainst.length > 0) && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bestAgainst.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <p className="section-label mb-3 text-green-400">{t.strong}</p>
              <div className="grid grid-cols-5 gap-2">
                {bestAgainst.map(h => {
                  const hSlug = heroSlug(h.name)
                  return (
                    <Link key={h.id} href={`${prefix}/heroes/${hSlug}`} className="group flex flex-col items-center gap-1.5 rounded-xl hover:bg-secondary/40 transition-colors p-1">
                      <div className="w-full aspect-video rounded-lg overflow-hidden border border-border/40 bg-secondary/60">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={heroPortraitUrl(hSlug)} alt={h.localized_name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200" />
                      </div>
                      <span className="text-[10px] font-semibold text-center leading-tight text-foreground/85 line-clamp-2 w-full">{h.localized_name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
          {worstAgainst.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <p className="section-label mb-3 text-red-400">{t.weak}</p>
              <div className="grid grid-cols-5 gap-2">
                {worstAgainst.map(h => {
                  const hSlug = heroSlug(h.name)
                  return (
                    <Link key={h.id} href={`${prefix}/heroes/${hSlug}`} className="group flex flex-col items-center gap-1.5 rounded-xl hover:bg-secondary/40 transition-colors p-1">
                      <div className="w-full aspect-video rounded-lg overflow-hidden border border-border/40 bg-secondary/60">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={heroPortraitUrl(hSlug)} alt={h.localized_name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200" />
                      </div>
                      <span className="text-[10px] font-semibold text-center leading-tight text-foreground/85 line-clamp-2 w-full">{h.localized_name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Popular Items */}
      {itemPhases.length > 0 && (
        <div className="mb-6">
          <p className="section-label mb-3">{t.items}</p>
          <div className="rounded-2xl border border-border/60 bg-card/60 divide-y divide-border/40">
            {itemPhases.map(({ phase, label, items }) => (
              <div key={phase} className="px-5 py-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(({ key }) => {
                    const itemData = allItems.find(i => i.key === key)
                    const name = itemData?.dname ?? key.replace(/_/g, ' ')
                    return (
                      <Link key={key} href={`${prefix}/items/${key}`}
                        className="group flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-secondary/40 p-1.5 hover:border-primary/40 hover:bg-card/80 transition-all w-[60px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={itemIconUrl(key)} alt={name} className="w-full h-[33px] object-cover rounded-lg" />
                        <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-2 w-full">{name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Neutral Items */}
      {neutralItems.length > 0 && (
        <div className="mb-6">
          <p className="section-label mb-3">{t.neutral}</p>
          <div className="rounded-2xl border border-border/60 bg-card/60 px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {neutralItems.map(item => (
                <Link key={item.key} href={`${prefix}/items/${item.key}`}
                  className="group flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-secondary/40 p-1.5 hover:border-primary/40 hover:bg-card/80 transition-all w-[60px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={itemIconUrl(item.key)} alt={item.dname} className="w-full h-[33px] object-cover rounded-lg" />
                  <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-2 w-full">{item.dname}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
