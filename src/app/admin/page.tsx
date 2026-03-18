import Link from 'next/link'
import { getAllTournamentsAdmin } from '@/lib/queries'
import RecalcEloButton from './RecalcEloButton'
import SeedEloButton from './SeedEloButton'
import SyncScheduleButton from './SyncScheduleButton'

export default async function AdminPage() {
  let tournaments: Awaited<ReturnType<typeof getAllTournamentsAdmin>> = []

  try {
    tournaments = await getAllTournamentsAdmin()
  } catch {
    // Supabase not configured yet
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 mb-8">
        <Link
          href="/admin/tournaments/new"
          className="rounded-lg p-4 text-center transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="text-2xl mb-1">🏆</div>
          <div className="font-semibold text-sm">New Tournament</div>
        </Link>
        <Link
          href="/admin/teams"
          className="rounded-lg p-4 text-center transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="text-2xl mb-1">🛡️</div>
          <div className="font-semibold text-sm">Teams</div>
        </Link>
        <Link
          href="/admin/players"
          className="rounded-lg p-4 text-center transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="text-2xl mb-1">🎮</div>
          <div className="font-semibold text-sm">Players</div>
        </Link>
        <Link
          href="/admin/matches/new"
          className="rounded-lg p-4 text-center transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="text-2xl mb-1">⚔️</div>
          <div className="font-semibold text-sm">New Prediction</div>
        </Link>
        <RecalcEloButton />
        <SeedEloButton />
        <SyncScheduleButton />
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Tournaments
      </h2>
      {tournaments.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No tournaments yet.</p>
      ) : (
        <div className="grid gap-2">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div>
                <span className="font-medium text-sm">{t.name}</span>
                <span
                  className="ml-2 text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: t.is_published ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                    color: t.is_published ? 'var(--correct)' : 'var(--text-muted)',
                  }}
                >
                  {t.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/matches/new?tournament=${t.id}`}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                >
                  + Prediction
                </Link>
                <Link
                  href={`/admin/tournaments/${t.id}/edit`}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
