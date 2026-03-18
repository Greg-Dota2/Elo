-- Add PandaScore IDs for deduplication and team linking
alter table match_predictions
  add column if not exists pandascore_match_id bigint unique,
  add column if not exists stream_url text;

alter table teams
  add column if not exists pandascore_team_id bigint unique;
