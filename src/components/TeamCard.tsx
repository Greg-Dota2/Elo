import { createAdminClient } from '@/lib/supabase/admin'

export default async function TeamCard({ slug }: { slug: string }) {
  const admin = createAdminClient()
  const { data: team } = await admin
    .from('teams')
    .select('name, slug, logo_url, region, current_elo')
    .eq('slug', slug)
    .single()

  if (!team) return null

  return (
    <a
      href={`/teams/${slug}`}
      className="flex items-center gap-4 rounded-2xl px-5 py-4 my-6 transition-opacity hover:opacity-80 no-underline"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', textDecoration: 'none' }}
    >
      {team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.logo_url}
          alt={team.name}
          className="w-14 h-14 rounded-xl object-contain shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', padding: '4px' }}
        />
      ) : (
        <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-2xl font-black" style={{ background: 'var(--surface-3)' }}>
          {team.name[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-lg leading-tight truncate" style={{ color: 'var(--text)' }}>
          {team.name}
        </p>
        <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
          {[team.region, team.current_elo ? `ELO ${Math.round(team.current_elo)}` : null].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className="ml-auto text-xs font-semibold shrink-0" style={{ color: 'hsl(var(--primary))' }}>
        View team →
      </span>
    </a>
  )
}
