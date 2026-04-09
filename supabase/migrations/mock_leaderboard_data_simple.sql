-- Mock Leaderboard Data Generator (Simplified)
-- This script creates game results and leaderboard entries for EXISTING users
--
-- WARNING: This is for TESTING ONLY. Do not run in production!
--
-- Instructions:
-- 1. First, manually create 10 test users through your app's signup page, OR
-- 2. Use your own existing user ID below
-- 3. Copy this entire file
-- 4. Go to Supabase Dashboard → SQL Editor
-- 5. Paste and run
-- 6. Check the leaderboard page to see the mock data

-- ============================================================================
-- CONFIGURATION: Replace these UUIDs with actual user IDs from your database
-- ============================================================================
-- You can get user IDs by running: SELECT id, email FROM auth.users LIMIT 10;
--
-- For quick testing, we'll create mock data for just YOUR account
-- Run this first to get your user ID:
--   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

DO $$
DECLARE
  -- Replace this with your actual user ID, or any user ID from auth.users
  test_user_id uuid;

  i integer;
  random_stars integer;
  random_time integer;
  random_puzzle_id uuid;
BEGIN
  -- Get an existing user (change this to your email or use the first user)
  SELECT id INTO test_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in auth.users. Please create a user account first.';
  END IF;

  RAISE NOTICE 'Creating mock data for user: %', test_user_id;

  -- ============================================================================
  -- Create 35 game results for the test user
  -- ============================================================================
  FOR i IN 1..35 LOOP
    -- Get a random puzzle
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;

    -- Generate realistic stars (weighted towards higher stars)
    random_stars := CASE
      WHEN random() < 0.7 THEN 5  -- 70% chance of 5 stars
      WHEN random() < 0.9 THEN 4  -- 20% chance of 4 stars
      ELSE 3                       -- 10% chance of 3 stars
    END;

    -- Generate completion time (42 to 102 seconds)
    random_time := 42 + floor(random() * 60)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      test_user_id,
      random_puzzle_id,
      random_time,
      random_stars,
      'mock-session-' || i || '-' || gen_random_uuid()::text,
      now() - (i || ' hours')::interval
    );
  END LOOP;

  -- ============================================================================
  -- Update leaderboard with aggregated stats
  -- ============================================================================
  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, weighted_average, last_updated)
  SELECT
    test_user_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    AVG(stars) * ln(COUNT(*)),  -- weighted_average = avg_stars * ln(total_games)
    now()
  FROM game_results WHERE user_id = test_user_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    weighted_average = EXCLUDED.weighted_average,
    last_updated = EXCLUDED.last_updated;

  RAISE NOTICE 'Mock data created successfully!';
  RAISE NOTICE '35 games created for user: %', test_user_id;
END $$;

-- ============================================================================
-- Verify the data was created
-- ============================================================================
SELECT
  l.user_id,
  u.email,
  l.total_puzzles_completed,
  ROUND(l.average_stars::numeric, 2) as avg_stars,
  ROUND(l.weighted_average::numeric, 2) as weighted_avg,
  (SELECT MIN(completion_time_seconds) FROM game_results WHERE user_id = l.user_id) as best_time_seconds
FROM leaderboard l
JOIN auth.users u ON l.user_id = u.id
WHERE l.total_puzzles_completed >= 30
ORDER BY l.weighted_average DESC, l.total_puzzles_completed DESC;
