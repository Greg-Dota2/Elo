import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllHeroes, heroSlug } from '@/lib/heroes'
import { fetchAllItems } from '@/lib/items'

const SITE_URL = 'https://dota2protips.com'

// Fallback hero slugs — used if OpenDota API is unavailable at sitemap generation time.
// Update occasionally as new heroes ship.
const HERO_SLUG_FALLBACK = [
  'abaddon','alchemist','ancient_apparition','anti_mage','arc_warden','axe','bane',
  'batrider','beastmaster','bloodseeker','bounty_hunter','brewmaster','bristleback',
  'broodmother','centaur_warrunner','chaos_knight','chen','clinkz','clockwerk',
  'crystal_maiden','dark_seer','dark_willow','dawnbreaker','dazzle','death_prophet',
  'disruptor','doom_bringer','dragon_knight','drow_ranger','earth_spirit','earthshaker',
  'elder_titan','ember_spirit','enchantress','enigma','faceless_void','grimstroke',
  'gyrocopter','hoodwink','huskar','invoker','io','jakiro','juggernaut','keeper_of_the_light',
  'kez','kunkka','legion_commander','leshrac','lich','lifestealer','lina','lion',
  'lone_druid','luna','lycan','magnataur','marci','mars','medusa','meepo','mirana',
  'monkey_king','morphling','muerta','naga_siren','natures_prophet','necrolyte','nevermore',
  'night_stalker','nyx_assassin','ogre_magi','omniknight','oracle','outworld_destroyer',
  'pangolier','phantom_assassin','phantom_lancer','phoenix','primal_beast','puck','pudge',
  'pugna','queen_of_pain','razor','riki','ringmaster','rubick','sand_king','shadow_demon',
  'shadow_fiend','shadow_shaman','silencer','skeletonking','skywrath_mage','slardar',
  'slark','snapfire','sniper','spectre','spirit_breaker','storm_spirit','sven','templar_assassin',
  'terrorblade','tidehunter','timbersaw','tinker','tiny','treant','troll_warlord','tusk',
  'underlord','undying','ursa','vengefulspirit','venomancer','viper','visage','void_spirit',
  'warlock','weaver','windrunner','winter_wyvern','witch_doctor','wraith_king','zeus',
]

// Fallback item keys — used if OpenDota API is unavailable.
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
  'mjollnir','monkey_king_bar','moon_shard','moon_shard','morbid_mask','mystic_staff',
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()

  const [{ data: tournaments }, { data: teams }, { data: players }] = await Promise.all([
    supabase.from('tournaments').select('slug').eq('is_published', true),
    supabase.from('teams').select('slug, created_at').not('slug', 'is', null),
    supabase.from('players').select('slug, created_at').eq('is_published', true).not('slug', 'is', null),
  ])

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('is_published', true)

  // Fetch heroes and items from API, fall back to static lists if unavailable
  let heroSlugs: string[] = HERO_SLUG_FALLBACK
  let itemKeys: string[] = ITEM_KEY_FALLBACK
  try {
    const [heroes, items] = await Promise.all([fetchAllHeroes(), fetchAllItems()])
    if (heroes.length > 0) heroSlugs = heroes.map(h => heroSlug(h.name))
    if (items.length > 0) itemKeys = items.map(i => i.key)
  } catch {
    // API unavailable — fallback lists ensure sitemap stays complete
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/tournaments`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/teams`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/players`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/rankings`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/track-record`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/heroes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/items`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/transfers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms-of-use`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  const heroRoutes: MetadataRoute.Sitemap = heroSlugs.map(slug => ({
    url: `${SITE_URL}/heroes/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  const itemRoutes: MetadataRoute.Sitemap = itemKeys.map(key => ({
    url: `${SITE_URL}/items/${key}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const tournamentRoutes: MetadataRoute.Sitemap = (tournaments ?? []).map(t => ({
    url: `${SITE_URL}/tournaments/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.85,
  }))

  const teamRoutes: MetadataRoute.Sitemap = (teams ?? []).map(t => ({
    url: `${SITE_URL}/teams/${t.slug}`,
    lastModified: t.created_at ? new Date(t.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const playerRoutes: MetadataRoute.Sitemap = (players ?? []).map(p => ({
    url: `${SITE_URL}/players/${p.slug}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const blogRoutes: MetadataRoute.Sitemap = (posts ?? []).map(p => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...heroRoutes, ...itemRoutes, ...tournamentRoutes, ...teamRoutes, ...playerRoutes, ...blogRoutes]
}
