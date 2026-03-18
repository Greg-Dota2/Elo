import { TIER1_TOURNAMENTS } from './tier1tournaments'

const BASE = 'https://api.pandascore.co'
const TOKEN = process.env.PANDASCORE_API_KEY!
const TIER1_LEAGUE_IDS = TIER1_TOURNAMENTS.map((t) => t.league_id)

export interface PSTeam {
  id: number
  name: string
  acronym: string | null
  image_url: string | null
}

export interface PSMatch {
  id: number
  name: string
  status: 'not_started' | 'running' | 'finished'
  number_of_games: number
  scheduled_at: string | null
  begin_at: string | null
  opponents: Array<{ opponent: PSTeam }>
  results: Array<{ team_id: number; score: number }>
  tournament: {
    id: number
    name: string
    tier: string
    region: string | null
    image_url: string | null
  }
  league: {
    id: number
    name: string
    image_url: string | null
  }
  serie: {
    id: number
    full_name: string
    image_url: string | null
  }
  streams_list: Array<{
    main: boolean
    official: boolean
    language: string
    raw_url: string
  }>
}


export async function fetchUpcomingTier1Matches(perPage = 100): Promise<PSMatch[]> {
  const url = new URL(`${BASE}/dota2/matches/upcoming`)
  url.searchParams.set('token', TOKEN)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('filter[league_id]', TIER1_LEAGUE_IDS.join(','))
  url.searchParams.set('sort', 'scheduled_at')

  const res = await fetch(url.toString(), { next: { revalidate: 900 } })
  if (!res.ok) throw new Error(`PandaScore error ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function fetchRecentTier1Matches(perPage = 50): Promise<PSMatch[]> {
  const url = new URL(`${BASE}/dota2/matches/past`)
  url.searchParams.set('token', TOKEN)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('filter[league_id]', TIER1_LEAGUE_IDS.join(','))
  url.searchParams.set('sort', '-begin_at')

  const res = await fetch(url.toString(), { next: { revalidate: 900 } })
  if (!res.ok) throw new Error(`PandaScore error ${res.status}: ${await res.text()}`)
  return res.json()
}
