import { notFound } from 'next/navigation'
import { getAllTeamsAdmin } from '@/lib/queries'
import TeamForm from '../../TeamForm'

export default async function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teams = await getAllTeamsAdmin()
  const team = teams.find(t => t.id === id)
  if (!team) notFound()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Team — {team.name}</h1>
      <TeamForm team={team} />
    </div>
  )
}
