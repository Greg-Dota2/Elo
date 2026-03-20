import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  fetchAllHeroes,
  fetchHeroDetail,
  heroSlug,
  heroPortraitUrl,
  ATTR_CONFIG,
  decodeBehavior,
  formatLevelValues,
  type ValveAbility,
} from '@/lib/heroes'
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
    const description = `${hero.localized_name} is a ${cfg.label} hero in Dota 2. ${hero.attack_type} attacker. Abilities, stats, and lore on Dota2ProTips.`
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
  if (ability.ability_is_granted_by_scepter) badges.push({ label: 'Aghanim\'s Scepter', className: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' })
  if (ability.ability_is_granted_by_shard) badges.push({ label: 'Aghanim\'s Shard', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' })

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
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{ability.desc_loc}</p>
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
              <span>{note.replace(/%(\w+)%%%/g, '$1')}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Lore */}
      {ability.lore_loc && (
        <p className="text-xs text-muted-foreground/50 italic pt-3 border-t border-border/40 leading-relaxed">
          {ability.lore_loc}
        </p>
      )}
    </div>
  )
}

export default async function HeroPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let heroes, detail
  try {
    heroes = await fetchAllHeroes()
  } catch {
    notFound()
  }

  const hero = heroes.find(h => heroSlug(h.name) === slug)
  if (!hero) notFound()

  try {
    detail = await fetchHeroDetail(hero.id)
  } catch {
    detail = null
  }

  const cfg = ATTR_CONFIG[hero.primary_attr]

  // Separate innate from regular abilities, skip scepter/shard grants (shown inline on base ability)
  const regularAbilities = (detail?.abilities ?? []).filter(
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

  return (
    <div className="fade-in-up">
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
              <span key={role} className="text-xs text-muted-foreground border border-border/50 px-2.5 py-0.5 rounded-full">
                {role}
              </span>
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
            {detail.facets.map(facet => (
              <div key={facet.id} className="rounded-xl border border-border/60 bg-card/60 p-4">
                <p className="font-display font-bold text-sm mb-1">{facet.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{facet.description}</p>
              </div>
            ))}
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
        <div>
          <p className="section-label mb-3">Abilities</p>
          <div className="space-y-3">
            {mainAbilities.map(ability => (
              <AbilityCard key={ability.id} ability={ability} />
            ))}
          </div>
        </div>
      )}

      {!detail && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Ability data temporarily unavailable.
        </div>
      )}
    </div>
  )
}
