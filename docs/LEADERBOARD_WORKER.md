# Leaderboard Worker Documentation

## Overview

The Leaderboard Worker is a background process that consumes puzzle completion events from Redis and updates the leaderboard asynchronously. It ensures skill-based rankings are maintained with proper idempotency and fault tolerance.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Progress API   │────────▶│  Redis Queue    │────────▶│ Leaderboard     │
│  (Event Source) │         │ (leaderboard_   │         │ Worker          │
│                 │         │  events)        │         │ (Consumer)      │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                                                  │
                                                                  ▼
                                                         ┌─────────────────┐
                                                         │  PostgreSQL     │
                                                         │  - leaderboard  │
                                                         │  - processed_   │
                                                         │    events       │
                                                         └─────────────────┘
```

## Key Features

### 1. Idempotency Guarantee
- Each event is processed exactly once using `session_id` as deduplication key
- `processed_events` table tracks which events have been processed
- Concurrent processing is safe (handles unique constraint violations)
- Worker crashes and restarts do not corrupt data

### 2. Skill-Based Ranking
- **Primary Metric**: `average_stars` (total_stars / total_puzzles_completed)
- **Tiebreaker**: `total_puzzles_completed` DESC
- **Qualification**: Users must complete >= 5 puzzles to appear on leaderboard
- **Anti-Grinding**: Average prevents ranking exploitation by volume alone

### 3. Fault Tolerance
- Graceful shutdown on SIGTERM/SIGINT
- Completes current batch before exiting
- Automatic Redis reconnection with exponential backoff
- Error logging without stopping the worker
- Crash-safe: can restart at any time without data loss

### 4. Eventually Consistent
- Leaderboard updates are asynchronous (may lag behind completions)
- Trade-off: Better performance and reliability vs real-time accuracy
- Typical lag: < 1 second under normal load

## Database Schema

### `leaderboard` Table
```sql
CREATE TABLE leaderboard (
  user_id UUID PRIMARY KEY,
  total_puzzles_completed INTEGER NOT NULL DEFAULT 0,
  total_stars INTEGER NOT NULL DEFAULT 0,
  average_stars NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

### `processed_events` Table
```sql
CREATE TABLE processed_events (
  session_id TEXT PRIMARY KEY,  -- Idempotency key
  user_id UUID NOT NULL,
  puzzle_id UUID NOT NULL,
  stars INTEGER NOT NULL,
  completion_time_seconds INTEGER NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW(),
  event_timestamp TIMESTAMP NOT NULL
);
```

## Event Format

Events published to Redis queue `leaderboard_events`:

```json
{
  "event_type": "puzzle_completed",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "puzzle_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "completion_time_seconds": 45,
  "stars": 5,
  "session_id": "unique-session-id-123",
  "timestamp": "2026-01-10T12:34:56.789Z"
}
```

## Setup

### Prerequisites

1. **PostgreSQL Database** (Supabase)
   - Apply migration: `supabase/migrations/004_leaderboard.sql`
   - Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

2. **Redis Server**
   - Local development: `docker run -p 6379:6379 redis:7-alpine`
   - Production: Redis Cloud, AWS ElastiCache, or similar
   - Requires `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=redis://localhost:6379

# Optional (with defaults)
WORKER_BATCH_SIZE=10                    # Events per batch
WORKER_POLL_INTERVAL_MS=1000           # Poll interval (1 second)
WORKER_SHUTDOWN_TIMEOUT_MS=10000       # Shutdown timeout (10 seconds)
WORKER_STATUS_LOG_INTERVAL_MS=60000    # Status logging interval (1 minute)
```

### Running the Worker

#### Development (with auto-reload)
```bash
npm run worker:dev
```

#### Production
```bash
npm run worker:start
```

#### Manual (with custom config)
```bash
tsx scripts/start-leaderboard-worker.ts
```

## Deployment

### Docker

Create a `Dockerfile` for the worker:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Start worker
CMD ["npm", "run", "worker:start"]
```

Build and run:
```bash
docker build -t leaderboard-worker .
docker run -e REDIS_URL=redis://... -e SUPABASE_SERVICE_ROLE_KEY=... leaderboard-worker
```

### Kubernetes

Deploy as a separate pod from your web application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: leaderboard-worker
spec:
  replicas: 1  # Scale horizontally if needed
  selector:
    matchLabels:
      app: leaderboard-worker
  template:
    metadata:
      labels:
        app: leaderboard-worker
    spec:
      containers:
      - name: worker
        image: your-registry/leaderboard-worker:latest
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        - name: SUPABASE_SERVICE_ROLE_KEY
          valueFrom:
            secretKeyRef:
              name: supabase-credentials
              key: service-role-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Process Manager (PM2)

For VPS deployments:

```json
{
  "apps": [
    {
      "name": "leaderboard-worker",
      "script": "scripts/start-leaderboard-worker.ts",
      "interpreter": "tsx",
      "instances": 1,
      "autorestart": true,
      "watch": false,
      "max_memory_restart": "512M",
      "env": {
        "NODE_ENV": "production"
      }
    }
  ]
}
```

Run with: `pm2 start ecosystem.config.json`

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/leaderboard/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-10T12:34:56.789Z",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

### Worker Logs

The worker emits structured logs:

```
[LeaderboardWorker] Starting worker...
[LeaderboardWorker] Connected to Redis
[LeaderboardWorker] Processing batch: { count: 5 }
[LeaderboardWorker] Event processed successfully: { session_id: "...", total_processed: 1 }
[LeaderboardWorker] Event skipped (duplicate): { session_id: "...", total_skipped: 1 }
```

### Metrics

Access worker status programmatically:

```typescript
const worker = await startLeaderboardWorker();
const status = worker.getStatus();

console.log(status);
// {
//   running: true,
//   eventsProcessed: 1234,
//   eventsSkipped: 56,
//   lastProcessedAt: "2026-01-10T12:34:56.789Z",
//   startedAt: "2026-01-10T12:00:00.000Z",
//   errors: [...]
// }
```

## API Endpoints

### GET /api/leaderboard

Retrieve the leaderboard with pagination.

**Query Parameters:**
- `limit` (optional): Maximum entries (default: 50, max: 100)
- `offset` (optional): Skip entries (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/leaderboard?limit=10&offset=0"
```

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "total_puzzles_completed": 100,
      "average_stars": 4.75
    },
    {
      "rank": 2,
      "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "total_puzzles_completed": 50,
      "average_stars": 4.68
    }
  ],
  "total": 250,
  "limit": 10,
  "offset": 0
}
```

**Filtering:**
- Only users with >= 5 puzzles are shown (qualification threshold)

**Sorting:**
1. `average_stars` DESC (primary)
2. `total_puzzles_completed` DESC (tiebreaker)

## Troubleshooting

### Worker won't start

**Check environment variables:**
```bash
echo $REDIS_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

