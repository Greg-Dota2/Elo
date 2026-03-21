import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  fetchAllHeroes,
  fetchHeroDetail,
  fetchHeroMatchups,
  fetchHeroItemPopularity,
  fetchHeroNeutralItems,
  heroSlug,
  heroPortraitUrl,
  ATTR_CONFIG,
  decodeBehavior,
  formatLevelValues,
  interpolateAbilityDesc,
  type ValveAbility,
  type HeroData,
} from '@/lib/heroes'
import { fetchItemIdMap, fetchAllItems, itemIconUrl } from '@/lib/items'
import { getPlayersBySignatureHero } from '@/lib/queries'
import type { Player } from '@/lib/types'
import AbilityIcon from '@/components/AbilityIcon'

export const revalidate = 86400

export async function generateStaticParams() {
  try {
    const heroes = await fetchAllHeroes()
    return heroes.map(h => ({ slug: heroSlug(h.name) }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const heroes = await fetchAllHeroes()
    const hero = heroes.find(h => heroSlug(h.name) === slug)
    if (!hero) return { title: 'Hero Not Found' }
    const cfg = ATTR_CONFIG[hero.primary_attr]
    const title = `${hero.localized_name} — Dota 2 Hero Guide`
    const article = ['Agility', 'Intelligence'].includes(cfg.label) ? 'an' : 'a'
    const roles = hero.roles.slice(0, 3).join(', ')
    const description = `${hero.localized_name} is ${article} ${cfg.label} hero in Dota 2. ${hero.attack_type} ${roles}. Full abilities, stats, counters, and item builds on Dota2ProTips.`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/heroes/${slug}`,
        images: [{ url: heroPortraitUrl(slug), alt: hero.localized_name }],
      },
      twitter: { card: 'summary_large_image', title, description },
      alternates: { canonical: `/heroes/${slug}` },
    }
  } catch {
    return { title: 'Hero Not Found' }
  }
}

function AbilityCard({ ability }: { ability: ValveAbility }) {
  const behaviors = decodeBehavior(ability.behavior)
  const cd = formatLevelValues(ability.cooldowns.filter(v => v > 0))
  const mc = formatLevelValues(ability.mana_costs.filter(v => v > 0))
  const specialValues = ability.special_values.filter(sv => sv.heading_loc && sv.heading_loc.trim())

  const badges: { label: string; className: string }[] = []
  if (ability.ability_is_innate) badges.push({ label: 'Innate', className: 'text-amber-400 bg-amber-400/10 border-amber-400/20' })
  if (ability.ability_has_scepter || ability.ability_is_granted_by_scepter) badges.push({ label: 'Aghanim\'s Scepter', className: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' })
  if (ability.ability_has_shard || ability.ability_is_granted_by_shard) badges.push({ label: 'Aghanim\'s Shard', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' })

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-start gap-4 mb-3">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl border border-border/60 bg-secondary/60 shrink-0 overflow-hidden">
          <AbilityIcon name={ability.name} displayName={ability.name_loc} />
        </div>

        {/* Name + tags */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-base leading-tight mb-1.5">
            {ability.name_loc}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {behaviors.map(b => (
              <span key={b} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border/60 bg-secondary/60 text-muted-foreground">
                {b}
              </span>
            ))}
            {badges.map(badge => (
              <span key={badge.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                {badge.label}
              </span>
            ))}
          </div>
        </div>

        {/* CD + Mana */}
        <div className="flex gap-4 shrink-0 text-right">
          {cd && (
            <div>
              <p className="text-[10px] text-muted-foreground/60 mb-0.5">Cooldown</p>
              <p className="font-display font-bold text-sm text-foreground tabular-nums">{cd}s</p>
            </div>
          )}
          {mc && (
            <div>
              <p className="text-[10px] text-muted-foreground/60 mb-0.5">Mana</p>
              <p className="font-display font-bold text-sm text-blue-400 tabular-nums">{mc}</p>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {ability.desc_loc && (
        <p
          className="text-sm text-muted-foreground leading-relaxed mb-3"
          dangerouslySetInnerHTML={{ __html: interpolateAbilityDesc(ability.desc_loc, ability.special_values) }}
        />
      )}

      {/* Scaling stats */}
      {specialValues.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
          {specialValues.map((sv, i) => (
            <div key={i} className="rounded-lg bg-secondary/40 px-3 py-2">
              <p className="text-[10px] text-muted-foreground/60 mb-0.5 leading-tight">{sv.heading_loc}</p>
              <p className="font-display font-bold text-xs text-foreground">
                {sv.is_percentage
                  ? formatLevelValues(sv.values_float.map(v => Math.round(v * 10) / 10)) + '%'
                  : formatLevelValues(sv.values_float.map(v => Math.round(v * 100) / 100))}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {ability.notes_loc && ability.notes_loc.length > 0 && (
        <ul className="space-y-0.5 mb-3">
          {ability.notes_loc.map((note, i) => (
            <li key={i} className="text-xs text-muted-foreground/60 flex gap-1.5">
              <span className="shrink-0 mt-0.5">·</span>
              <span dangerouslySetInnerHTML={{ __html: interpolateAbilityDesc(note.replace(/%(\w+)%%%/g, '$1'), ability.special_values) }} />
            </li>
          ))}
        </ul>
      )}

      {/* Lore */}
      {ability.lore_loc && (
        <p
          className="text-xs text-muted-foreground/50 italic pt-3 border-t border-border/40 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: ability.lore_loc }}
        />
      )}
    </div>
  )
}

function UpgradeCard({ ability, type }: { ability: ValveAbility; type: 'scepter' | 'shard' }) {
  const upgradeDesc = type === 'scepter' ? ability.scepter_loc : ability.shard_loc
  const colorClass = type === 'scepter' ? 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5' : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'

  return (
    <div className={`rounded-2xl border p-5 ${colorClass}`}>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl border border-border/60 bg-secondary/60 shrink-0 overflow-hidden">
          <AbilityIcon name={ability.name} displayName={ability.name_loc} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-base leading-tight mb-1.5 text-foreground">
            {ability.name_loc}
          </h3>
          {upgradeDesc ? (
            <p
              className="text-sm text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: interpolateAbilityDesc(upgradeDesc, ability.special_values) }}
            />
          ) : (
            <p className="text-sm text-muted-foreground/60 italic">Upgrades this ability.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function HeroPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let heroes
  try {
    heroes = await fetchAllHeroes()
  } catch {
    notFound()
  }

  const hero = heroes.find(h => heroSlug(h.name) === slug)
  if (!hero) notFound()

  const [itemIdMap, allItems] = await Promise.all([fetchItemIdMap(), fetchAllItems()])
  const basicItemKeys = new Set(
    allItems.filter(i => i.category === 'basic' || i.category === 'consumable').map(i => i.key)
  )
  const componentsMap = new Map(
    allItems.filter(i => i.components?.length).map(i => [i.key, i.components!])
  )

  const [detailResult, matchupsResult, signaturePlayersResult, itemsResult, neutralItemsResult] = await Promise.allSettled([
    fetchHeroDetail(hero.id),
    fetchHeroMatchups(hero.id),
    getPlayersBySignatureHero(hero.localized_name),
    fetchHeroItemPopularity(hero.id, itemIdMap, basicItemKeys, componentsMap),
    fetchHeroNeutralItems(hero.id),
  ])

  const detail = detailResult.status === 'fulfilled' ? detailResult.value : null
  const matchups = matchupsResult.status === 'fulfilled' ? matchupsResult.value : []
  const signaturePlayers: Player[] = signaturePlayersResult.status === 'fulfilled' ? signaturePlayersResult.value : []
  const itemPhases = itemsResult.status === 'fulfilled' ? itemsResult.value : []
  const neutralItemIds = neutralItemsResult.status === 'fulfilled' ? neutralItemsResult.value : []
  const neutralItems = neutralItemIds
    .map(({ itemId }) => allItems.find(i => i.id === itemId))
    .filter(Boolean) as typeof allItems

  const heroById = Object.fromEntries(heroes.map(h => [h.id, h]))
  const sorted = [...matchups].sort((a, b) => b.win_rate - a.win_rate)
  const bestAgainst = sorted.slice(0, 5).map(m => heroById[m.hero_id]).filter(Boolean)
  const worstAgainst = sorted.slice(-5).reverse().map(m => heroById[m.hero_id]).filter(Boolean)

  const cfg = ATTR_CONFIG[hero.primary_attr]

  const allAbilities = detail?.abilities ?? []

  // Abilities granted as new abilities by Aghanim's
  const scepterGrantedAbilities = allAbilities.filter(a => a.ability_is_granted_by_scepter)
  const shardGrantedAbilities = allAbilities.filter(a => a.ability_is_granted_by_shard)

  // Base abilities that get upgraded (but not new grants)
  const scepterUpgradedAbilities = allAbilities.filter(
    a => a.ability_has_scepter && !a.ability_is_innate && !a.ability_is_granted_by_scepter && !a.ability_is_granted_by_shard
  )
  const shardUpgradedAbilities = allAbilities.filter(
    a => a.ability_has_shard && !a.ability_is_innate && !a.ability_is_granted_by_scepter && !a.ability_is_granted_by_shard
  )

  const hasScepter = scepterGrantedAbilities.length > 0 || scepterUpgradedAbilities.length > 0
  const hasShard = shardGrantedAbilities.length > 0 || shardUpgradedAbilities.length > 0

  // Separate innate from regular abilities, exclude granted abilities (shown in dedicated sections)
  const regularAbilities = allAbilities.filter(
    a => !a.ability_is_granted_by_scepter && !a.ability_is_granted_by_shard
  )
  const innateAbilities = regularAbilities.filter(a => a.ability_is_innate)
  const mainAbilities = regularAbilities.filter(a => !a.ability_is_innate)

  const stats = [
    { label: 'Base STR', value: `${hero.base_str} +${hero.str_gain}`, color: 'text-red-400' },
    { label: 'Base AGI', value: `${hero.base_agi} +${hero.agi_gain}`, color: 'text-green-400' },
    { label: 'Base INT', value: `${hero.base_int} +${hero.int_gain}`, color: 'text-blue-400' },
    { label: 'Move Speed', value: String(hero.move_speed), color: '' },
    { label: 'Attack Range', value: String(hero.attack_range), color: '' },
    { label: 'Base Armor', value: String(hero.base_armor), color: '' },
    { label: 'Attack DMG', value: `${hero.base_attack_min}–${hero.base_attack_max}`, color: '' },
    {
      label: 'Projectile',
      value: hero.projectile_speed === 0 ? 'Instant' : String(hero.projectile_speed),
      color: '',
    },
  ]

  const SITE_URL = 'https://dota2protips.com'

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Heroes', item: `${SITE_URL}/heroes` },
              { '@type': 'ListItem', position: 2, name: hero.localized_name, item: `${SITE_URL}/heroes/${slug}` },
            ],
          }),
        }}
      />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
        <Link href="/heroes" className="hover:text-foreground transition-colors">Heroes</Link>
        <span className="text-muted-foreground/40">/</span>
        <span>{hero.localized_name}</span>
      </div>

      {/* Hero header */}
      <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden mb-6">
        {/* Banner */}
        <div className="relative h-52 sm:h-72 bg-secondary/60 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroPortraitUrl(slug)}
            alt={hero.localized_name}
            className="w-full h-full object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, hsl(var(--card)) 0%, hsl(var(--card) / 0.4) 50%, transparent 100%)',
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                {cfg.label}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-border/60 bg-card/60 text-muted-foreground">
                {hero.attack_type}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-foreground drop-shadow-lg">
              {hero.localized_name}
            </h1>
          </div>
        </div>

        {/* Roles + bio + stats */}
        <div className="px-6 pb-6 pt-4">
          {/* Roles */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {hero.roles.map(role => (
              <Link key={role} href={`/heroes?role=${encodeURIComponent(role)}`} className="text-xs text-muted-foreground border border-border/50 px-2.5 py-0.5 rounded-full hover:border-primary/40 hover:text-primary transition-colors">
                {role}
              </Link>
            ))}
          </div>

          {/* Bio */}
          {detail?.bio_loc && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-3xl">
              {detail.bio_loc}
            </p>
          )}

          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(stat => (
              <div key={stat.label} className="rounded-xl bg-secondary/40 px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">{stat.label}</p>
                <p className={`font-display font-bold text-sm tabular-nums ${stat.color || 'text-foreground'}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Facets */}
      {detail?.facets && detail.facets.length > 0 && (
        <div className="mb-6">
          <p className="section-label mb-3">Facets</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detail.facets.map((facet, facetIdx) => {
              // Gather special values from the dedicated facet ability (positional index)
              const facetAbility = detail.facet_abilities?.[facetIdx]?.abilities?.[0]
              const directSVs = facetAbility?.special_values ?? []

              // Also gather facet-gated values from regular abilities (required_facet match)
              // {s:bonus_X} tokens map to facet_bonus.values of special value named X
              const gatedSVs: import('@/lib/heroes').ValveSpecialValue[] = []
              for (const ability of detail.abilities) {
                for (const sv of ability.special_values ?? []) {
                  if (sv.required_facet === facet.name && sv.facet_bonus?.values?.length) {
                    gatedSVs.push({ ...sv, values_float: sv.facet_bonus.values })
                    gatedSVs.push({ ...sv, name: 'bonus_' + sv.name, values_float: sv.facet_bonus.values })
                  }
                }
              }

              const description = interpolateAbilityDesc(facet.description_loc, [...directSVs, ...gatedSVs])
              return (
                <div key={facet.index} className="rounded-xl border border-border/60 bg-card/60 p-4 flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/facets/${facet.icon}.png`}
                    alt={facet.title_loc}
                    className="w-8 h-8 object-contain shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="font-display font-bold text-sm mb-1">{facet.title_loc}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Innate abilities */}
      {innateAbilities.length > 0 && (
        <div className="mb-6">
          <p className="section-label mb-3">Innate Abilities</p>
          <div className="space-y-3">
            {innateAbilities.map(ability => (
              <AbilityCard key={ability.id} ability={ability} />
            ))}
          </div>
        </div>
      )}

      {/* Main abilities */}
      {mainAbilities.length > 0 && (
        <div className="mb-6">
          <p className="section-label mb-3">Abilities</p>
          <div className="space-y-3">
            {mainAbilities.map(ability => (
              <AbilityCard key={ability.id} ability={ability} />
            ))}
          </div>
        </div>
      )}

      {/* Aghanim's Scepter */}
      {hasScepter && (
        <div className="mb-6">
          <Link href="/items/ultimate_scepter" className="flex items-center gap-2 mb-3 w-fit hover:opacity-70 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/ultimate_scepter.png"
              alt="Aghanim's Scepter"
              className="w-7 h-7 rounded object-cover"
            />
            <p className="section-label">Aghanim&apos;s Scepter</p>
          </Link>
          <div className="space-y-3">
            {scepterGrantedAbilities.map(ability => (
              <AbilityCard key={ability.id} ability={ability} />
            ))}
            {scepterUpgradedAbilities.map(ability => (
              <UpgradeCard key={ability.id} ability={ability} type="scepter" />
            ))}
          </div>
        </div>
      )}

      {/* Aghanim's Shard */}
      {hasShard && (
        <div className="mb-6">
          <Link href="/items/aghanims_shard" className="flex items-center gap-2 mb-3 w-fit hover:opacity-70 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/aghanims_shard.png"
              alt="Aghanim's Shard"
              className="w-7 h-7 rounded object-cover"
            />
            <p className="section-label">Aghanim&apos;s Shard</p>
          </Link>
          <div className="space-y-3">
            {shardGrantedAbilities.map(ability => (
              <AbilityCard key={ability.id} ability={ability} />
            ))}
            {shardUpgradedAbilities.map(ability => (
              <UpgradeCard key={ability.id} ability={ability} type="shard" />
            ))}
          </div>
        </div>
      )}

      {!detail && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Ability data temporarily unavailable.
        </div>
      )}

      {/* Matchups */}
      {(bestAgainst.length > 0 || worstAgainst.length > 0) && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bestAgainst.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
              <p className="section-label mb-3 text-green-400">Strong Against</p>
              <div className="flex flex-col gap-2">
                {bestAgainst.map(h => {
                  const hSlug = heroSlug(h.name)
                  const hCfg = ATTR_CONFIG[h.primary_attr]
                  return (
                    <Link key={h.id} href={`/heroes/${hSlug}`} className="flex items-center gap-3 rounded-xl hover:bg-secondary/40 transition-colors p-1.5 -mx-1.5">
                      <div className="w-12 h-7 rounded-lg overflow-hidden shrink-0 border border-border/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={heroPortraitUrl(hSlug)} alt={h.localized_name} className="w-full h-full object-cover object-center" />
                      </div>
                      <span className="text-sm font-semibold flex-1">{h.localized_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hCfg.color} ${hCfg.bg} ${hCfg.border}`}>{hCfg.short}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
          {worstAgainst.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
              <p className="section-label mb-3 text-red-400">Weak Against</p>
              <div className="flex flex-col gap-2">
                {worstAgainst.map(h => {
                  const hSlug = heroSlug(h.name)
                  const hCfg = ATTR_CONFIG[h.primary_attr]
                  return (
                    <Link key={h.id} href={`/heroes/${hSlug}`} className="flex items-center gap-3 rounded-xl hover:bg-secondary/40 transition-colors p-1.5 -mx-1.5">
                      <div className="w-12 h-7 rounded-lg overflow-hidden shrink-0 border border-border/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={heroPortraitUrl(hSlug)} alt={h.localized_name} className="w-full h-full object-cover object-center" />
                      </div>
                      <span className="text-sm font-semibold flex-1">{h.localized_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hCfg.color} ${hCfg.bg} ${hCfg.border}`}>{hCfg.short}</span>
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
          <p className="section-label mb-3">Popular Items</p>
          <div className="rounded-2xl border border-border/60 bg-card/60 divide-y divide-border/40">
            {itemPhases.map(({ phase, label, items }) => (
              <div key={phase} className="flex items-center gap-4 px-5 py-3">
                <p className="text-xs font-semibold text-muted-foreground w-24 shrink-0">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(({ key }) => (
                    <Link key={key} href={`/items/${key}`} title={key.replace(/_/g, ' ')}
                      className="rounded-lg overflow-hidden border border-border/50 hover:border-primary/40 transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={itemIconUrl(key)} alt={key} className="w-12 h-[35px] object-cover" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Neutral Items */}
      {neutralItems.length > 0 && (
        <div className="mb-6">
          <p className="section-label mb-3">Popular Neutral Items</p>
          <div className="rounded-2xl border border-border/60 bg-card/60 px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {neutralItems.map(item => (
                <Link key={item.key} href={`/items/${item.key}`} title={item.dname}
                  className="rounded-lg overflow-hidden border border-border/50 hover:border-primary/40 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={itemIconUrl(item.key)} alt={item.dname} className="w-12 h-[35px] object-cover" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Signature players */}
      {signaturePlayers.length > 0 && (
        <div className="mb-6">
          <p className="section-label mb-3">Pro Players Known For This Hero</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {signaturePlayers.map(p => {
              const posLabel: Record<number, string> = { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Support', 5: 'Hard Support' }
              return (
                <Link
                  key={p.slug}
                  href={`/players/${p.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 hover:bg-secondary/40 transition-colors"
                >
                  {p.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo_url} alt={p.ign} className="w-10 h-10 rounded-full object-cover shrink-0 border border-border/40" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary/60 border border-border/40 flex items-center justify-center text-sm font-bold shrink-0">
                      {p.ign.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.ign}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.team?.name ?? ''}
                      {p.team?.name && p.position ? ' · ' : ''}
                      {p.position ? posLabel[p.position] : ''}
                    </p>
                  </div>
                  {p.team?.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.team.logo_url} alt={p.team.name} className="w-7 h-7 object-contain shrink-0 rounded" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
