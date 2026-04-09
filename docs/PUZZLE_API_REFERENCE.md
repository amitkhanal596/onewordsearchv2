# Puzzle Service API Reference

Quick reference for the Puzzle Service API endpoints.

## Base URL

```
Development: http://localhost:3000
Production:  https://your-domain.com
```

## Endpoints

### GET /api/puzzle/random

Returns a randomly selected puzzle.

**Request:**
```http
GET /api/puzzle/random HTTP/1.1
Host: localhost:3000
```

**Response (200 OK):**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=300, stale-while-revalidate=3600
ETag: "MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwLTE3MDg1MTIwMDAwMDA="
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
Vary: Accept-Encoding

{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "puzzleNumber": 1,
  "puzzleDate": "2024-02-21",
  "board": [
    ["C", "A", "T"],
    ["D", "O", "G"],
    ["B", "I", "R"]
  ],
  "words": ["CAT", "DOG", "BIRD"],
  "difficulty": "easy",
  "category": "animals",
  "metadata": {
    "theme": "pets",
    "source": "onewordsearch.com"
  },
  "createdAt": "2024-02-21T00:00:00Z"
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "error": "No puzzles available",
  "code": "NO_PUZZLES",
  "statusCode": 503,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Status Codes:**
- `200` - Success
- `503` - No puzzles available or database unavailable
- `500` - Internal server error

**Caching:**
- TTL: 5 minutes
- Stale-while-revalidate: 1 hour
- CDN-friendly: Yes

---

### GET /api/puzzle/id/{puzzle_id}

Returns a specific puzzle by UUID.

**Request:**
```http
GET /api/puzzle/id/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:3000
```

**Response (200 OK):**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=86400, immutable
ETag: "MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwLTE3MDg1MTIwMDAwMDA="
X-Request-ID: 550e8400-e29b-41d4-a716-446655440001
Vary: Accept-Encoding

{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "puzzleNumber": 1,
  "puzzleDate": "2024-02-21",
  "board": [
    ["C", "A", "T"],
    ["D", "O", "G"],
    ["B", "I", "R"]
  ],
  "words": ["CAT", "DOG", "BIRD"],
  "difficulty": "easy",
  "category": "animals",
  "metadata": {
    "theme": "pets"
  },
  "createdAt": "2024-02-21T00:00:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid puzzle ID format",
  "code": "INVALID_ID",
  "statusCode": 400,
  "requestId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Puzzle not found",
  "code": "NOT_FOUND",
  "statusCode": 404,
  "requestId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid UUID format
- `404` - Puzzle not found
- `500` - Internal server error
- `503` - Database unavailable

**Caching:**
- TTL: 24 hours
- Immutable: Yes (content never changes)
- CDN-friendly: Yes (aggressive caching recommended)

---

### GET /api/puzzle/health

Health check endpoint for monitoring.

**Request:**
```http
GET /api/puzzle/health HTTP/1.1
Host: localhost:3000
```

**Response (200 OK - Healthy):**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-cache, no-store, must-revalidate

{
  "status": "healthy",
  "timestamp": "2024-02-21T12:00:00.000Z",
  "service": "puzzle-service"
}
```

**Response (503 Service Unavailable - Unhealthy):**
```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json
Cache-Control: no-cache, no-store, must-revalidate

{
  "status": "unhealthy",
  "timestamp": "2024-02-21T12:00:00.000Z",
  "service": "puzzle-service",
  "error": "Health check failed"
}
```

**Status Codes:**
- `200` - Service is healthy
- `503` - Service is unhealthy (database connection failed)

**Caching:**
- No caching (always fresh status)

---

## Response Schema

### Puzzle Object

```typescript
interface PuzzleServiceResponse {
  id: string;                          // UUID
  puzzleNumber: number;                // Sequential puzzle number
  puzzleDate: string;                  // ISO 8601 date (YYYY-MM-DD)
  board: string[][];                   // 2D array of letters
  words: string[];                     // Array of words to find
  difficulty?: string;                 // "easy" | "medium" | "hard"
  category?: string;                   // Puzzle category/theme
  metadata?: Record<string, unknown>;  // Additional metadata
  createdAt: string;                   // ISO 8601 timestamp
}
```

### Error Object

```typescript
interface PuzzleServiceError {
  error: string;       // Human-readable error message
  code: string;        // Machine-readable error code
  statusCode: number;  // HTTP status code
  requestId?: string;  // Correlation ID for tracing
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_ID` | 400 | Invalid UUID format |
| `INVALID_NUMBER` | 400 | Invalid puzzle number |
| `NOT_FOUND` | 404 | Puzzle not found |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Database unavailable |
| `NO_PUZZLES` | 503 | No puzzles in database |

---

## Headers

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Accept` | No | Response format (default: application/json) |
| `Accept-Encoding` | No | Compression format (gzip, br) |
| `If-None-Match` | No | ETag for conditional requests |

### Response Headers

| Header | Description |
|--------|-------------|
| `Cache-Control` | Caching directives |
| `ETag` | Entity tag for cache validation |
| `X-Request-ID` | Correlation ID for tracing |
| `Vary` | Headers affecting caching |
| `Content-Type` | Response format (application/json) |

---

## Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch random puzzle
const response = await fetch('/api/puzzle/random');
const puzzle = await response.json();

// Get request ID for tracing
const requestId = response.headers.get('X-Request-ID');

// Check cache headers
const cacheControl = response.headers.get('Cache-Control');
const etag = response.headers.get('ETag');

// Conditional request (with ETag)
const cachedResponse = await fetch('/api/puzzle/random', {
  headers: {
    'If-None-Match': etag
  }
});

if (cachedResponse.status === 304) {
  console.log('Using cached version');
}
```

### cURL

```bash
# Random puzzle
curl http://localhost:3000/api/puzzle/random

# Puzzle by ID
curl http://localhost:3000/api/puzzle/id/123e4567-e89b-12d3-a456-426614174000

# Health check
curl http://localhost:3000/api/puzzle/health

# Check headers
curl -I http://localhost:3000/api/puzzle/random

# Conditional request
curl -H "If-None-Match: \"etag-value\"" \
  http://localhost:3000/api/puzzle/random
```

### Python

```python
import requests

# Fetch random puzzle
response = requests.get('http://localhost:3000/api/puzzle/random')
puzzle = response.json()

# Get request ID
request_id = response.headers.get('X-Request-ID')

# Check cache headers
cache_control = response.headers.get('Cache-Control')
etag = response.headers.get('ETag')

# Conditional request
cached_response = requests.get(
    'http://localhost:3000/api/puzzle/random',
    headers={'If-None-Match': etag}
)

if cached_response.status_code == 304:
    print('Using cached version')
```

---

## Rate Limits (Recommended)

| Endpoint | Limit | Window | Reason |
|----------|-------|--------|--------|
| `/random` | 60 req/min | Per IP | Moderate usage |
| `/id/*` | 120 req/min | Per IP | Highly cacheable |
| `/health` | 600 req/min | Per IP | Monitoring tools |

**Note**: Rate limits not currently enforced. Implement via middleware or CDN.

---

## Caching Best Practices

### For Random Puzzles
```
Cache-Control: public, max-age=300, stale-while-revalidate=3600
```
- Cache for 5 minutes
- Allow stale content for 1 hour while revalidating
- Reduces database load during traffic spikes

### For Puzzle by ID
```
Cache-Control: public, max-age=86400, immutable
```
- Cache for 24 hours
- Immutable (content never changes)
- Perfect for CDN edge caching
- Near-zero origin load for popular puzzles

### ETag Validation
```javascript
// First request - cache puzzle and ETag
const response1 = await fetch('/api/puzzle/id/123...');
const etag = response1.headers.get('ETag');

// Subsequent requests - validate cache
const response2 = await fetch('/api/puzzle/id/123...', {
  headers: { 'If-None-Match': etag }
});

if (response2.status === 304) {
  // Use cached version (saves bandwidth)
}
```

---

## Error Handling

### Client-Side Error Handling

```typescript
async function fetchPuzzle(id: string) {
  try {
    const response = await fetch(`/api/puzzle/id/${id}`);

    if (!response.ok) {
      const error = await response.json();

      switch (error.code) {
        case 'INVALID_ID':
          console.error('Invalid puzzle ID format');
          break;
        case 'NOT_FOUND':
          console.error('Puzzle not found');
          break;
        case 'SERVICE_UNAVAILABLE':
          console.error('Service temporarily unavailable');
          // Implement retry logic
          break;
        default:
          console.error('Unknown error:', error);
      }

      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

### Retry Logic for 503 Errors

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url);

    if (response.status !== 503) {
      return response;
    }

    // Exponential backoff
    await new Promise(resolve =>
      setTimeout(resolve, Math.pow(2, i) * 1000)
    );
  }

  throw new Error('Service unavailable after retries');
}
```

---

## Performance Metrics

### Expected Response Times

| Scenario | Time | Notes |
|----------|------|-------|
| Cached at CDN | < 50ms | Edge cache hit |
| Cached at browser | < 10ms | Browser cache hit |
| Cache miss (DB) | < 200ms | US East region |
| Health check | < 50ms | Lightweight query |

### Monitoring Queries

```typescript
// Track response times
const start = performance.now();
const response = await fetch('/api/puzzle/random');
const duration = performance.now() - start;

console.log('Response time:', duration, 'ms');

// Track cache hits
const cacheStatus = response.headers.get('X-Cache') || 'MISS';
console.log('Cache status:', cacheStatus);
```

---

## Support

For issues or questions:
- **Comprehensive Docs**: `/docs/PUZZLE_SERVICE.md`
- **Service README**: `/src/services/puzzle/README.md`
- **Implementation Summary**: `/PUZZLE_SERVICE_IMPLEMENTATION.md`
- **Database Schema**: `/supabase/puzzles_schema.sql`
