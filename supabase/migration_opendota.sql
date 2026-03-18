-- Run this if you already created the schema and need to add OpenDota columns
ALTER TABLE teams        ADD COLUMN IF NOT EXISTS opendota_team_id   BIGINT UNIQUE;
ALTER TABLE tournaments  ADD COLUMN IF NOT EXISTS opendota_league_id  INTEGER;
ALTER TABLE match_predictions ADD COLUMN IF NOT EXISTS opendota_series_id BIGINT UNIQUE;
