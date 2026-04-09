-- Migration: Leaderboard Table and Processed Events Tracking (Safe Re-run Version)
-- Service: Leaderboard Worker (Agent 4)
-- Purpose: Track user rankings and ensure event processing idempotency
--
-- This version is safe to run multiple times (idempotent)

-- ============================================================================
-- LEADERBOARD TABLE
-- ============================================================================
-- Stores aggregated user statistics for ranking
create table if not exists leaderboard (
  -- Primary identifier (matches auth.users)
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- Aggregate statistics
  total_puzzles_completed integer not null default 0 check (total_puzzles_completed >= 0),
  total_stars integer not null default 0 check (total_stars >= 0),
  average_stars numeric(4,2) not null default 0.00 check (average_stars >= 0 and average_stars <= 5),
  weighted_average numeric(6,2) not null default 0.00 check (weighted_average >= 0),

  -- Timestamp tracking
  last_updated timestamptz default now() not null
);

-- Indexes for leaderboard queries
-- Primary ranking query: users with 30+ puzzles, sorted by avg_stars DESC, total_puzzles DESC
create index if not exists idx_leaderboard_ranking
  on leaderboard(average_stars desc, total_puzzles_completed desc)
  where total_puzzles_completed >= 30;

-- User lookup index (for API queries and updates)
create index if not exists idx_leaderboard_user_id
  on leaderboard(user_id);

-- ============================================================================
-- PROCESSED EVENTS TABLE
-- ============================================================================
-- Tracks which puzzle completion events have been processed
-- Ensures idempotency: each session_id is processed exactly once
create table if not exists processed_events (
  -- Session ID from puzzle completion event (idempotency key)
  session_id text primary key,

  -- Event metadata for debugging and audit trail
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_id uuid not null references puzzles(id) on delete cascade,
  stars integer not null check (stars >= 1 and stars <= 5),
  completion_time_seconds integer not null check (completion_time_seconds > 0),

  -- Processing metadata
  processed_at timestamptz default now() not null,
  event_timestamp timestamptz not null
);

-- Index for cleanup queries (remove old processed events if needed)
create index if not exists idx_processed_events_processed_at
  on processed_events(processed_at desc);

-- Index for user audit queries
create index if not exists idx_processed_events_user_id
  on processed_events(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Enable RLS on tables
alter table leaderboard enable row level security;
alter table processed_events enable row level security;

-- Drop existing policies if they exist (safe re-run)
do $$
begin
  drop policy if exists "Anyone can view leaderboard" on leaderboard;
exception
  when undefined_object then null;
end $$;

-- Create policy for public read access
create policy "Anyone can view leaderboard"
  on leaderboard for select
  using (true);

-- No insert/update/delete policies for users (only service role can write)
-- No policies for processed_events = only service role can access

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment on table leaderboard is 'Aggregated user statistics for skill-based rankings. Updated asynchronously by leaderboard worker.';
comment on column leaderboard.total_puzzles_completed is 'Total number of puzzles completed by user. Used for qualification threshold (min 30).';
comment on column leaderboard.total_stars is 'Sum of all stars earned. Used to calculate average_stars.';
comment on column leaderboard.average_stars is 'Average stars per puzzle. Primary ranking metric to prevent grinding exploitation.';
comment on column leaderboard.weighted_average is 'Weighted average considering recency and consistency.';
comment on column leaderboard.last_updated is 'Timestamp of last leaderboard update for this user.';

comment on table processed_events is 'Tracks processed puzzle completion events for idempotency. Prevents duplicate event processing.';
comment on column processed_events.session_id is 'Unique session identifier from PuzzleCompletedEvent. Primary idempotency key.';
comment on column processed_events.event_timestamp is 'Original event timestamp from Redis queue.';
comment on column processed_events.processed_at is 'When this event was processed by the worker.';
