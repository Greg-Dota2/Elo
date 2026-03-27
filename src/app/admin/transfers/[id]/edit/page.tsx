import { notFound } from 'next/navigation'
import { getAllTransfersAdmin, getAllPlayersAdmin, getAllTeams } from '@/lib/queries'
import TransferForm from '../../TransferForm'

export default async function EditTransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [transfers, players, teams] = await Promise.all([
    getAllTransfersAdmin().catch(() => []),
    getAllPlayersAdmin().catch(() => []),
    getAllTeams().catch(() => []),
  ])

  const transfer = transfers.find(t => t.id === id)
  if (!transfer) notFound()

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
      <h1 className="text-2xl font-bold mb-6">Edit Transfer — {transfer.player_ign}</h1>
      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <TransferForm transfer={transfer} playerOptions={playerOptions} teamOptions={teamOptions} />
      </div>
    </div>
  )
}
