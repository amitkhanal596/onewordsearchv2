-- Migration: Game Results Table
-- Service: Progress Service (Service B)
-- Purpose: Track puzzle completions with idempotency and user history
--
-- Design Principles:
-- - Idempotency via unique session_id constraint
-- - User isolation via RLS policies
-- - Optimized for history queries via indexes
-- - Foreign key constraints for data integrity

-- Create game_results table
create table if not exists game_results (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),

  -- Foreign keys
  user_id uuid references auth.users(id) on delete cascade not null,
  puzzle_id uuid references puzzles(id) on delete cascade not null,

  -- Idempotency key - ensures no duplicate submissions for same session
  session_id text not null unique,

  -- Game completion data
  completion_time_seconds integer not null check (completion_time_seconds > 0),
  stars integer not null check (stars >= 1 and stars <= 5),

  -- Timestamps
  completed_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- Indexes for query optimization
-- User history queries (most common)
create index if not exists idx_game_results_user_id
  on game_results(user_id);

-- Puzzle statistics queries
create index if not exists idx_game_results_puzzle_id
  on game_results(puzzle_id);

-- Time-based queries (leaderboards, recent completions)
create index if not exists idx_game_results_completed_at
  on game_results(completed_at desc);

-- Composite index for user history with pagination
create index if not exists idx_game_results_user_completed
  on game_results(user_id, completed_at desc);

-- Enable Row Level Security
alter table game_results enable row level security;

-- RLS Policy: Users can only view their own game results
create policy "Users can view their own game results"
  on game_results for select
  using (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own game results
create policy "Users can insert their own game results"
  on game_results for insert
  with check (auth.uid() = user_id);

-- RLS Policy: Users cannot update game results (immutable records)
-- No update policy = updates are blocked

-- RLS Policy: Users cannot delete game results
-- No delete policy = deletes are blocked (except cascade from user deletion)

-- Add comment for documentation
comment on table game_results is 'Stores puzzle completion records for user progress tracking. Ensures idempotency via session_id and maintains user isolation via RLS.';
comment on column game_results.session_id is 'Unique session identifier for idempotent completion recording. Prevents duplicate submissions.';
comment on column game_results.completion_time_seconds is 'Time taken to complete puzzle in seconds. Used for star calculation and leaderboards.';
comment on column game_results.stars is 'Star rating (1-5) based on completion time. Calculated by service layer.';
