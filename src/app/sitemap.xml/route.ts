import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllHeroes, heroSlug } from '@/lib/heroes'
import { fetchAllItems } from '@/lib/items'
import { getCachedHeroes, getCachedItems } from '@/lib/game-cache'

export const revalidate = 3600

const SITE_URL = 'https://www.dota2protips.com'

const HERO_SLUG_FALLBACK = [
  'abaddon','alchemist','ancient_apparition','antimage','arc_warden','axe','bane',
  'batrider','beastmaster','bloodseeker','bounty_hunter','brewmaster','bristleback',
  'broodmother','centaur','chaos_knight','chen','clinkz','rattletrap',
  'crystal_maiden','dark_seer','dark_willow','dawnbreaker','dazzle','death_prophet',
  'disruptor','doom_bringer','dragon_knight','drow_ranger','earth_spirit','earthshaker',
  'elder_titan','ember_spirit','enchantress','enigma','faceless_void','grimstroke',
  'gyrocopter','hoodwink','huskar','invoker','wisp','jakiro','juggernaut','keeper_of_the_light',
  'kez','kunkka','legion_commander','leshrac','lich','life_stealer','lina','lion',
  'lone_druid','luna','lycan','magnataur','marci','mars','medusa','meepo','mirana',
  'monkey_king','morphling','muerta','naga_siren','furion','necrolyte','nevermore',
  'night_stalker','nyx_assassin','ogre_magi','omniknight','oracle','obsidian_destroyer',
  'pangolier','phantom_assassin','phantom_lancer','phoenix','primal_beast','puck','pudge',
  'pugna','queenofpain','razor','riki','ringmaster','rubick','sand_king','shadow_demon',
  'shadow_shaman','silencer','skeleton_king','skywrath_mage','slardar',
  'slark','snapfire','sniper','spectre','spirit_breaker','storm_spirit','sven','templar_assassin',
  'terrorblade','tidehunter','shredder','tinker','tiny','treant','troll_warlord','tusk',
  'abyssal_underlord','undying','ursa','vengefulspirit','venomancer','viper','visage','void_spirit',
  'warlock','weaver','windrunner','winter_wyvern','witch_doctor','zuus',
]

const ITEM_KEY_FALLBACK = [
  'abyssal_blade','aegis','aghanims_shard','arcane_blink','arcane_boots','armlet',
  'assault','bfury','black_king_bar','blade_mail','blight_stone','blitz_knuckles',
  'bloodstone','bloodthorn','boots','boots_of_bearing','bottle','bracer','brooch',
  'broom_handle','butterfly','circlet','clarity','claymore','cloak','cornucopia',
  'crimson_guard','crown','cyclone','dagon','desolator','diffusal_blade','disperser',
  'dragon_lance','dust','echo_sabre','ethereal_blade','eternal_shroud','falcon_blade',
  'force_staff','ghost','gleipnir','glimmer_cape','gloves','hand_of_midas','headdress',
  'heart','helm_of_iron_will','helm_of_the_dominator','helm_of_the_overlord','hood_of_defiance',
  'hyperstone','infused_raindrop','iron_branch','javelin','kaya','kaya_and_sange',
  'keen_optic','lance_of_pursuit','lesser_crit','life_stealer','linkens_sphere',
  'magic_stick','magic_wand','maelstrom','manta','mantle','mekansm','meteor_hammer',
  'mjollnir','monkey_king_bar','moon_shard','morbid_mask','mystic_staff',
  'null_talisman','oblivion_staff','octarine_core','ogre_axe','orchid','orb_of_corrosion',
  'orb_of_venom','overwhelming_blink','phase_boots','pipe','platemail','power_treads',
  'quarterstaff','quickening_charm','quelling_blade','radiance','rapier','reaver',
  'refresher','revenant_brooch','ring_of_basilius','ring_of_health','ring_of_regen',
  'ring_of_tarrasque','robe','rod_of_atos','sacred_arrow','sange','sange_and_yasha',
  'satanic','scythe','shadow_amulet','shadow_blade','shivas_guard','skadi',
  'skull_basher','slippers','smoke_of_deceit','solar_crest','soul_booster','soul_ring',
  'sphere','staff_of_wizardry','stout_shield','suitcase','swift_blink','talisman_of_evasion',
  'tarrasque','travel_boots','ultimate_scepter','ultimate_scepter_2','urn_of_shadows',
  'vampire_fangs','vanguard','veil_of_discord','vladmir','void_stone','ward_dispenser',
  'ward_observer','ward_sentry','wind_lace','wind_waker','witch_blade','wraith_band','yasha',
  'yasha_and_kaya',
]

