-- Migration: Add Missing weighted_average Column
-- This fixes the leaderboard table if it was created without this column

-- Add weighted_average column if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'leaderboard'
    and column_name = 'weighted_average'
  ) then
    alter table leaderboard
      add column weighted_average numeric(6,2) not null default 0.00
      check (weighted_average >= 0);

    comment on column leaderboard.weighted_average is 'Weighted average considering recency and consistency.';
  end if;
end $$;

-- Ensure processed_events table exists
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

-- Create indexes if they don't exist
create index if not exists idx_processed_events_processed_at
  on processed_events(processed_at desc);

create index if not exists idx_processed_events_user_id
  on processed_events(user_id);

-- Enable RLS
alter table processed_events enable row level security;
