import { fetchAllHeroes, heroSlug, heroPortraitUrl, ATTR_CONFIG } from '@/lib/heroes'

export default async function HeroCard({ slug }: { slug: string }) {
  const heroes = await fetchAllHeroes()
  const hero = heroes.find(h => heroSlug(h.name) === slug)
  if (!hero) return null

  const portrait = heroPortraitUrl(slug)
  const attr = ATTR_CONFIG[hero.primary_attr]

  return (
    <a
      href={`/heroes/${slug}`}
      className="flex items-center gap-4 rounded-2xl px-5 py-4 my-6 transition-opacity hover:opacity-80 no-underline"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', textDecoration: 'none' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={portrait}
        alt={hero.localized_name}
        className="w-16 h-16 rounded-xl object-cover shrink-0"
        style={{ background: 'var(--surface-3)' }}
      />
      <div>
        <p className="font-display font-bold text-lg leading-tight" style={{ color: 'var(--text)' }}>
          {hero.localized_name}
        </p>
        <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
          {hero.attack_type} · {hero.roles.slice(0, 3).join(', ')}
        </p>
        <span
          className={`inline-block mt-1.5 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${attr.color} ${attr.bg}`}
        >
          {attr.label}
        </span>
      </div>
      <span className="ml-auto text-xs font-semibold" style={{ color: 'hsl(var(--primary))' }}>
        View hero →
      </span>
    </a>
  )
}
