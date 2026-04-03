import { notFound } from 'next/navigation'
import { fetchAllHeroes, heroSlug, heroPortraitUrl } from '@/lib/heroes'
import { fetchHeroGuide } from '@/lib/guides'
import HeroGuideForm from './HeroGuideForm'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function HeroGuidePage({ params }: Props) {
  const { slug } = await params

  let heroes: Awaited<ReturnType<typeof fetchAllHeroes>> = []
  try { heroes = await fetchAllHeroes() } catch { notFound() }

  const hero = heroes.find(h => heroSlug(h.name) === slug)
  if (!hero) notFound()

  const guide = await fetchHeroGuide(hero.id).catch(() => null)

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-16 h-9 rounded-lg overflow-hidden border border-[var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroPortraitUrl(slug)} alt={hero.localized_name} className="w-full h-full object-cover object-center" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{hero.localized_name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Hero guide · <a href={`/heroes/${slug}`} target="_blank" className="underline">View page</a></p>
        </div>
      </div>
      <HeroGuideForm heroId={hero.id} heroName={hero.name} initial={guide} />
    </div>
  )
}
