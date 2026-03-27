-- Merge "Aurora" team into "Aurora Gaming".
-- Handles two cases:
--   A) Only an "Aurora" row exists → rename it in-place.
--   B) Both "Aurora" and "Aurora Gaming" rows exist →
--      re-point all FK columns on match_predictions, then delete the duplicate.

DO $$
DECLARE
  aurora_id        UUID;
  aurora_gaming_id UUID;
BEGIN
  SELECT id INTO aurora_id
    FROM teams
   WHERE (slug = 'aurora' OR name = 'Aurora')
     AND slug IS DISTINCT FROM 'aurora-gaming'
   LIMIT 1;

  SELECT id INTO aurora_gaming_id
    FROM teams
   WHERE slug = 'aurora-gaming'
   LIMIT 1;

  IF aurora_id IS NULL THEN
    RAISE NOTICE 'No "Aurora" team found — nothing to do.';
    RETURN;
  END IF;

  IF aurora_gaming_id IS NULL THEN
    -- Case A: just rename the lone "Aurora" row
    UPDATE teams
       SET name = 'Aurora Gaming',
           slug = 'aurora-gaming'
     WHERE id = aurora_id;
    RAISE NOTICE 'Renamed Aurora → Aurora Gaming (id = %)', aurora_id;
  ELSE
    -- Case B: two separate rows — reassign FKs then delete the stale row
    UPDATE match_predictions SET team_1_id          = aurora_gaming_id WHERE team_1_id          = aurora_id;
    UPDATE match_predictions SET team_2_id          = aurora_gaming_id WHERE team_2_id          = aurora_id;
    UPDATE match_predictions SET predicted_winner_id = aurora_gaming_id WHERE predicted_winner_id = aurora_id;
    UPDATE match_predictions SET actual_winner_id    = aurora_gaming_id WHERE actual_winner_id    = aurora_id;
    DELETE FROM teams WHERE id = aurora_id;
    RAISE NOTICE 'Merged Aurora (%) into Aurora Gaming (%) and deleted duplicate.', aurora_id, aurora_gaming_id;
  END IF;
END $$;
