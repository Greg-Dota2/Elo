import Link from 'next/link'
import { fetchAllHeroes, heroSlug, heroPortraitUrl, ATTR_CONFIG } from '@/lib/heroes'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminHeroesPage() {
  let heroes: Awaited<ReturnType<typeof fetchAllHeroes>> = []
  try { heroes = await fetchAllHeroes() } catch { /* API may be unavailable */ }

  const supabase = createAdminClient()
  const { data: guides } = await supabase.from('hero_guides').select('hero_id')
  const hasGuide = new Set((guides ?? []).map(g => g.hero_id))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Hero Guides</h1>
        <Link href="/admin" className="text-sm" style={{ color: 'var(--text-muted)' }}>← Admin</Link>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Add &ldquo;When to pick&rdquo; and tips for heroes. Focus on popular or frequently-searched heroes first.
      </p>
      <div className="grid gap-2">
        {heroes.map(hero => {
          const slug = heroSlug(hero.name)
          const cfg = ATTR_CONFIG[hero.primary_attr]
          return (
            <div
              key={hero.id}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-7 rounded-lg overflow-hidden shrink-0 border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroPortraitUrl(slug)} alt={hero.localized_name} className="w-full h-full object-cover object-center" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{hero.localized_name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                    {cfg.short}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasGuide.has(hero.id) && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--correct)' }}>
                    Has guide
                  </span>
                )}
                <Link
                  href={`/admin/heroes/${slug}/guide`}
                  className="text-xs px-3 py-1.5 rounded"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                >
                  Edit guide
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
