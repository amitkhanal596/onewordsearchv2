# Puzzle Service - Independent Deployment Guide

## Overview

The Puzzle Service is a **stateless, read-only microservice** designed to serve puzzle data independently from the main application. It follows distributed systems best practices for cacheability, fault isolation, and independent deployability.

## Architecture Principles

### Statelessness
- **No user sessions**: Service does not maintain any user state
- **No authentication**: Puzzles are public data, no auth required
- **No database writes**: Read-only operations only
- **Idempotent endpoints**: Same request always produces same result (for puzzle by ID)

### Cacheability
All endpoints return appropriate HTTP caching headers:
- **Random puzzles**: `Cache-Control: public, max-age=300, stale-while-revalidate=3600` (5 minutes)
- **Puzzle by ID**: `Cache-Control: public, max-age=86400, immutable` (24 hours)
- **ETag support**: For cache validation
- **CDN-ready**: Responses can be cached by CDNs, reverse proxies, and Redis

### Fault Isolation
- **Circuit breaker compatible**: Health check endpoint for monitoring
- **Graceful degradation**: Returns proper HTTP status codes (503 when unavailable)
- **No cascading failures**: Service crashes don't affect other services
- **Structured logging**: Request IDs for distributed tracing

## API Endpoints

### 1. GET /api/puzzle/random

Returns a randomly selected puzzle from the database.

**Response:**
```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=300, stale-while-revalidate=3600
ETag: "ABC123..."
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000

{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "puzzleNumber": 1,
  "puzzleDate": "2024-02-21",
  "board": [["C","A","T"],["D","O","G"],["B","I","R"]],
  "words": ["CAT","DOG","BIRD"],
  "difficulty": "easy",
  "category": "animals",
  "metadata": {"theme": "pets"},
  "createdAt": "2024-02-21T00:00:00Z"
}
```

**Status Codes:**
- `200`: Success
- `503`: No puzzles available (service degraded)
- `500`: Internal server error

**Caching Strategy:**
- TTL: 5 minutes (result varies per request)
- Allows stale content for 1 hour while revalidating
- Suitable for high-traffic scenarios

### 2. GET /api/puzzle/id/{puzzle_id}

Returns a specific puzzle by UUID.

**Parameters:**
- `puzzle_id` (path): UUID of the puzzle

**Response:**
```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=86400, immutable
ETag: "XYZ789..."
X-Request-ID: 550e8400-e29b-41d4-a716-446655440001

{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "puzzleNumber": 1,
  "puzzleDate": "2024-02-21",
  "board": [["C","A","T"],["D","O","G"],["B","I","R"]],
  "words": ["CAT","DOG","BIRD"],
  "difficulty": "easy",
  "category": "animals",
  "metadata": {"theme": "pets"},
  "createdAt": "2024-02-21T00:00:00Z"
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid UUID format
- `404`: Puzzle not found
- `500`: Internal server error
- `503`: Database unavailable

**Caching Strategy:**
- TTL: 24 hours (immutable content)
- Aggressive CDN caching recommended
- Content never changes once created

### 3. GET /api/puzzle/health

Health check endpoint for monitoring and load balancing.

**Response (Healthy):**
```http
HTTP/1.1 200 OK
Cache-Control: no-cache, no-store, must-revalidate

{
  "status": "healthy",
  "timestamp": "2024-02-21T12:00:00Z",
  "service": "puzzle-service"
}
```

**Response (Unhealthy):**
```http
HTTP/1.1 503 Service Unavailable
Cache-Control: no-cache, no-store, must-revalidate

{
  "status": "unhealthy",
  "timestamp": "2024-02-21T12:00:00Z",
  "service": "puzzle-service"
}
```

**Status Codes:**
- `200`: Service is healthy
- `503`: Service is unhealthy (database connection failed)

**Use Cases:**
- Load balancer health checks
- Circuit breaker monitoring
- Service mesh health probes
- Kubernetes liveness/readiness probes

## Database Schema

### Setup Instructions

1. Run the schema migration in your Supabase SQL Editor:
```bash
cat supabase/puzzles_schema.sql | supabase db execute
```

Or manually execute the SQL file in Supabase Dashboard → SQL Editor.

### Table Structure

```sql
CREATE TABLE public.puzzles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puzzle_number INTEGER UNIQUE NOT NULL,
    puzzle_date DATE UNIQUE NOT NULL,
    board JSONB NOT NULL,
    words JSONB NOT NULL,
    difficulty TEXT,
    category TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

