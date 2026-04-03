import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MatchPrediction, Player, TeamAccuracy, Transfer, TournamentStats } from '@/lib/types'

export function sortMatchesByStatus(matches: MatchPrediction[]): MatchPrediction[] {
  const now = new Date()
  const priority = (m: MatchPrediction) => {
    if (m.score_team_1 !== null && m.score_team_2 !== null) return 2 // finished
    const matchStart = m.match_date && m.match_time
      ? new Date(`${m.match_date}T${m.match_time}:00Z`)
      : null
    return matchStart && now >= matchStart ? 0 : 1 // 0=live, 1=upcoming
  }
  return [...matches].sort((a, b) => {
    const pa = priority(a)
    const pb = priority(b)
    if (pa !== pb) return pa - pb
    // Within finished matches: newest date first, then reverse match_order
    if (pa === 2) {
      const da = a.match_date ?? ''
      const db = b.match_date ?? ''
      if (db !== da) return db.localeCompare(da)
      return (b.match_order ?? 0) - (a.match_order ?? 0)
    }
    return 0
  })
}

export async function getTournaments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select('*, match_predictions(id)')
    .eq('is_published', true)
  if (error) throw error
  // Tournaments with predictions come before those without, then sort by start_date desc
  return (data ?? []).sort((a, b) => {
    const aHas = (a.match_predictions?.length ?? 0) > 0 ? 0 : 1
    const bHas = (b.match_predictions?.length ?? 0) > 0 ? 0 : 1
    if (aHas !== bHas) return aHas - bHas
    if (!a.start_date && !b.start_date) return 0
    if (!a.start_date) return 1
    if (!b.start_date) return -1
    return a.start_date > b.start_date ? -1 : 1
  })
}

export async function getTournamentBySlug(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function getStagesByTournament(tournamentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('stage_order', { ascending: false })
  if (error) throw error
  return data
}

export async function getPredictionsByTournament(
  tournamentId: string
): Promise<MatchPrediction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('match_predictions')
    .select(
      `*,
      team_1:teams!match_predictions_team_1_id_fkey(*),
      team_2:teams!match_predictions_team_2_id_fkey(*),
      predicted_winner:teams!match_predictions_predicted_winner_id_fkey(*),
      actual_winner:teams!match_predictions_actual_winner_id_fkey(*),
      stage:stages(*)`
    )
    .eq('tournament_id', tournamentId)
    .eq('is_published', true)
    .order('match_date', { ascending: true })
    .order('match_order', { ascending: true, nullsFirst: false })
    .order('pandascore_match_id', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data as MatchPrediction[]
}

export async function getTournamentStats(
  tournamentId: string
): Promise<TournamentStats | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tournament_stats')
    .select('*')
    .eq('tournament_id', tournamentId)
    .single()
  if (error) return null
  return data
}

export async function getTeamAccuracy(
  tournamentId: string,
  limit = 3
): Promise<TeamAccuracy[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('team_accuracy')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('accuracy_pct', { ascending: false })
    .limit(limit)
  if (error || !data?.length) return []

  const teamIds = data.map(r => r.team_id)
  const { data: teams } = await supabase
    .from('teams')
    .select('id, slug')
    .in('id', teamIds)

  const slugMap = new Map((teams ?? []).map(t => [t.id, t.slug]))
  return data.map(r => ({ ...r, team_slug: slugMap.get(r.team_id) ?? null }))
}

export async function getAllTeams() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function getTeamBySlug(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function getAllTeamsAdmin() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function getAllTournamentsAdmin() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getPlayers(): Promise<Player[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*, team:teams(id, name, logo_url, slug)')
    .eq('is_published', true)
    .order('ign')
  if (error) throw error
  return data as Player[]
}

export async function getPlayerBySlug(slug: string): Promise<Player> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*, team:teams(id, name, logo_url, slug)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (error) throw error
  return data as Player
}

export async function getPlayersBySignatureHero(heroName: string): Promise<Player[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('players')
    .select('ign, slug, photo_url, position, team:teams(name, slug, logo_url)')
    .eq('is_published', true)
    .contains('signature_heroes', [heroName])
    .order('ign')
  return (data ?? []) as unknown as Player[]
}

export async function getAllPlayersAdmin(): Promise<Player[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('players')
    .select('*, team:teams(id, name, logo_url, slug)')
    .order('ign')
  if (error) throw error
  return data as Player[]
}

export async function getPredictionById(id: string): Promise<MatchPrediction> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('match_predictions')
    .select(
      `*,
      team_1:teams!match_predictions_team_1_id_fkey(*),
      team_2:teams!match_predictions_team_2_id_fkey(*),
      stage:stages(*)`
    )
    .eq('id', id)
    .single()
  if (error) throw error
  return data as MatchPrediction
}

export async function getTransfers(): Promise<Transfer[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .eq('is_published', true)
    .order('transfer_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as Transfer[]
}

export async function getAllTransfersAdmin(): Promise<Transfer[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .order('transfer_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as Transfer[]
}
