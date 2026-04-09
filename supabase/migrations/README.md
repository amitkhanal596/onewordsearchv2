# Database Migrations

This directory contains SQL migration files for the OneWordSearch application.

## Migration Files

- `003_game_results.sql` - Game Results table for Progress Service

## Applying Migrations

### Option 1: Quick Apply (Recommended)

```bash
npm run migrate:apply
```

This will:
1. Copy the migration SQL to your clipboard
2. Open Supabase Studio SQL Editor
3. Provide clear instructions

Then simply:
1. Paste the SQL (Cmd/Ctrl + V)
2. Click RUN

### Option 2: Manual Application

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the contents of the migration file
6. Paste into the editor
7. Click **Run** or press Cmd/Ctrl + Enter

### Option 3: Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### Option 4: Direct PostgreSQL Connection

If you have the database password:

```bash
# Add to .env.local:
# DB_PASSWORD=your_database_password

# Run direct migration
npm run migrate:direct
```

## Verifying Migrations

After applying a migration, verify it was successful:

```bash
npm run migrate:verify
```

This will check:
- Table existence
- Table structure (columns, types)
- Indexes
- RLS policies
- Constraints

## Migration Details: game_results

### Purpose
Tracks puzzle completion records for user progress tracking with idempotency and user isolation.

### Schema

**Table:** `game_results`

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → auth.users)
- `puzzle_id` (uuid, foreign key → puzzles)
- `session_id` (text, unique) - Idempotency key
- `completion_time_seconds` (integer, check > 0)
- `stars` (integer, check 1-5)
- `completed_at` (timestamptz)
- `created_at` (timestamptz)

**Indexes:**
- `idx_game_results_user_id` - User history queries
- `idx_game_results_puzzle_id` - Puzzle statistics
- `idx_game_results_completed_at` - Time-based queries
- `idx_game_results_user_completed` - Composite for pagination

**RLS Policies:**
- Users can SELECT their own results
- Users can INSERT their own results
- No UPDATE or DELETE (immutable records)

### Design Principles
- **Idempotency:** Unique `session_id` prevents duplicate submissions
- **User Isolation:** RLS ensures users only see their own data
- **Immutability:** No updates/deletes (except cascade from user deletion)
- **Performance:** Optimized indexes for common query patterns

## Troubleshooting

### "Table does not exist" error

The migration hasn't been applied yet. Run:
```bash
npm run migrate:apply
```

### "Foreign key violation" error

This means the referenced tables (users or puzzles) don't exist yet. Ensure:
1. Supabase auth is properly configured
2. Puzzles table has been created

### RLS blocking service operations

The admin client (`src/utils/supabase/admin.ts`) uses the service role key which bypasses RLS.

## Notes

- Migrations are immutable once applied
- Always backup your database before applying migrations
- Test migrations in a development environment first
- The Supabase JS client doesn't support arbitrary SQL execution for security
- Service role key bypasses RLS - use carefully
