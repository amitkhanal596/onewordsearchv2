-- Migration: Add weighted_average column to leaderboard
-- Updates ranking to use weighted_average = avg_stars * ln(total_games)
-- This rewards both skill (avg_stars) and consistency (total_games)

-- Add weighted_average column
ALTER TABLE leaderboard
ADD COLUMN IF NOT EXISTS weighted_average numeric(10,4) NOT NULL DEFAULT 0.0;

-- Add check constraint to ensure weighted_average is non-negative
ALTER TABLE leaderboard
ADD CONSTRAINT check_weighted_average_non_negative
CHECK (weighted_average >= 0);

-- Drop old ranking index (based on average_stars)
DROP INDEX IF EXISTS idx_leaderboard_ranking;

-- Create new ranking index (based on weighted_average)
CREATE INDEX idx_leaderboard_ranking
  ON leaderboard(weighted_average DESC, total_puzzles_completed DESC)
  WHERE total_puzzles_completed >= 30;

-- Update all existing leaderboard entries with weighted_average
-- weighted_average = avg_stars * ln(total_puzzles_completed)
UPDATE leaderboard
SET weighted_average = average_stars * ln(total_puzzles_completed)
WHERE total_puzzles_completed > 0;

-- Update table comment
COMMENT ON COLUMN leaderboard.weighted_average IS 'Weighted average score: avg_stars * ln(total_games). Primary ranking metric that rewards both skill and consistency.';

-- Verify the update
SELECT
  user_id,
  total_puzzles_completed,
  average_stars,
  weighted_average,
  ROUND((average_stars * ln(total_puzzles_completed))::numeric, 4) as calculated_weighted_avg
FROM leaderboard
WHERE total_puzzles_completed >= 30
ORDER BY weighted_average DESC
LIMIT 10;