- `idx_puzzles_number`: Fast lookups by puzzle number
- `idx_puzzles_date`: Fast lookups by date
- `idx_puzzles_difficulty`: Filtering by difficulty
- `idx_puzzles_created_at`: Chronological ordering

### Row Level Security

- **SELECT**: Public (no authentication required)
- **INSERT/UPDATE/DELETE**: Authenticated users only (admin operations)

This ensures the service remains read-only from the API perspective.

## Independent Deployment

### Option 1: Deploy with Main Application (Current Setup)

The service currently runs as part of the Next.js application:

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Access endpoints at:
- `http://localhost:3000/api/puzzle/random`
- `http://localhost:3000/api/puzzle/id/{puzzle_id}`
- `http://localhost:3000/api/puzzle/health`

### Option 2: Deploy as Standalone Service (Future)

For true independent deployment, extract the service into a separate Node.js application:

#### Directory Structure
```
puzzle-service/
├── src/
│   ├── services/
│   │   └── puzzle/
│   │       ├── repository.ts
│   │       └── service.ts
│   ├── api/
│   │   ├── random.ts
│   │   ├── id.ts
│   │   └── health.ts
│   └── index.ts
├── tests/
├── Dockerfile
├── package.json
└── README.md
```

#### Dockerfile Example
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/

EXPOSE 3001

