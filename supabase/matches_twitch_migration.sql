-- Add twitch_url to match_predictions
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE match_predictions
  ADD COLUMN IF NOT EXISTS twitch_url TEXT;
