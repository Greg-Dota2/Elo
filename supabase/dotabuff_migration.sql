-- Add Dotabuff game IDs to match_predictions
-- Each entry is a Dota 2 match ID (used to construct dotabuff.com/matches/{id} URLs)
ALTER TABLE match_predictions ADD COLUMN IF NOT EXISTS dotabuff_game_ids bigint[];
