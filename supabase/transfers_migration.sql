-- Transfers table
create table if not exists transfers (
  id              uuid primary key default gen_random_uuid(),
  player_ign      text not null,
  player_slug     text,                      -- links to /players/{slug} if exists
  player_photo_url text,
  from_team       text,                      -- team name or null (unknown origin)
  from_team_logo_url text,
  to_team         text,                      -- team name or null (free agent / retired)
  to_team_logo_url   text,
  transfer_date   date not null,
  type            text not null default 'permanent',  -- permanent | loan | stand-in | free_agent | retired
  notes           text,
  is_published    boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Newest first by default
create index if not exists transfers_date_idx on transfers (transfer_date desc);
