-- ============================================================
-- Item & Hero Guides — editorial content for SEO
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE item_guides (
  item_key    TEXT        PRIMARY KEY,
  why_buy     TEXT,
  when_to_buy TEXT,
  tips        TEXT[]      NOT NULL DEFAULT '{}',
  summary     TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hero_guides (
  hero_id       INTEGER     PRIMARY KEY,
  when_to_pick  TEXT,
  tips          TEXT[]      NOT NULL DEFAULT '{}',
  summary       TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
