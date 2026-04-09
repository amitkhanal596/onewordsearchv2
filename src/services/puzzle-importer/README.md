# Puzzle Importer Service

This service fetches puzzles from OneWordSearch.com and imports them into your Supabase database.

## Overview

The puzzle importer provides three ways to import puzzles:
1. **CLI Script** - Command-line tool for batch imports
2. **Admin API Endpoint** - HTTP API for authenticated imports
3. **Direct Function Calls** - Programmatic imports in your code

## Quick Start

### Option 1: CLI Script (Recommended for Initial Setup)

```bash
# Install tsx if you haven't already
npm install -D tsx

# Import 30 most recent puzzles
npx tsx scripts/import-puzzles.ts recent 30

# Import 20 random puzzles
npx tsx scripts/import-puzzles.ts random 20

# Import a specific puzzle by date
npx tsx scripts/import-puzzles.ts single 2024-03-15

# Import a date range
npx tsx scripts/import-puzzles.ts range 2024-03-01 2024-03-31
```

### Option 2: Admin API Endpoint

The API endpoint requires authentication. You must be logged in to use it.

```bash
# Check authentication and see usage
curl http://localhost:3000/api/admin/import-puzzles

# Import 30 recent puzzles (requires auth token)
curl -X POST http://localhost:3000/api/admin/import-puzzles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"mode": "recent", "count": 30}'

# Import a single puzzle
curl -X POST http://localhost:3000/api/admin/import-puzzles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"mode": "single", "date": "2024-03-15"}'
```

### Option 3: Direct Function Calls

```typescript
import {
  importPuzzle,
  importPuzzleRange,
  importRecentPuzzles,
  importRandomPuzzles
} from '@/services/puzzle-importer/importer';

// Import a single puzzle
const result = await importPuzzle('2024-03-15');

// Import recent puzzles
const summary = await importRecentPuzzles(30);

// Import random puzzles
const summary = await importRandomPuzzles(20);

// Import date range
const summary = await importPuzzleRange('2024-03-01', '2024-03-31');
```

## Import Modes

### Recent Mode
Imports the N most recent puzzles.

```bash
npx tsx scripts/import-puzzles.ts recent 30
```

**Best for:**
- Initial database setup
- Keeping database up-to-date
- Testing with current puzzles

### Random Mode
Imports N random puzzles from the available date range (Feb 21, 2024 - today).

```bash
npx tsx scripts/import-puzzles.ts random 50
```

**Best for:**
- Building a diverse puzzle collection
- Testing with varied data
- Avoiding sequential puzzle patterns

### Single Mode
Imports one specific puzzle by date.

```bash
npx tsx scripts/import-puzzles.ts single 2024-03-15
```

**Best for:**
- Importing a specific puzzle
- Filling gaps in your collection
- Testing with known data

### Range Mode
Imports all puzzles in a date range.

```bash
npx tsx scripts/import-puzzles.ts range 2024-03-01 2024-03-31
```

**Best for:**
- Bulk imports
- Importing entire months
- Complete historical data

## Features

### Duplicate Prevention
The importer automatically skips puzzles that already exist in the database (based on `puzzle_date`).

### Rate Limiting Protection
Small delays are added between requests to avoid overwhelming the OneWordSearch API:
- Range imports: 100ms delay
- Random imports: 150ms delay

### Error Handling
- Gracefully handles API failures
- Continues importing even if some puzzles fail
- Provides detailed error messages
- Returns comprehensive summary of results

### Metadata Tracking
Each imported puzzle includes metadata:
```json
{
  "source": "onewordsearch.com",
  "imported_at": "2024-03-15T10:30:00Z"
}
```

## Import Result Format

### Single Import Result
```typescript
{
  success: boolean;
  date: string;
  puzzleNumber?: number;
  error?: string;
}
```

### Batch Import Summary
```typescript
{
  total: number;          // Total puzzles processed
  successful: number;     // Successfully imported
  failed: number;         // Failed to import
  skipped: number;        // Already existed
  results: ImportResult[]; // Detailed results
}
```

## Database Schema

Puzzles are stored with the following structure:

```sql
CREATE TABLE puzzles (
    id UUID PRIMARY KEY,
    puzzle_number INTEGER UNIQUE NOT NULL,
    puzzle_date DATE UNIQUE NOT NULL,
    board JSONB NOT NULL,
    words JSONB NOT NULL,
    difficulty TEXT,
    category TEXT,
    metadata JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## Authentication

### CLI Script
No authentication required - uses service-level Supabase client.

### Admin API Endpoint
Requires authentication:
1. User must be logged in
2. JWT token must be included in request
3. Only authenticated users can import puzzles

## Best Practices

### Initial Setup
```bash
# Start with recent puzzles
npx tsx scripts/import-puzzles.ts recent 50

# Then add some variety with random puzzles
npx tsx scripts/import-puzzles.ts random 50
```

### Regular Updates
Set up a cron job or scheduled task to import new puzzles daily:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/project && npx tsx scripts/import-puzzles.ts recent 1
```

### Bulk Historical Import
```bash
# Import by month
npx tsx scripts/import-puzzles.ts range 2024-01-01 2024-01-31
npx tsx scripts/import-puzzles.ts range 2024-02-01 2024-02-29
# etc.
```

## Troubleshooting

### "Failed to fetch puzzle from API"
- Check your internet connection
- Verify the date is valid and exists on OneWordSearch
- Check if OneWordSearch.com is accessible

### "Already exists (skipped)"
- The puzzle for that date is already in your database
- This is normal and expected behavior

### "Unauthorized - Authentication required"
- You need to be logged in to use the API endpoint
- Use the CLI script instead, or log in first

### Rate Limiting
If you're importing many puzzles and see failures:
- Reduce the batch size
- The script includes delays, but you can increase them in the code
- Import in smaller chunks

## Source Code Locations

- **Importer Service**: `/src/services/puzzle-importer/importer.ts`
- **Admin API**: `/src/app/api/admin/import-puzzles/route.ts`
- **CLI Script**: `/scripts/import-puzzles.ts`
- **Database Schema**: `/supabase/puzzles_schema.sql`

## Examples

### Build a test database with 100 puzzles
```bash
npx tsx scripts/import-puzzles.ts random 100
```

### Import the last week
```bash
npx tsx scripts/import-puzzles.ts recent 7
```

### Import a specific month
```bash
npx tsx scripts/import-puzzles.ts range 2024-03-01 2024-03-31
```

### Import today's puzzle
```bash
npx tsx scripts/import-puzzles.ts single $(date +%Y-%m-%d)
```

## Notes

- OneWordSearch puzzles start from February 21, 2024
- Each puzzle has a unique number and date
- The board is a 2D array of letters
- Words is an array of words to find
- Difficulty and category fields are optional (not provided by source API)
