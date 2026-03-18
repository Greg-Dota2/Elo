-- ============================================================
-- Teams table — add extended profile fields
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS slug              TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bio               TEXT,
  ADD COLUMN IF NOT EXISTS achievements      TEXT,
  ADD COLUMN IF NOT EXISTS founded_year      INTEGER,
  ADD COLUMN IF NOT EXISTS website_url       TEXT,
  ADD COLUMN IF NOT EXISTS banner_url        TEXT;   -- cover/banner image

-- Auto-generate slugs for existing teams (run once)
UPDATE teams
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams (slug);
