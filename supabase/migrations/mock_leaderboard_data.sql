-- Mock Leaderboard Data Generator
-- This script creates test users and game results to populate the leaderboard
--
-- WARNING: This is for TESTING ONLY. Do not run in production!
--
-- Instructions:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run
-- 4. Check the leaderboard page to see the mock data

-- ============================================================================
-- STEP 1: Create mock users in auth.users
-- ============================================================================
-- Note: We'll create users with test emails
-- In a real scenario, these would be created through the signup flow

DO $$
DECLARE
  user1_id uuid := gen_random_uuid();
  user2_id uuid := gen_random_uuid();
  user3_id uuid := gen_random_uuid();
  user4_id uuid := gen_random_uuid();
  user5_id uuid := gen_random_uuid();
  user6_id uuid := gen_random_uuid();
  user7_id uuid := gen_random_uuid();
  user8_id uuid := gen_random_uuid();
  user9_id uuid := gen_random_uuid();
  user10_id uuid := gen_random_uuid();

  puzzle1_id uuid;
  puzzle2_id uuid;
  puzzle3_id uuid;
  puzzle4_id uuid;
  puzzle5_id uuid;

  i integer;
  random_stars integer;
  random_time integer;
BEGIN
  -- Get some existing puzzle IDs to use in game results
  SELECT id INTO puzzle1_id FROM puzzles ORDER BY puzzle_date ASC LIMIT 1 OFFSET 0;
  SELECT id INTO puzzle2_id FROM puzzles ORDER BY puzzle_date ASC LIMIT 1 OFFSET 1;
  SELECT id INTO puzzle3_id FROM puzzles ORDER BY puzzle_date ASC LIMIT 1 OFFSET 2;
  SELECT id INTO puzzle4_id FROM puzzles ORDER BY puzzle_date ASC LIMIT 1 OFFSET 3;
  SELECT id INTO puzzle5_id FROM puzzles ORDER BY puzzle_date ASC LIMIT 1 OFFSET 4;

  -- Create test users (only if they don't exist)
  -- User 1: Top player (high avg stars)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES (
    user1_id,
    '00000000-0000-0000-0000-000000000000',
    'champion@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;

  -- User 2: Second place
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES (
    user2_id,
    '00000000-0000-0000-0000-000000000000',
    'speedmaster@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;

  -- User 3: Third place
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES (
    user3_id,
    '00000000-0000-0000-0000-000000000000',
    'puzzlepro@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;

  -- User 4-10: Other players
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES (
    user4_id,
    '00000000-0000-0000-0000-000000000000',
    'wordwizard@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES (
    user5_id,
    '00000000-0000-0000-0000-000000000000',
    'searchsensei@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES (
    user6_id,
    '00000000-0000-0000-0000-000000000000',
    'gridguru@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES (
    user7_id,
    '00000000-0000-0000-0000-000000000000',
    'letterlegend@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES (
    user8_id,
    '00000000-0000-0000-0000-000000000000',
    'finderfox@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES (
    user9_id,
    '00000000-0000-0000-0000-000000000000',
    'seeker@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES (
    user10_id,
    '00000000-0000-0000-0000-000000000000',
    'casual_player@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;

  -- ============================================================================
  -- STEP 2: Create game results for each user
  -- ============================================================================

  -- User 1: Champion (avg 4.8 stars, 35 games, best time 42s)
  FOR i IN 1..35 LOOP
    random_stars := CASE
      WHEN random() < 0.8 THEN 5
      WHEN random() < 0.9 THEN 4
      ELSE 5
    END;
    random_time := 42 + floor(random() * 60)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      user1_id,
      (SELECT id FROM puzzles ORDER BY random() LIMIT 1),
      random_time,
      random_stars,
      gen_random_uuid()::text,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- User 2: Speed Master (avg 4.6 stars, 40 games, best time 38s - fastest!)
  FOR i IN 1..40 LOOP
    random_stars := CASE
      WHEN random() < 0.6 THEN 5
      WHEN random() < 0.9 THEN 4
      ELSE 3
    END;
    random_time := 38 + floor(random() * 70)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      user2_id,
      (SELECT id FROM puzzles ORDER BY random() LIMIT 1),
      random_time,
      random_stars,
      gen_random_uuid()::text,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- User 3: Puzzle Pro (avg 4.4 stars, 50 games, best time 45s)
  FOR i IN 1..50 LOOP
    random_stars := CASE
      WHEN random() < 0.5 THEN 5
      WHEN random() < 0.8 THEN 4
      ELSE 3
    END;
    random_time := 45 + floor(random() * 80)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      user3_id,
      (SELECT id FROM puzzles ORDER BY random() LIMIT 1),
      random_time,
      random_stars,
      gen_random_uuid()::text,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- User 4: Word Wizard (avg 4.2 stars, 45 games)
  FOR i IN 1..45 LOOP
    random_stars := CASE
      WHEN random() < 0.4 THEN 5
      WHEN random() < 0.8 THEN 4
      ELSE 3
    END;
    random_time := 50 + floor(random() * 90)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      user4_id,
      (SELECT id FROM puzzles ORDER BY random() LIMIT 1),
      random_time,
      random_stars,
      gen_random_uuid()::text,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- User 5: Search Sensei (avg 4.0 stars, 38 games)
  FOR i IN 1..38 LOOP
    random_stars := CASE
      WHEN random() < 0.3 THEN 5
      WHEN random() < 0.7 THEN 4
      ELSE 3
    END;
    random_time := 55 + floor(random() * 100)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      user5_id,
      (SELECT id FROM puzzles ORDER BY random() LIMIT 1),
      random_time,
      random_stars,
      gen_random_uuid()::text,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- User 6: Grid Guru (avg 3.8 stars, 42 games)
  FOR i IN 1..42 LOOP
    random_stars := CASE
      WHEN random() < 0.2 THEN 5
      WHEN random() < 0.6 THEN 4
      WHEN random() < 0.9 THEN 3
      ELSE 2
    END;
    random_time := 60 + floor(random() * 110)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      user6_id,
      (SELECT id FROM puzzles ORDER BY random() LIMIT 1),
      random_time,
      random_stars,
      gen_random_uuid()::text,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- User 7: Letter Legend (avg 3.5 stars, 32 games)
  FOR i IN 1..32 LOOP
    random_stars := CASE
      WHEN random() < 0.15 THEN 5
      WHEN random() < 0.45 THEN 4
      WHEN random() < 0.8 THEN 3
      ELSE 2
    END;
    random_time := 70 + floor(random() * 120)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      user7_id,
      (SELECT id FROM puzzles ORDER BY random() LIMIT 1),
      random_time,
      random_stars,
      gen_random_uuid()::text,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- User 8: Finder Fox (avg 3.3 stars, 36 games)
  FOR i IN 1..36 LOOP
    random_stars := CASE
      WHEN random() < 0.1 THEN 5
      WHEN random() < 0.4 THEN 4
      WHEN random() < 0.75 THEN 3
      ELSE 2
    END;
    random_time := 80 + floor(random() * 130)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      user8_id,
      (SELECT id FROM puzzles ORDER BY random() LIMIT 1),
      random_time,
      random_stars,
      gen_random_uuid()::text,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- User 9: Seeker (avg 3.0 stars, 30 games - just qualified!)
  FOR i IN 1..30 LOOP
    random_stars := CASE
      WHEN random() < 0.1 THEN 5
      WHEN random() < 0.3 THEN 4
      WHEN random() < 0.7 THEN 3
      ELSE 2
    END;
    random_time := 90 + floor(random() * 140)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      user9_id,
      (SELECT id FROM puzzles ORDER BY random() LIMIT 1),
      random_time,
      random_stars,
      gen_random_uuid()::text,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- User 10: Casual Player (avg 2.5 stars, 35 games)
  FOR i IN 1..35 LOOP
    random_stars := CASE
      WHEN random() < 0.05 THEN 5
      WHEN random() < 0.2 THEN 4
      WHEN random() < 0.5 THEN 3
      WHEN random() < 0.8 THEN 2
      ELSE 1
    END;
    random_time := 100 + floor(random() * 150)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (
      user10_id,
      (SELECT id FROM puzzles ORDER BY random() LIMIT 1),
      random_time,
      random_stars,
      gen_random_uuid()::text,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- ============================================================================
  -- STEP 3: Manually update leaderboard (simulating worker processing)
  -- ============================================================================
  -- In production, this would be done by the leaderboard worker
  -- For testing, we'll calculate and insert directly

  -- User 1
  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, last_updated)
  SELECT
    user1_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    now()
  FROM game_results WHERE user_id = user1_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    last_updated = EXCLUDED.last_updated;

  -- User 2
  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, last_updated)
  SELECT
    user2_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    now()
  FROM game_results WHERE user_id = user2_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    last_updated = EXCLUDED.last_updated;

  -- User 3
  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, last_updated)
  SELECT
    user3_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    now()
  FROM game_results WHERE user_id = user3_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    last_updated = EXCLUDED.last_updated;

  -- Users 4-10
  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, last_updated)
  SELECT
    user4_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    now()
  FROM game_results WHERE user_id = user4_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    last_updated = EXCLUDED.last_updated;

  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, last_updated)
  SELECT
    user5_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    now()
  FROM game_results WHERE user_id = user5_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    last_updated = EXCLUDED.last_updated;

  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, last_updated)
  SELECT
    user6_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    now()
  FROM game_results WHERE user_id = user6_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    last_updated = EXCLUDED.last_updated;

  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, last_updated)
  SELECT
    user7_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    now()
  FROM game_results WHERE user_id = user7_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    last_updated = EXCLUDED.last_updated;

  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, last_updated)
  SELECT
    user8_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    now()
  FROM game_results WHERE user_id = user8_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    last_updated = EXCLUDED.last_updated;

  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, last_updated)
  SELECT
    user9_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    now()
  FROM game_results WHERE user_id = user9_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    last_updated = EXCLUDED.last_updated;

  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, last_updated)
  SELECT
    user10_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    now()
  FROM game_results WHERE user_id = user10_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    last_updated = EXCLUDED.last_updated;

  RAISE NOTICE 'Mock data created successfully!';
  RAISE NOTICE '10 users created with varying performance levels';
  RAISE NOTICE 'All users have >= 30 games to appear on leaderboard';
  RAISE NOTICE 'Check /leaderboard to see the results!';
END $$;

-- Verify the data was created
SELECT
  l.user_id,
  u.email,
  l.total_puzzles_completed,
  l.average_stars,
  (SELECT MIN(completion_time_seconds) FROM game_results WHERE user_id = l.user_id) as best_time
FROM leaderboard l
JOIN auth.users u ON l.user_id = u.id
WHERE l.total_puzzles_completed >= 30
ORDER BY l.average_stars DESC, l.total_puzzles_completed DESC
LIMIT 10;
