-- ============================================================
-- Dota2ProTips — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- TEAMS
CREATE TABLE teams (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT        NOT NULL UNIQUE,
    short_name        TEXT,
    region            TEXT,
    logo_url          TEXT,
    liquipedia_url    TEXT,
    opendota_team_id  BIGINT      UNIQUE,   -- OpenDota team ID for auto-import
    is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TOURNAMENTS
CREATE TABLE tournaments (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT        NOT NULL UNIQUE,
    name            TEXT        NOT NULL,
    tier            INTEGER     NOT NULL DEFAULT 1,
    overview        TEXT,
    format          TEXT,
    start_date      DATE,
    end_date        DATE,
    prize_pool_usd  INTEGER,
    liquipedia_url       TEXT,
    telegram_url         TEXT,
    opendota_league_id   INTEGER,             -- OpenDota league ID for auto-import
    is_published         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STAGES (group stage, UB QF, grand finals, etc.)
CREATE TABLE stages (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID    NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name          TEXT    NOT NULL,
    stage_order   INTEGER NOT NULL DEFAULT 1,
    stage_date    DATE,
    UNIQUE (tournament_id, name)
);

-- MATCH PREDICTIONS
CREATE TABLE match_predictions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id       UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    stage_id            UUID        REFERENCES stages(id) ON DELETE SET NULL,
    team_1_id           UUID        NOT NULL REFERENCES teams(id),
    team_2_id           UUID        NOT NULL REFERENCES teams(id),
    predicted_winner_id UUID        REFERENCES teams(id),
    best_of             INTEGER     NOT NULL DEFAULT 3 CHECK (best_of IN (1, 2, 3, 5)),
    match_order         INTEGER,
    score_team_1        INTEGER,
    score_team_2        INTEGER,
    actual_winner_id    UUID        REFERENCES teams(id),
    pre_analysis        TEXT,
    post_commentary     TEXT,
    is_correct          BOOLEAN,
    match_date          DATE,
    opendota_series_id  BIGINT      UNIQUE,   -- prevents duplicate imports
    is_published        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT different_teams CHECK (team_1_id <> team_2_id)
);

CREATE INDEX idx_predictions_tournament ON match_predictions (tournament_id);
CREATE INDEX idx_predictions_stage      ON match_predictions (stage_id);

-- ============================================================
-- VIEWS (auto-calculated stats — no manual work needed)
-- ============================================================

-- Overall accuracy per tournament
CREATE OR REPLACE VIEW tournament_stats AS
SELECT
    t.id   AS tournament_id,
    t.name AS name,
    COUNT(mp.id)                                                              AS total_predictions,
    COUNT(CASE WHEN mp.is_correct = TRUE  THEN 1 END)                        AS correct,
    COUNT(CASE WHEN mp.is_correct = FALSE THEN 1 END)                        AS wrong,
    ROUND(
        COUNT(CASE WHEN mp.is_correct = TRUE THEN 1 END)::numeric
        / NULLIF(COUNT(CASE WHEN mp.is_correct IS NOT NULL THEN 1 END), 0)
        * 100,
        1
    )                                                                         AS accuracy_pct
FROM tournaments t
LEFT JOIN match_predictions mp
    ON mp.tournament_id = t.id AND mp.is_published = TRUE
GROUP BY t.id, t.name;

-- Per-team accuracy within a tournament (for the "Top 3 most accurate" table)
CREATE OR REPLACE VIEW team_accuracy AS
SELECT
    mp.tournament_id,
    t.id                                                                      AS team_id,
    t.name                                                                    AS team_name,
    t.logo_url,
    COUNT(mp.id)                                                              AS predictions_involving,
    COUNT(CASE WHEN mp.is_correct = TRUE THEN 1 END)                         AS correct,
    ROUND(
        COUNT(CASE WHEN mp.is_correct = TRUE THEN 1 END)::numeric
        / NULLIF(COUNT(CASE WHEN mp.is_correct IS NOT NULL THEN 1 END), 0)
        * 100,
        1
    )                                                                         AS accuracy_pct
FROM match_predictions mp
JOIN teams t
    ON t.id = mp.team_1_id OR t.id = mp.team_2_id
WHERE mp.is_published = TRUE
  AND mp.is_correct IS NOT NULL
GROUP BY mp.tournament_id, t.id, t.name, t.logo_url
HAVING COUNT(mp.id) >= 2
ORDER BY accuracy_pct DESC;

-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS — public can read, only authenticated can write
-- ============================================================

ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_predictions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read teams"
    ON teams FOR SELECT USING (TRUE);

CREATE POLICY "Public read tournaments"
    ON tournaments FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Public read stages"
    ON stages FOR SELECT USING (TRUE);

CREATE POLICY "Public read predictions"
    ON match_predictions FOR SELECT USING (is_published = TRUE);

-- Authenticated write access (Greg's admin panel)
CREATE POLICY "Auth insert teams"
    ON teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update teams"
    ON teams FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth insert tournaments"
    ON tournaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update tournaments"
    ON tournaments FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth insert stages"
    ON stages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update stages"
    ON stages FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth insert predictions"
    ON match_predictions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update predictions"
    ON match_predictions FOR UPDATE USING (auth.role() = 'authenticated');
