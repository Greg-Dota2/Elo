-- ============================================================
-- PLAYERS table
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE players (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              TEXT        NOT NULL UNIQUE,
    ign               TEXT        NOT NULL,           -- in-game name (handle)
    full_name         TEXT,
    team_id           UUID        REFERENCES teams(id) ON DELETE SET NULL,
    position          INTEGER     CHECK (position BETWEEN 1 AND 5),  -- 1=carry … 5=hard support
    nationality       TEXT,
    date_of_birth     DATE,
    photo_url         TEXT,
    bio               TEXT,
    signature_heroes  TEXT[],     -- e.g. ARRAY['Invoker','Storm Spirit','Puck']
    achievements      TEXT,       -- free-text achievements block
    previous_teams    TEXT,       -- comma-separated or free text
    liquipedia_url    TEXT,
    is_published      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_team ON players (team_id);
CREATE INDEX idx_players_slug ON players (slug);

-- RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read players"
    ON players FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Auth insert players"
    ON players FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth update players"
    ON players FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth delete players"
    ON players FOR DELETE USING (auth.role() = 'authenticated');