**Test Redis connection:**
```bash
redis-cli ping
# Should return: PONG
```

**Test database connection:**
```bash
curl http://localhost:3000/api/leaderboard/health
```

### Events not being processed

**Check Redis queue:**
```bash
redis-cli LLEN leaderboard_events
# Returns number of pending events
```

**Check worker logs:**
```bash
# Look for errors in worker output
npm run worker:start
```

**Verify Progress Service is emitting events:**
```bash
# Check Progress Service logs for:
[EventEmitter] Event emitted to Redis
```

### Duplicate events appearing

This should NOT happen due to idempotency checks. If it does:

1. Check `processed_events` table for duplicates
2. Verify `session_id` uniqueness constraint exists
3. Review worker logs for unique violation errors

### Leaderboard is stale

**Check worker is running:**
```bash
ps aux | grep leaderboard-worker
```

**Check Redis queue backlog:**
```bash
redis-cli LLEN leaderboard_events
# If growing, worker may be overwhelmed
```

**Solution:** Scale worker horizontally (run multiple instances)

## Testing

### Unit Tests

```bash
npm test src/services/leaderboard/__tests__/repository.test.ts
npm test src/app/api/leaderboard/__tests__/route.test.ts
```

### Integration Test

```bash
# 1. Start Redis
docker run -p 6379:6379 redis:7-alpine

# 2. Apply migrations
npm run migrate:apply

# 3. Start worker
npm run worker:start

# 4. Emit test event
redis-cli RPUSH leaderboard_events '{"event_type":"puzzle_completed","user_id":"test-user","puzzle_id":"test-puzzle","completion_time_seconds":45,"stars":5,"session_id":"test-session-1","timestamp":"2026-01-10T12:00:00Z"}'

# 5. Check leaderboard
curl http://localhost:3000/api/leaderboard

# 6. Verify idempotency (emit same event again)
redis-cli RPUSH leaderboard_events '{"event_type":"puzzle_completed","user_id":"test-user","puzzle_id":"test-puzzle","completion_time_seconds":45,"stars":5,"session_id":"test-session-1","timestamp":"2026-01-10T12:00:00Z"}'

# Should be skipped (check worker logs)
```

## Performance Considerations

### Batch Size

- Default: 10 events per batch
- Increase for high-volume scenarios: `WORKER_BATCH_SIZE=50`
- Trade-off: Higher throughput vs memory usage

### Poll Interval

- Default: 1000ms (1 second)
- Decrease for lower latency: `WORKER_POLL_INTERVAL_MS=100`
- Trade-off: Lower latency vs CPU usage

### Horizontal Scaling

Safe to run multiple worker instances:
- Each instance consumes from same Redis queue (FIFO)
- Idempotency prevents duplicate processing
- Database handles concurrent writes via unique constraints

### Database Indexes

Ensure indexes exist (from migration):
```sql
-- Leaderboard ranking query
CREATE INDEX idx_leaderboard_ranking
  ON leaderboard(average_stars DESC, total_puzzles_completed DESC)
  WHERE total_puzzles_completed >= 5;

-- User lookup
CREATE INDEX idx_leaderboard_user_id ON leaderboard(user_id);
```

## Security

### Service Role Key

Worker uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS (Row Level Security):
- **Never expose** this key in client-side code
- Store in environment variables only
- Rotate regularly

### Redis Security

Production Redis should:
- Require authentication (`REDIS_PASSWORD`)
- Use TLS encryption (`rediss://...`)
- Restrict network access (VPC, firewall)

## Future Enhancements

### 1. Redis Streams (instead of Lists)

Current implementation uses `LPOP/RPUSH` (simple queue).

Upgrade to Redis Streams for:
- Consumer groups (multiple workers)
- Acknowledgments (prevent message loss)
- Message retention (replay events)

### 2. Dead Letter Queue

Add fallback for events that fail processing:
- After N retries, move to `leaderboard_events_dlq`
- Manual review and reprocessing

### 3. Metrics Export

Integrate with monitoring systems:
- Prometheus metrics endpoint
- Custom CloudWatch/Datadog metrics
- Event processing rate, error rate, queue depth

### 4. Best Time Tracking

Extend leaderboard schema:
```sql
ALTER TABLE leaderboard ADD COLUMN best_time_seconds INTEGER;
```

Track fastest completion time alongside average stars.

## Support

For issues or questions:
- Check logs first (`npm run worker:start`)
- Review this documentation
- Check health endpoint: `GET /api/leaderboard/health`
- Test Redis connection: `redis-cli ping`
