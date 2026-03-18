import Link from 'next/link'
import { getAllTeamsAdmin } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function AdminTeamsPage() {
  const teams = await getAllTeamsAdmin()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Link
          href="/admin/teams/new"
          className="px-4 py-2 rounded font-semibold text-sm"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + New Team
        </Link>
      </div>

      {teams.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No teams yet.</p>
      ) : (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {teams.map((team, idx) => (
            <div
              key={team.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                borderBottom: idx < teams.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {/* Logo */}
              <div className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                {team.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-0.5" />
                ) : (
                  <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                    {team.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{team.name}</span>
                  {team.short_name && (
                    <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>({team.short_name})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {team.region && (
                    <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{team.region}</span>
                  )}
                  {team.slug && (
                    <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>/{team.slug}</span>
                  )}
                </div>
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: team.is_active ? 'var(--correct-dim)' : 'var(--surface-2)',
                    color: team.is_active ? 'var(--correct)' : 'var(--text-muted)',
                  }}
                >
                  {team.is_active ? 'Active' : 'Inactive'}
                </span>
                {team.bio && (
                  <span className="text-xs px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: 'var(--surface-2)', color: 'var(--text-subtle)' }}>
                    Has bio
                  </span>
                )}
              </div>

              <Link
                href={`/admin/teams/${team.id}/edit`}
                className="text-xs px-3 py-1.5 rounded font-medium shrink-0"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
