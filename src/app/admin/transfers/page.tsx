import Link from 'next/link'
import { getAllTransfersAdmin, getAllPlayersAdmin, getAllTeams } from '@/lib/queries'
import TransferForm from './TransferForm'

const TYPE_LABELS: Record<string, string> = {
  permanent: 'Signed',
  loan: 'Loan',
  'stand-in': 'Stand-in',
  free_agent: 'Free Agent',
  retired: 'Retired',
}

export default async function AdminTransfersPage() {
  const [transfers, players, teams] = await Promise.all([
    getAllTransfersAdmin().catch(() => []),
    getAllPlayersAdmin().catch(() => []),
    getAllTeams().catch(() => []),
  ])

  const playerOptions = players.map(p => ({
    slug: p.slug,
    ign: p.ign,
    photo_url: p.photo_url,
  }))

  const teamOptions = teams.map(t => ({
    name: t.name,
    logo_url: t.logo_url,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transfers</h1>
        <Link href="/admin" className="text-sm px-3 py-1.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
          ← Admin
        </Link>
      </div>

      {/* Add new transfer form */}
      <div className="rounded-xl p-5 mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Add Transfer</p>
        <TransferForm playerOptions={playerOptions} teamOptions={teamOptions} />
      </div>

      {/* Existing transfers */}
      <h2 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        All Transfers ({transfers.length})
      </h2>

      {transfers.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No transfers yet.</p>
      ) : (
        <div className="grid gap-2">
          {transfers.map(t => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-4 rounded-lg px-4 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-sm">{t.player_ign}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.from_team ?? '?'} → {t.to_team ?? '?'}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--muted))', color: 'var(--text-muted)' }}>
                  {TYPE_LABELS[t.type] ?? t.type}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: t.is_published ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                    color: t.is_published ? 'var(--correct)' : 'var(--text-muted)',
                  }}
                >
                  {t.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.transfer_date}</span>
                <Link
                  href={`/admin/transfers/${t.id}/edit`}
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
