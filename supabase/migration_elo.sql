-- Run this in Supabase SQL Editor

-- Add ELO rating to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS current_elo INTEGER NOT NULL DEFAULT 1500;

-- Team ELO history (one record per match per team)
CREATE TABLE IF NOT EXISTS team_elo_history (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID        NOT NULL REFERENCES teams(id),
    match_id        UUID        NOT NULL REFERENCES match_predictions(id) ON DELETE CASCADE,
    elo_before      INTEGER     NOT NULL,
    elo_after       INTEGER     NOT NULL,
    elo_change      INTEGER     NOT NULL GENERATED ALWAYS AS (elo_after - elo_before) STORED,
    opponent_id     UUID        NOT NULL REFERENCES teams(id),
    opponent_elo    INTEGER     NOT NULL,
    won             BOOLEAN     NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (team_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_elo_history_team ON team_elo_history (team_id, recorded_at DESC);

-- RLS
ALTER TABLE team_elo_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read elo history" ON team_elo_history FOR SELECT USING (TRUE);
CREATE POLICY "Auth insert elo history" ON team_elo_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update elo history" ON team_elo_history FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth delete elo history" ON team_elo_history FOR DELETE USING (auth.role() = 'authenticated');
