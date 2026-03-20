import { NextRequest, NextResponse } from 'next/server'
import { getTournamentStats, getTeamAccuracy } from '@/lib/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tournamentId = searchParams.get('tournament_id')
  if (!tournamentId) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })

  const [stats, teamAccuracy] = await Promise.all([
    getTournamentStats(tournamentId),
    getTeamAccuracy(tournamentId, 3),
  ])

  return NextResponse.json({ stats, teamAccuracy })
}
