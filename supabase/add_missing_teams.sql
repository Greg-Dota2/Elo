-- Add qualifier teams missing from the teams table
INSERT INTO teams (name, slug, region, is_active, current_elo)
VALUES
  ('Power Rangers', 'power-rangers', 'CIS', true, 400),
  ('VP.Prodigy',    'vp-prodigy',    'CIS', true, 400)
ON CONFLICT (name) DO NOTHING;
