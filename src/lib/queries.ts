import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MatchPrediction, Player, TeamAccuracy, TournamentStats } from '@/lib/types'

export async function getTournaments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('is_published', true)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data
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
    .order('stage_id', { ascending: false })
    .order('match_order', { ascending: true })
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
  if (error) return []
  return data
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
