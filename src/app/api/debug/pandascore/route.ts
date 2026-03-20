import { NextResponse } from 'next/server'

const BASE = 'https://api.pandascore.co'
const TOKEN = process.env.PANDASCORE_API_KEY!

export const dynamic = 'force-dynamic'

export async function GET() {
  // Fetch all upcoming dota2 matches (no league filter) to find real PandaScore league IDs
  const allUpcomingUrl = new URL(`${BASE}/dota2/matches/upcoming`)
  allUpcomingUrl.searchParams.set('token', TOKEN)
  allUpcomingUrl.searchParams.set('per_page', '50')
  allUpcomingUrl.searchParams.set('sort', 'scheduled_at')
  const allUpcomingRes = await fetch(allUpcomingUrl.toString())
  const allUpcoming = allUpcomingRes.ok ? await allUpcomingRes.json() : { error: await allUpcomingRes.text() }

  // Also fetch running matches without filter
  const allRunningUrl = new URL(`${BASE}/dota2/matches/running`)
  allRunningUrl.searchParams.set('token', TOKEN)
  allRunningUrl.searchParams.set('per_page', '20')
  const allRunningRes = await fetch(allRunningUrl.toString())
  const allRunning = allRunningRes.ok ? await allRunningRes.json() : { error: await allRunningRes.text() }

  // Fetch recent leagues sorted by newest
  const leagueUrl = new URL(`${BASE}/dota2/leagues`)
  leagueUrl.searchParams.set('token', TOKEN)
  leagueUrl.searchParams.set('per_page', '20')
  leagueUrl.searchParams.set('sort', '-id')
  const leagueRes = await fetch(leagueUrl.toString())
  const leagues = leagueRes.ok ? await leagueRes.json() : { error: await leagueRes.text() }

  type PSMatchRaw = { id: number; name: string; status: string; scheduled_at: string | null; league: { id: number; name: string }; serie: { full_name: string } }
  type PSLeagueRaw = { id: number; name: string }

  return NextResponse.json({
    upcoming_matches: Array.isArray(allUpcoming)
      ? allUpcoming.map((m: PSMatchRaw) => ({ match_id: m.id, name: m.name, status: m.status, scheduled_at: m.scheduled_at, league_id: m.league.id, league_name: m.league.name, serie: m.serie?.full_name }))
      : allUpcoming,
    running_matches: Array.isArray(allRunning)
      ? allRunning.map((m: PSMatchRaw) => ({ match_id: m.id, name: m.name, status: m.status, scheduled_at: m.scheduled_at, league_id: m.league.id, league_name: m.league.name, serie: m.serie?.full_name }))
      : allRunning,
    recent_leagues: Array.isArray(leagues)
      ? leagues.map((l: PSLeagueRaw) => ({ id: l.id, name: l.name }))
      : leagues,
  })
}
