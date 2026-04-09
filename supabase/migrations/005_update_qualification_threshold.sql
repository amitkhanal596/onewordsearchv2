-- Migration: Update Qualification Threshold from 5 to 30 puzzles
-- Updates the partial index to reflect new qualification threshold

-- Drop the old index (with 5 puzzle threshold)
drop index if exists idx_leaderboard_ranking;

-- Create new index with 30 puzzle threshold
create index idx_leaderboard_ranking
  on leaderboard(average_stars desc, total_puzzles_completed desc)
  where total_puzzles_completed >= 30;

-- Update table comment to reflect new threshold
comment on column leaderboard.total_puzzles_completed is 'Total number of puzzles completed by user. Used for qualification threshold (min 30).';