type Alternate = { hreflang: string; href: string }

function urlBlock(
  loc: string,
  lastmod: Date,
  changefreq: string,
  priority: number,
  alternates?: Alternate[],
): string {
  const altLines = (alternates ?? [])
    .map(a => `  <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`)
    .join('\n')
  return (
    `<url>\n` +
    `  <loc>${loc}</loc>\n` +
    `  <lastmod>${lastmod.toISOString()}</lastmod>\n` +
    `  <changefreq>${changefreq}</changefreq>\n` +
    `  <priority>${priority}</priority>\n` +
    (altLines ? altLines + '\n' : '') +
    `</url>\n`
  )
}

function bilingualAlts(enUrl: string, ruUrl: string): Alternate[] {
  return [
    { hreflang: 'en', href: enUrl },
    { hreflang: 'ru', href: ruUrl },
    { hreflang: 'x-default', href: enUrl },
  ]
}

function latestDate(timestamps: (string | null | undefined)[], fallback: Date): Date {
  const ms = timestamps.filter(Boolean).map(d => new Date(d!).getTime())
  return ms.length > 0 ? new Date(Math.max(...ms)) : fallback
}

export async function GET() {
  const supabase = createAdminClient()

  const [
    { data: tournaments },
    { data: teams },
    { data: players },
    { data: heroGuides },
    { data: itemGuides },
  ] = await Promise.all([
    supabase.from('tournaments').select('slug, updated_at').eq('is_published', true),
    supabase.from('teams').select('slug, created_at').not('slug', 'is', null),
    supabase.from('players').select('slug, created_at').eq('is_published', true).not('slug', 'is', null),
    supabase.from('hero_guides').select('updated_at').order('updated_at', { ascending: false }).limit(1),
    supabase.from('item_guides').select('updated_at').order('updated_at', { ascending: false }).limit(1),
  ])

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('is_published', true)

  let heroSlugs: string[] = HERO_SLUG_FALLBACK
  let itemKeys: string[] = ITEM_KEY_FALLBACK
  try {
    const [cachedHeroes, cachedItems] = await Promise.all([getCachedHeroes(), getCachedItems()])
    const [heroes, items] = await Promise.all([
      cachedHeroes ?? fetchAllHeroes(),
      cachedItems ?? fetchAllItems(),
    ])
    if (heroes.length > 0) heroSlugs = heroes.map(h => heroSlug(h.name))
    if (items.length > 0) itemKeys = items.map(i => i.key)
  } catch {
    // static fallback lists ensure sitemap stays complete
  }

  const now = new Date()

  // Content-driven lastmod for index pages
  const heroLastMod = latestDate([heroGuides?.[0]?.updated_at], now)
  const itemLastMod = latestDate([itemGuides?.[0]?.updated_at], now)
  const tournamentsLastMod = latestDate((tournaments ?? []).map(t => t.updated_at), now)
  const postsLastMod = latestDate((posts ?? []).map(p => p.updated_at), now)
  const teamsLastMod = latestDate((teams ?? []).map(t => t.created_at), now)
  const playersLastMod = latestDate((players ?? []).map(p => p.created_at), now)
  const homepageLastMod = new Date(Math.max(
    tournamentsLastMod.getTime(),
    postsLastMod.getTime(),
    heroLastMod.getTime(),
  ))

  let xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`

  // Homepage
  xml += urlBlock(`${SITE_URL}`, homepageLastMod, 'daily', 1)

  // /tournaments index (EN + RU bilingual)
  xml += urlBlock(
    `${SITE_URL}/tournaments`, tournamentsLastMod, 'daily', 0.9,
    bilingualAlts(`${SITE_URL}/tournaments`, `${SITE_URL}/ru/tournaments`),
  )
  xml += urlBlock(
    `${SITE_URL}/ru/tournaments`, tournamentsLastMod, 'daily', 0.85,
    bilingualAlts(`${SITE_URL}/tournaments`, `${SITE_URL}/ru/tournaments`),
  )

  // /blog index (EN + RU bilingual)
  xml += urlBlock(
    `${SITE_URL}/blog`, postsLastMod, 'weekly', 0.8,
    bilingualAlts(`${SITE_URL}/blog`, `${SITE_URL}/ru/blog`),
  )
  xml += urlBlock(
    `${SITE_URL}/ru/blog`, postsLastMod, 'weekly', 0.75,
    bilingualAlts(`${SITE_URL}/blog`, `${SITE_URL}/ru/blog`),
  )

  // Static EN-only pages
  xml += urlBlock(`${SITE_URL}/teams`, teamsLastMod, 'weekly', 0.8)
  xml += urlBlock(`${SITE_URL}/players`, playersLastMod, 'weekly', 0.8)
  xml += urlBlock(`${SITE_URL}/rankings`, tournamentsLastMod, 'daily', 0.7)
  xml += urlBlock(`${SITE_URL}/track-record`, tournamentsLastMod, 'daily', 0.8)
  xml += urlBlock(`${SITE_URL}/heroes`, heroLastMod, 'weekly', 0.8)
  xml += urlBlock(`${SITE_URL}/items`, itemLastMod, 'weekly', 0.8)
  xml += urlBlock(`${SITE_URL}/transfers`, teamsLastMod, 'weekly', 0.7)
  xml += urlBlock(`${SITE_URL}/about`, now, 'monthly', 0.5)
  xml += urlBlock(`${SITE_URL}/terms-of-use`, now, 'monthly', 0.3)

  // Individual hero pages (EN only — no /ru/heroes routes exist)
  for (const slug of heroSlugs) {
    xml += urlBlock(`${SITE_URL}/heroes/${slug}`, heroLastMod, 'weekly', 0.75)
  }

  // Individual item pages (EN only — no /ru/items routes exist)
  for (const key of itemKeys) {
    xml += urlBlock(`${SITE_URL}/items/${key}`, itemLastMod, 'weekly', 0.6)
  }

  // Individual tournament pages (EN + RU bilingual)
  for (const t of tournaments ?? []) {
    const lastMod = t.updated_at ? new Date(t.updated_at) : now
    const enUrl = `${SITE_URL}/tournaments/${t.slug}`
    const ruUrl = `${SITE_URL}/ru/tournaments/${t.slug}`
    const alts = bilingualAlts(enUrl, ruUrl)
    xml += urlBlock(enUrl, lastMod, 'daily', 0.85, alts)
    xml += urlBlock(ruUrl, lastMod, 'daily', 0.8, alts)
  }

  // Team pages (EN only)
  for (const t of teams ?? []) {
    xml += urlBlock(
      `${SITE_URL}/teams/${t.slug}`,
      t.created_at ? new Date(t.created_at) : now,
      'weekly', 0.7,
    )
  }

  // Player pages (EN only)
  for (const p of players ?? []) {
    xml += urlBlock(
      `${SITE_URL}/players/${p.slug}`,
      p.created_at ? new Date(p.created_at) : now,
      'weekly', 0.6,
    )
  }

  // Blog posts (EN + RU bilingual)
  for (const p of posts ?? []) {
    const lastMod = p.updated_at ? new Date(p.updated_at) : now
    const enUrl = `${SITE_URL}/blog/${p.slug}`
    const ruUrl = `${SITE_URL}/ru/blog/${p.slug}`
    const alts = bilingualAlts(enUrl, ruUrl)
    xml += urlBlock(enUrl, lastMod, 'monthly', 0.7, alts)
    xml += urlBlock(ruUrl, lastMod, 'monthly', 0.65, alts)
  }

  xml += `</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
