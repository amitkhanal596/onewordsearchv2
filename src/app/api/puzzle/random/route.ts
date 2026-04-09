/**
 * GET /api/puzzle/random
 *
 * Returns a randomly selected puzzle from the database.
 *
 * Response:
 * - 200: Random puzzle with Cache-Control headers
 * - 503: No puzzles available
 * - 500: Internal server error
 *
 * Cache Strategy:
 * - Cache-Control: public, max-age=300, stale-while-revalidate=3600
 * - Short TTL (5 minutes) since result varies
 * - Cacheable by CDNs and browsers
 *
 * Design:
 * - Stateless: No user or session data
 * - Read-only: No database writes
 * - Fault-isolated: Errors don't cascade
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPuzzleService } from '@/services/puzzle/service';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Generate request ID for correlation
  const requestId = randomUUID();

  try {
    const service = createPuzzleService();
    const result = await service.getRandomPuzzle(requestId);

    if (!result.success || !result.data) {
      return NextResponse.json(
        result.error,
        {
          status: result.error?.statusCode || 500,
          headers: result.cacheHeaders,
        }
      );
    }

    // Return puzzle with cache headers
    return NextResponse.json(result.data, {
      status: 200,
      headers: {
        ...result.cacheHeaders,
        'X-Request-ID': requestId,
      },
    });
  } catch (error) {
    console.error(`[API:RandomPuzzle:${requestId}] Unexpected error:`, error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        requestId,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache',
          'X-Request-ID': requestId,
        },
      }
    );
  }
}
