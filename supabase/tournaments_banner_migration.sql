-- Add banner_url to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS banner_url TEXT;
