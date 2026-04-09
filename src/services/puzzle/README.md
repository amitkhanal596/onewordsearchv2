# Puzzle Service

A stateless, read-only microservice for serving puzzle data.

## Quick Start

### 1. Setup Database

Run the schema migration:
```bash
# In Supabase SQL Editor, execute:
cat supabase/puzzles_schema.sql
```

### 2. Environment Variables

Ensure these are set in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Tests

```bash
npm run test:run -- src/__tests__/puzzle/
```

### 4. Test Endpoints

```bash
# Random puzzle
curl http://localhost:3000/api/puzzle/random

# Puzzle by ID
curl http://localhost:3000/api/puzzle/id/{uuid}

# Health check
curl http://localhost:3000/api/puzzle/health
```

## Architecture

```
┌─────────────────────────────────────────┐
│          API Endpoints                  │
│  /api/puzzle/random                     │
│  /api/puzzle/id/{id}                    │
│  /api/puzzle/health                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      Service Layer (service.ts)         │
│  - Business logic                       │
│  - Cache header generation              │
│  - Data transformation                  │
│  - Error handling                       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Repository Layer (repository.ts)      │
│  - Database access                      │
│  - Query optimization                   │
│  - Connection pooling                   │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│         Supabase PostgreSQL             │
│  - Puzzles table                        │
│  - Row Level Security                   │
│  - Indexed columns                      │
└─────────────────────────────────────────┘
```

## Design Principles

### Statelessness
- No session data
- No user authentication
- No database writes
- Pure functions only

### Cacheability
- Proper Cache-Control headers
- ETag support
- CDN-ready responses
- No user-specific data

### Fault Isolation
- Graceful error handling
- Health check endpoint
- No cascading failures
- Circuit breaker ready

## Files

### Core Service Files
- `repository.ts` - Database access layer
- `service.ts` - Business logic layer

### API Routes
- `/api/puzzle/random/route.ts` - Random puzzle endpoint
- `/api/puzzle/id/[puzzle_id]/route.ts` - Puzzle by ID endpoint
- `/api/puzzle/health/route.ts` - Health check endpoint

### Tests
- `/__tests__/puzzle/service.test.ts` - Service layer tests
- `/__tests__/puzzle/api.test.ts` - API endpoint tests

### Database
- `/supabase/puzzles_schema.sql` - Database schema

### Documentation
- `/docs/PUZZLE_SERVICE.md` - Comprehensive documentation

## Cache Strategy

### Random Puzzle
```
Cache-Control: public, max-age=300, stale-while-revalidate=3600
```
- 5 minute TTL (result varies)
- 1 hour stale-while-revalidate
- CDN and browser cacheable

### Puzzle by ID
```
Cache-Control: public, max-age=86400, immutable
```
- 24 hour TTL (content never changes)
- Immutable directive
- Aggressive CDN caching

### Health Check
```
Cache-Control: no-cache, no-store, must-revalidate
```
- No caching (always fresh status)
- Used for monitoring

## Error Handling

### Status Codes
- `200` - Success
- `400` - Invalid input (bad UUID format)
- `404` - Puzzle not found
- `500` - Internal server error
- `503` - Service unavailable (DB connection failed)

### Error Response Format
```json
{
  "error": "Puzzle not found",
  "code": "NOT_FOUND",
  "statusCode": 404,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Logging

All operations include structured logs with request IDs:

```
[PuzzleService:getRandomPuzzle:550e8400] Fetching random puzzle
[PuzzleService:getRandomPuzzle:550e8400] Fetch completed in 45ms
```

Format: `[Service:Method:RequestID] Message`

## Future Enhancements

### Phase 1: Redis Caching
```typescript
// Add Redis layer for improved performance
const puzzle = await redis.get(`puzzle:${id}`)
  || await repository.getPuzzleById(id);
```

### Phase 2: Standalone Deployment
- Extract to separate Node.js service
- Deploy as Docker container
- Independent scaling

### Phase 3: Service Mesh
- Circuit breaker pattern
- Distributed tracing
- Centralized logging

## Contributing

### Before Committing
1. Run tests: `npm run test:run -- src/__tests__/puzzle/`
2. Check types: `npm run build`
3. Verify cache headers
4. Update documentation

### Code Style
- Use structured logging with request IDs
- Return proper HTTP status codes
- Include comprehensive error handling
- Add JSDoc comments for public methods

## Support

For issues or questions:
1. Check `/docs/PUZZLE_SERVICE.md` for detailed documentation
2. Review test cases in `/__tests__/puzzle/`
3. Verify database schema in `/supabase/puzzles_schema.sql`

## License

Part of OneWordSearch v2 application.
