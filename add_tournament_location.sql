-- Add location fields to tournaments table
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS location_name text,         -- e.g. "Birmingham, UK" or "Online"
  ADD COLUMN IF NOT EXISTS location_type text CHECK (location_type IN ('lan', 'online'));