CMD ["node", "src/index.ts"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  puzzle-service:
    build: ./puzzle-service
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${SUPABASE_URL}
      - DATABASE_KEY=${SUPABASE_ANON_KEY}
      - PORT=3001
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: puzzle-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: puzzle-service
  template:
    metadata:
      labels:
        app: puzzle-service
    spec:
      containers:
      - name: puzzle-service
        image: puzzle-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: puzzle-service-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: puzzle-service
spec:
  selector:
    app: puzzle-service
  ports:
  - port: 80
    targetPort: 3001
  type: LoadBalancer
```

## Monitoring and Observability

### Request Tracing

Every request includes an `X-Request-ID` header for distributed tracing:

```javascript
// Client-side tracking
fetch('/api/puzzle/random')
  .then(response => {
    const requestId = response.headers.get('X-Request-ID');
    console.log('Request ID:', requestId);
  });
```

### Structured Logging

All service operations include structured logs:

```
[PuzzleService:getRandomPuzzle:550e8400-e29b-41d4-a716-446655440000] Fetching random puzzle
[PuzzleService:getRandomPuzzle:550e8400-e29b-41d4-a716-446655440000] Fetch completed in 45ms
```

Log format: `[Service:Method:RequestID] Message`

### Metrics to Monitor

1. **Response Times**
   - P50, P95, P99 latencies
   - Target: < 100ms for cached requests, < 500ms for DB queries

2. **Cache Hit Rates**
   - Monitor ETag validation responses (304 Not Modified)
   - Target: > 80% cache hit rate for puzzle by ID

3. **Error Rates**
   - 4xx errors (client errors)
   - 5xx errors (server errors)
   - Target: < 0.1% error rate

4. **Health Check Status**
   - Database connection health
   - Response time of health endpoint
   - Target: 100% uptime

### Example Monitoring with Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'puzzle-service'
    static_configs:
      - targets: ['puzzle-service:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## Performance Optimization

### Database Query Optimization

Current implementation uses:
- Connection pooling (via Supabase client)
- Indexed columns for fast lookups
- Single-query random selection (no COUNT + OFFSET pattern)

### Future Redis Caching Layer

The service is designed for easy Redis integration:

```typescript
// Future implementation example
export class RedisCachedPuzzleRepository implements PuzzleRepository {
  private baseRepo: PuzzleRepository;
  private redis: RedisClient;

  async getPuzzleById(id: string): Promise<PuzzleDbRow | null> {
    const cacheKey = `puzzle:${id}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - fetch from database
    const puzzle = await this.baseRepo.getPuzzleById(id);
    if (puzzle) {
      await this.redis.setex(cacheKey, 86400, JSON.stringify(puzzle));
    }

    return puzzle;
  }
}
```

## Testing

### Running Tests

```bash
# Run all puzzle service tests
npm run test:run -- src/__tests__/puzzle/

# Run with coverage
npm run test:coverage -- src/__tests__/puzzle/

# Run in watch mode
npm run test:watch -- src/__tests__/puzzle/
```

### Test Coverage

Current test suite covers:
- ✅ Random puzzle generation (100%)
- ✅ Puzzle retrieval by ID (100%)
- ✅ Cache header generation (100%)
- ✅ Error handling (100%)
- ✅ Statelessness verification (100%)
- ✅ Idempotency verification (100%)
- ✅ Health check endpoint (100%)

### Testing Caching Behavior

```bash
# Test cache headers
curl -I http://localhost:3000/api/puzzle/id/123e4567-e89b-12d3-a456-426614174000

# Expected headers:
# Cache-Control: public, max-age=86400, immutable
# ETag: "ABC123..."

# Test conditional request
curl -H "If-None-Match: \"ABC123...\"" \
  http://localhost:3000/api/puzzle/id/123e4567-e89b-12d3-a456-426614174000

# Expected: 304 Not Modified
```

## Troubleshooting

### Service Returns 503

**Cause**: Database connection failed or no puzzles available

**Solutions**:
1. Check Supabase connection:
   ```bash
   # Verify environment variables
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. Check database has puzzles:
   ```sql
   SELECT COUNT(*) FROM public.puzzles;
   ```

3. Run schema migration if table doesn't exist:
   ```bash
   psql -f supabase/puzzles_schema.sql
   ```

### High Response Times

**Cause**: Database query slow or no caching

**Solutions**:
1. Verify indexes exist:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'puzzles';
   ```

2. Enable query logging in Supabase

3. Add Redis caching layer (see Performance Optimization)

### Cache Headers Not Working

**Cause**: Middleware or reverse proxy stripping headers

**Solutions**:
1. Check Next.js middleware configuration
2. Verify reverse proxy (nginx, cloudflare) settings
3. Test directly against service endpoint (bypass CDN)

## Security Considerations

### Read-Only Access
- Service only performs SELECT queries
- No user input affects database writes
- Row Level Security prevents unauthorized modifications

### Input Validation
- UUID validation for puzzle ID
- Number validation for puzzle number
- Protection against SQL injection (Supabase client handles this)

### Rate Limiting

Recommended rate limits:
- `/api/puzzle/random`: 60 requests/minute per IP
- `/api/puzzle/id/*`: 120 requests/minute per IP (highly cacheable)
- `/api/puzzle/health`: 600 requests/minute (health checks)

Example with Next.js middleware:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"),
});

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/puzzle')) {
    const { success } = await ratelimit.limit(request.ip);
    if (!success) {
      return new Response('Too Many Requests', { status: 429 });
    }
  }
}
```

## Migration Guide

### From Monolith to Microservice

1. **Phase 1**: Current state (integrated)
   - Service runs within Next.js app
   - Shared database connection pool
   - No service mesh required

2. **Phase 2**: Add Redis caching
   - Implement Redis caching layer
   - Reduce database load
   - Improve response times

3. **Phase 3**: Extract to standalone service
   - Move service code to separate repository
   - Deploy as independent Docker container
   - Update client applications to use new endpoints

4. **Phase 4**: Add service mesh
   - Implement circuit breaker pattern
   - Add distributed tracing (OpenTelemetry)
   - Set up centralized logging (ELK stack)

## Contributing

When modifying the Puzzle Service, ensure:

1. ✅ All tests pass (`npm run test:run -- src/__tests__/puzzle/`)
2. ✅ No user-specific data in responses
3. ✅ Proper cache headers on all endpoints
4. ✅ Health check endpoint remains functional
5. ✅ Structured logging with request IDs
6. ✅ Error handling with appropriate status codes
7. ✅ Documentation updated with API changes

## License

This service is part of the OneWordSearch v2 application.
