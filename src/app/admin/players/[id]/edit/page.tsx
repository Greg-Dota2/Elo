import { getAllPlayersAdmin, getAllTeams } from '@/lib/queries'
import { notFound } from 'next/navigation'
import PlayerForm from '../../PlayerForm'

interface Props { params: Promise<{ id: string }> }

export default async function EditPlayerPage({ params }: Props) {
  const { id } = await params
  const [players, teams] = await Promise.all([
    getAllPlayersAdmin().catch(() => []),
    getAllTeams().catch(() => []),
  ])
  const player = players.find(p => p.id === id)
  if (!player) notFound()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit — {player.ign}</h1>
      <PlayerForm player={player} teams={teams} />
    </div>
  )
}
