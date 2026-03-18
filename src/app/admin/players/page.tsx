import { getAllPlayersAdmin } from '@/lib/queries'
import { getAllTeams } from '@/lib/queries'
import Link from 'next/link'

const POSITION_LABEL: Record<number, string> = { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Sup', 5: 'Hard Sup' }

export default async function AdminPlayersPage() {
  const [players, teams] = await Promise.all([
    getAllPlayersAdmin().catch(() => []),
    getAllTeams().catch(() => []),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Players ({players.length})</h1>
        <Link
          href="/admin/players/new"
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + New Player
        </Link>
      </div>

      {players.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No players yet.</p>
      ) : (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {players.map((p, i) => {
            const team = teams.find(t => t.id === p.team_id)
            return (
              <div
                key={p.id}
                className="flex items-center gap-4 px-4 py-3 text-sm"
                style={{
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                  borderBottom: i < players.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {p.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.ign} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-bold">{p.ign}</span>
                  {p.full_name && <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{p.full_name}</span>}
                </div>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {team?.name ?? '—'}
                </span>
                {p.position && (
                  <span className="text-xs px-2 py-0.5 rounded shrink-0" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                    {POSITION_LABEL[p.position]}
                  </span>
                )}
                <span
                  className="text-xs px-2 py-0.5 rounded shrink-0"
                  style={{
                    background: p.is_published ? 'var(--correct-dim)' : 'var(--surface-3)',
                    color: p.is_published ? 'var(--correct)' : 'var(--text-muted)',
                  }}
                >
                  {p.is_published ? 'Live' : 'Draft'}
                </span>
                <Link
                  href={`/admin/players/${p.id}/edit`}
                  className="text-xs px-3 py-1 rounded shrink-0"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                >
                  Edit
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
