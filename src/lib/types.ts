export interface Team {
  id: string
  slug: string | null
  name: string
  short_name: string | null
  region: string | null
  logo_url: string | null
  banner_url: string | null
  liquipedia_url: string | null
  website_url: string | null
  bio: string | null
  achievements: string | null
  founded_year: number | null
  opendota_team_id: number | null
  current_elo: number
  is_active: boolean
  created_at: string
}

export interface Tournament {
  id: string
  slug: string
  name: string
  tier: number
  logo_url: string | null
  banner_url: string | null
  overview: string | null
  format: string | null
  start_date: string | null
  end_date: string | null
  prize_pool_usd: number | null
  liquipedia_url: string | null
  telegram_url: string | null
  opendota_league_id: number | null
  is_published: boolean
  created_at: string
}

export interface Stage {
  id: string
  tournament_id: string
  name: string
  stage_order: number
  stage_date: string | null
}

export interface MatchPrediction {
  id: string
  tournament_id: string
  stage_id: string | null
  team_1_id: string
  team_2_id: string
  predicted_winner_id: string | null
  predicted_draw: boolean
  best_of: number
  match_order: number | null
  score_team_1: number | null
  score_team_2: number | null
  actual_winner_id: string | null
  pre_analysis: string | null
  post_commentary: string | null
  is_correct: boolean | null
  match_date: string | null
  match_time: string | null
  twitch_url: string | null
  opendota_series_id: number | null
  pandascore_match_id: number | null
  dotabuff_game_ids: number[] | null
  is_published: boolean
  created_at: string
  // joined
  team_1?: Team
  team_2?: Team
  predicted_winner?: Team | null
  actual_winner?: Team | null
  stage?: Stage | null
}

export interface Player {
  id: string
  slug: string
  ign: string
  full_name: string | null
  team_id: string | null
  position: number | null
  nationality: string | null
  date_of_birth: string | null
  photo_url: string | null
  bio: string | null
  signature_heroes: string[] | null
  achievements: string | null
  previous_teams: string | null
  liquipedia_url: string | null
  opendota_id: number | null
  is_published: boolean
  created_at: string
  // joined
  team?: { id: string; name: string; logo_url: string | null; slug: string | null } | null
}

export interface Transfer {
  id: string
  player_ign: string
  player_slug: string | null
  player_photo_url: string | null
  from_team: string | null
  from_team_logo_url: string | null
  to_team: string | null
  to_team_logo_url: string | null
  transfer_date: string
  type: 'permanent' | 'loan' | 'stand-in' | 'free_agent' | 'retired'
  notes: string | null
  is_published: boolean
  created_at: string
}

export interface TournamentStats {
  tournament_id: string
  name: string
  total_predictions: number
  correct: number
  wrong: number
  accuracy_pct: number | null
}

export interface TeamAccuracy {
  tournament_id: string
  team_id: string
  team_name: string
  team_slug: string | null
  logo_url: string | null
  predictions_involving: number
  correct: number
  accuracy_pct: number | null
}
