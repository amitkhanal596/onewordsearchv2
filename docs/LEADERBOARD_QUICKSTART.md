# Leaderboard System - Quick Start Guide

## What is this?

The Leaderboard Worker is a background service that processes puzzle completions and maintains a skill-based leaderboard. It ensures fair rankings by calculating average stars instead of total stars, preventing grinding exploitation.

## Quick Setup (Development)

### 1. Install Dependencies

Already done if you ran `npm install`:
```bash
npm install  # Includes ioredis
```

### 2. Start Redis

Using Docker (easiest):
```bash
docker run -p 6379:6379 redis:7-alpine
```

Or install locally:
```bash
# macOS
brew install redis
redis-server

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis
```

### 3. Apply Database Migration

```bash
# Apply the leaderboard migration (004_leaderboard.sql)
npm run migrate:apply
```

Or manually via Supabase dashboard:
1. Go to SQL Editor
2. Copy contents of `supabase/migrations/004_leaderboard.sql`
3. Run the migration

### 4. Configure Environment Variables

Add to `.env.local`:
```bash
# Required (already set from previous work)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (add these)
REDIS_URL=redis://localhost:6379
# OR
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional (defaults shown)
WORKER_BATCH_SIZE=10
WORKER_POLL_INTERVAL_MS=1000
```

### 5. Start the Worker

In a separate terminal:
```bash
npm run worker:start
```

You should see:
```
[WorkerStartup] Leaderboard Worker Starting...
[LeaderboardWorker] Connected to Redis
[LeaderboardWorker] Worker started successfully!
[LeaderboardWorker] Listening for events on Redis queue: leaderboard_events
```

### 6. Test It Works

Complete a puzzle via the Progress API:
```bash
curl -X POST http://localhost:3000/api/progress/complete \
  -H "Content-Type: application/json" \
  -d '{
    "puzzle_id": "550e8400-e29b-41d4-a716-446655440000",
    "completion_time_seconds": 45,
    "session_id": "test-session-1"
  }'
```

Check the leaderboard:
```bash
curl http://localhost:3000/api/leaderboard
```

You should see your completion reflected (after ~1 second).

## Architecture Overview

```
User Completes Puzzle
        ↓
POST /api/progress/complete
        ↓
Save to game_results table
        ↓
Emit event → Redis Queue (leaderboard_events)
        ↓
Leaderboard Worker consumes event
        ↓
Check if already processed (session_id)
        ↓
Update leaderboard table (atomic)
        ↓
GET /api/leaderboard returns rankings
```

## Key Concepts

### Idempotency
Each puzzle completion has a unique `session_id`. The worker tracks processed session_ids in the `processed_events` table. If a duplicate event arrives (due to retries, crashes, etc.), it's safely ignored.

### Skill-Based Ranking
The leaderboard ranks by **average stars**, not total stars:
- Formula: `average_stars = total_stars / total_puzzles_completed`
- Why: Prevents grinding (completing many puzzles with low scores)
- Tiebreaker: `total_puzzles_completed DESC`

### Qualification Threshold
Only users who have completed **5 or more puzzles** appear on the leaderboard. This prevents one-time players from ranking.

### Eventually Consistent
The leaderboard updates asynchronously (typical lag: < 1 second). This trade-off provides:
- Better reliability (Progress API doesn't wait for leaderboard updates)
- Fault tolerance (worker can crash and restart without data loss)
- Horizontal scalability (multiple workers can process events in parallel)

## File Structure

```
src/
├── types/leaderboard.ts                    # TypeScript types
├── services/
│   ├── progress/
│   │   └── events.ts                       # Redis event emitter (updated)
│   └── leaderboard/
│       ├── repository.ts                   # Database operations
│       ├── worker.ts                       # Background worker
│       └── __tests__/
│           └── repository.test.ts          # Unit tests
└── app/
    └── api/
        └── leaderboard/
            ├── route.ts                    # GET /api/leaderboard
            ├── health/route.ts             # Health check
            └── __tests__/
                └── route.test.ts           # API tests

scripts/
└── start-leaderboard-worker.ts             # Worker startup script

supabase/
└── migrations/
    └── 004_leaderboard.sql                 # Database migration

docs/
├── LEADERBOARD_WORKER.md                   # Full documentation
└── LEADERBOARD_QUICKSTART.md               # This file
```

## Common Commands

```bash
# Start worker (development with auto-reload)
npm run worker:dev

# Start worker (production)
npm run worker:start

# Check health
curl http://localhost:3000/api/leaderboard/health

# View leaderboard
curl http://localhost:3000/api/leaderboard

# View leaderboard (with pagination)
curl "http://localhost:3000/api/leaderboard?limit=10&offset=0"

# Run tests
npm test src/services/leaderboard
npm test src/app/api/leaderboard
```

## Troubleshooting

### Worker won't start - "Missing required environment variables"
Make sure `.env.local` has:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL` (or `REDIS_HOST`)

### Worker won't start - "Redis not configured"
Start Redis:
```bash
docker run -p 6379:6379 redis:7-alpine
```

### Events not being processed
1. Check Redis is running: `redis-cli ping` (should return `PONG`)
2. Check queue has events: `redis-cli LLEN leaderboard_events`
3. Check worker logs for errors

### Leaderboard is empty
1. Complete at least 5 puzzles (qualification threshold)
2. Wait 1-2 seconds for worker to process
3. Check worker logs to see if events are being processed

## Next Steps

1. **Read full documentation**: See `docs/LEADERBOARD_WORKER.md`
2. **Deploy to production**: Follow deployment guides (Docker, Kubernetes, PM2)
3. **Monitor performance**: Check worker metrics via `getStatus()`
4. **Scale horizontally**: Run multiple worker instances for high volume

## Production Checklist

- [ ] Redis configured with authentication (`REDIS_PASSWORD`)
- [ ] Redis uses TLS (`rediss://...`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` stored securely (not in code)
- [ ] Worker deployed as separate service (not in Next.js process)
- [ ] Health checks configured for worker monitoring
- [ ] Logs forwarded to centralized logging (CloudWatch, Datadog, etc.)
- [ ] Metrics exported for monitoring (Prometheus, CloudWatch, etc.)
- [ ] Database indexes verified (from migration)
- [ ] Worker process manager configured (PM2, systemd, Kubernetes)

## Support

Questions? Check:
1. This guide
2. Full documentation: `docs/LEADERBOARD_WORKER.md`
3. Worker logs: `npm run worker:start`
4. Health endpoint: `GET /api/leaderboard/health`
