import { createAdminClient } from '@/lib/supabase/admin'

const REGION_FLAGS: Record<string, string> = {
  'Western Europe': '🌍',
  'Eastern Europe': '🌍',
  'China': '🇨🇳',
  'Southeast Asia': '🌏',
  'North America': '🇺🇸',
  'South America': '🇧🇷',
}

export default async function TeamCard({ slug, locale = 'en' }: { slug: string; locale?: 'en' | 'ru' }) {
  const admin = createAdminClient()

  const [{ data: team }, { data: allTeams }] = await Promise.all([
    admin.from('teams').select('name, slug, logo_url, region, current_elo').eq('slug', slug).single(),
    admin.from('teams').select('slug, current_elo').eq('is_active', true).order('current_elo', { ascending: false }),
  ])

  if (!team) return null

  const href = `${locale === 'ru' ? '/ru/teams' : '/teams'}/${slug}`
  const elo = team.current_elo ? Math.round(team.current_elo) : null
  const flag = team.region ? REGION_FLAGS[team.region] ?? '🌍' : null
  const rank = allTeams ? allTeams.findIndex(t => t.slug === slug) + 1 : null

  return (
    <a
      href={href}
      className="block rounded-2xl overflow-hidden my-6 no-underline group"
      style={{ border: '1px solid var(--border)', textDecoration: 'none' }}
    >
      {/* Main body */}
      <div
        className="relative flex items-center gap-5 px-6 py-5"
        style={{ background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface) 100%)' }}
      >
        {/* Glow */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-40 opacity-20"
          style={{ background: 'radial-gradient(ellipse at left center, hsl(var(--primary)), transparent 70%)' }}
        />

        {/* Logo */}
        <div
          className="relative w-20 h-20 rounded-2xl shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px' }}
        >
          {team.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" loading="lazy" />
          ) : (
            <span className="text-3xl font-black" style={{ color: 'var(--text-muted)' }}>{team.name[0]}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-display font-black text-2xl leading-tight truncate" style={{ color: 'var(--text)' }}>
            {team.name}
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {team.region && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"
                style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                {flag && <span>{flag}</span>}
                {team.region}
              </span>
            )}
            {elo && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5"
                style={{ background: 'hsl(var(--accent) / 0.12)', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--accent) / 0.3)' }}
              >
                {rank && rank > 0 && <span style={{ opacity: 0.7 }}>#{rank}</span>}
                <span>ELO {elo}</span>
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <span
          className="text-sm font-bold shrink-0 transition-transform group-hover:translate-x-1"
          style={{ color: 'hsl(var(--primary))' }}
        >
          →
        </span>
      </div>

      {/* Footer strip */}
      <div
        className="flex items-center justify-between px-6 py-2.5"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
          Team profile, roster & stats
        </span>
        <span className="text-xs font-bold" style={{ color: 'hsl(var(--primary) / 0.7)' }}>
          dota2protips.com
        </span>
      </div>
    </a>
  )
}
