import { getAllTeams } from '@/lib/queries'
import PlayerForm from '../PlayerForm'

export default async function NewPlayerPage() {
  const teams = await getAllTeams().catch(() => [])
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New Player</h1>
      <PlayerForm teams={teams} />
    </div>
  )
}
