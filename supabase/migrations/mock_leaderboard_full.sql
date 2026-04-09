-- Mock Leaderboard Data Generator (Full Version)
-- Creates 10 test users and populates their game results
--
-- WARNING: This is for TESTING ONLY. Do not run in production!
--
-- Instructions:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run
-- 4. Check the leaderboard page to see the mock data

DO $$
DECLARE
  user1_id uuid;
  user2_id uuid;
  user3_id uuid;
  user4_id uuid;
  user5_id uuid;
  user6_id uuid;
  user7_id uuid;
  user8_id uuid;
  user9_id uuid;
  user10_id uuid;

  i integer;
  random_stars integer;
  random_time integer;
  random_puzzle_id uuid;
BEGIN
  -- ============================================================================
  -- STEP 1: Create test users directly in auth.users
  -- ============================================================================

  -- User 1: Champion
  user1_id := gen_random_uuid();
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    confirmation_token,
    recovery_token,
    email_change_token_new
  ) VALUES (
    user1_id,
    '00000000-0000-0000-0000-000000000000',
    'champion@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmno', -- Dummy hash
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated',
    '',
    '',
    ''
  );

  -- User 2: Speed Master
  user2_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token, email_change_token_new
  ) VALUES (
    user2_id, '00000000-0000-0000-0000-000000000000', 'speedmaster@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmno',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    'authenticated', 'authenticated', '', '', ''
  );

  -- User 3: Puzzle Pro
  user3_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token, email_change_token_new
  ) VALUES (
    user3_id, '00000000-0000-0000-0000-000000000000', 'puzzlepro@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmno',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    'authenticated', 'authenticated', '', '', ''
  );

  -- User 4: Word Wizard
  user4_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token, email_change_token_new
  ) VALUES (
    user4_id, '00000000-0000-0000-0000-000000000000', 'wordwizard@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmno',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    'authenticated', 'authenticated', '', '', ''
  );

  -- User 5: Search Sensei
  user5_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token, email_change_token_new
  ) VALUES (
    user5_id, '00000000-0000-0000-0000-000000000000', 'searchsensei@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmno',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    'authenticated', 'authenticated', '', '', ''
  );

  -- User 6: Grid Guru
  user6_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token, email_change_token_new
  ) VALUES (
    user6_id, '00000000-0000-0000-0000-000000000000', 'gridguru@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmno',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    'authenticated', 'authenticated', '', '', ''
  );

  -- User 7: Letter Legend
  user7_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token, email_change_token_new
  ) VALUES (
    user7_id, '00000000-0000-0000-0000-000000000000', 'letterlegend@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmno',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    'authenticated', 'authenticated', '', '', ''
  );

  -- User 8: Finder Fox
  user8_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token, email_change_token_new
  ) VALUES (
    user8_id, '00000000-0000-0000-0000-000000000000', 'finderfox@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmno',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    'authenticated', 'authenticated', '', '', ''
  );

  -- User 9: Seeker
  user9_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token, email_change_token_new
  ) VALUES (
    user9_id, '00000000-0000-0000-0000-000000000000', 'seeker@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmno',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    'authenticated', 'authenticated', '', '', ''
  );

  -- User 10: Casual Player
  user10_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token, email_change_token_new
  ) VALUES (
    user10_id, '00000000-0000-0000-0000-000000000000', 'casual@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmno',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    'authenticated', 'authenticated', '', '', ''
  );

  RAISE NOTICE 'Created 10 test users';

  -- ============================================================================
  -- STEP 2: Create game results for each user
  -- ============================================================================

  -- User 1: Champion (avg 4.8 stars, 35 games, best time ~42s)
  FOR i IN 1..35 LOOP
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;
    random_stars := CASE WHEN random() < 0.8 THEN 5 WHEN random() < 0.95 THEN 4 ELSE 5 END;
    random_time := 42 + floor(random() * 60)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (user1_id, random_puzzle_id, random_time, random_stars, 'mock-u1-' || i || '-' || gen_random_uuid()::text, now() - (i || ' hours')::interval);
  END LOOP;

  -- User 2: Speed Master (avg 4.6 stars, 40 games, best time ~38s)
  FOR i IN 1..40 LOOP
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;
    random_stars := CASE WHEN random() < 0.6 THEN 5 WHEN random() < 0.9 THEN 4 ELSE 3 END;
    random_time := 38 + floor(random() * 70)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (user2_id, random_puzzle_id, random_time, random_stars, 'mock-u2-' || i || '-' || gen_random_uuid()::text, now() - (i || ' hours')::interval);
  END LOOP;

  -- User 3: Puzzle Pro (avg 4.4 stars, 50 games, best time ~45s)
  FOR i IN 1..50 LOOP
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;
    random_stars := CASE WHEN random() < 0.5 THEN 5 WHEN random() < 0.85 THEN 4 ELSE 3 END;
    random_time := 45 + floor(random() * 80)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (user3_id, random_puzzle_id, random_time, random_stars, 'mock-u3-' || i || '-' || gen_random_uuid()::text, now() - (i || ' hours')::interval);
  END LOOP;

  -- User 4: Word Wizard (avg 4.2 stars, 45 games)
  FOR i IN 1..45 LOOP
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;
    random_stars := CASE WHEN random() < 0.4 THEN 5 WHEN random() < 0.8 THEN 4 ELSE 3 END;
    random_time := 50 + floor(random() * 90)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (user4_id, random_puzzle_id, random_time, random_stars, 'mock-u4-' || i || '-' || gen_random_uuid()::text, now() - (i || ' hours')::interval);
  END LOOP;

  -- User 5: Search Sensei (avg 4.0 stars, 38 games)
  FOR i IN 1..38 LOOP
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;
    random_stars := CASE WHEN random() < 0.3 THEN 5 WHEN random() < 0.75 THEN 4 ELSE 3 END;
    random_time := 55 + floor(random() * 100)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (user5_id, random_puzzle_id, random_time, random_stars, 'mock-u5-' || i || '-' || gen_random_uuid()::text, now() - (i || ' hours')::interval);
  END LOOP;

  -- User 6: Grid Guru (avg 3.8 stars, 42 games)
  FOR i IN 1..42 LOOP
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;
    random_stars := CASE WHEN random() < 0.2 THEN 5 WHEN random() < 0.6 THEN 4 WHEN random() < 0.9 THEN 3 ELSE 2 END;
    random_time := 60 + floor(random() * 110)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (user6_id, random_puzzle_id, random_time, random_stars, 'mock-u6-' || i || '-' || gen_random_uuid()::text, now() - (i || ' hours')::interval);
  END LOOP;

  -- User 7: Letter Legend (avg 3.5 stars, 32 games)
  FOR i IN 1..32 LOOP
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;
    random_stars := CASE WHEN random() < 0.15 THEN 5 WHEN random() < 0.45 THEN 4 WHEN random() < 0.8 THEN 3 ELSE 2 END;
    random_time := 70 + floor(random() * 120)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (user7_id, random_puzzle_id, random_time, random_stars, 'mock-u7-' || i || '-' || gen_random_uuid()::text, now() - (i || ' hours')::interval);
  END LOOP;

  -- User 8: Finder Fox (avg 3.3 stars, 36 games)
  FOR i IN 1..36 LOOP
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;
    random_stars := CASE WHEN random() < 0.1 THEN 5 WHEN random() < 0.4 THEN 4 WHEN random() < 0.75 THEN 3 ELSE 2 END;
    random_time := 80 + floor(random() * 130)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (user8_id, random_puzzle_id, random_time, random_stars, 'mock-u8-' || i || '-' || gen_random_uuid()::text, now() - (i || ' hours')::interval);
  END LOOP;

  -- User 9: Seeker (avg 3.0 stars, 30 games - just qualified!)
  FOR i IN 1..30 LOOP
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;
    random_stars := CASE WHEN random() < 0.1 THEN 5 WHEN random() < 0.35 THEN 4 WHEN random() < 0.7 THEN 3 ELSE 2 END;
    random_time := 90 + floor(random() * 140)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (user9_id, random_puzzle_id, random_time, random_stars, 'mock-u9-' || i || '-' || gen_random_uuid()::text, now() - (i || ' hours')::interval);
  END LOOP;

  -- User 10: Casual Player (avg 2.5 stars, 35 games)
  FOR i IN 1..35 LOOP
    SELECT id INTO random_puzzle_id FROM puzzles ORDER BY random() LIMIT 1;
    random_stars := CASE WHEN random() < 0.05 THEN 5 WHEN random() < 0.2 THEN 4 WHEN random() < 0.5 THEN 3 WHEN random() < 0.8 THEN 2 ELSE 1 END;
    random_time := 100 + floor(random() * 150)::int;

    INSERT INTO game_results (user_id, puzzle_id, completion_time_seconds, stars, session_id, completed_at)
    VALUES (user10_id, random_puzzle_id, random_time, random_stars, 'mock-u10-' || i || '-' || gen_random_uuid()::text, now() - (i || ' hours')::interval);
  END LOOP;

  RAISE NOTICE 'Created game results for all users';

  -- ============================================================================
  -- STEP 3: Update leaderboard with aggregated stats
  -- ============================================================================

  INSERT INTO leaderboard (user_id, total_puzzles_completed, total_stars, average_stars, weighted_average, last_updated)
  SELECT
    user_id,
    COUNT(*),
    SUM(stars),
    AVG(stars),
    AVG(stars) * ln(COUNT(*)),  -- weighted_average = avg_stars * ln(total_games)
    now()
  FROM game_results WHERE user_id IN (user1_id, user2_id, user3_id, user4_id, user5_id, user6_id, user7_id, user8_id, user9_id, user10_id)
  GROUP BY user_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_puzzles_completed = EXCLUDED.total_puzzles_completed,
    total_stars = EXCLUDED.total_stars,
    average_stars = EXCLUDED.average_stars,
    weighted_average = EXCLUDED.weighted_average,
    last_updated = EXCLUDED.last_updated;

  RAISE NOTICE 'Mock data created successfully!';
  RAISE NOTICE '10 users created with realistic performance levels';
  RAISE NOTICE 'All users have >= 30 games to appear on leaderboard';
END $$;

-- Verify the data
SELECT
  l.user_id,
  u.email,
  l.total_puzzles_completed,
  ROUND(l.average_stars::numeric, 2) as avg_stars,
  ROUND(l.weighted_average::numeric, 2) as weighted_avg,
  (SELECT MIN(completion_time_seconds) FROM game_results WHERE user_id = l.user_id) as best_time
FROM leaderboard l
JOIN auth.users u ON l.user_id = u.id
WHERE l.total_puzzles_completed >= 30
ORDER BY l.weighted_average DESC, l.total_puzzles_completed DESC;
