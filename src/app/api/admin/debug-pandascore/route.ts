import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const TOKEN = process.env.PANDASCORE_API_KEY!
  const url = new URL('https://api.pandascore.co/dota2/matches/upcoming')
  url.searchParams.set('token', TOKEN)
  url.searchParams.set('per_page', '50')
  url.searchParams.set('sort', 'scheduled_at')

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) return NextResponse.json({ error: `PandaScore ${res.status}` }, { status: 500 })

  const matches = await res.json()
  const summary = matches.map((m: {
    id: number; name: string; scheduled_at: string | null;
    league: { id: number; name: string }
    serie: { id: number; full_name: string }
    tournament: { id: number; name: string }
  }) => ({
    match_id: m.id,
    name: m.name,
    scheduled_at: m.scheduled_at,
    league_id: m.league.id,
    league_name: m.league.name,
    serie_id: m.serie.id,
    serie_name: m.serie.full_name,
    tournament_id: m.tournament.id,
    tournament_name: m.tournament.name,
  }))

  return NextResponse.json(summary)
}
