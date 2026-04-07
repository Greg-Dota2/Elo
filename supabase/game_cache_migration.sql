-- Stores pre-fetched game data (heroes, items) so generateStaticParams
-- never depends on OpenDota being available at deploy time.
CREATE TABLE IF NOT EXISTS game_cache (
  key          TEXT        PRIMARY KEY,
  data         JSONB       NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
