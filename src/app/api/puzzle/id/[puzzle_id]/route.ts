/**
 * GET /api/puzzle/id/{puzzle_id}
 *
 * Returns a specific puzzle by UUID.
 *
 * Response:
 * - 200: Puzzle found with Cache-Control headers
 * - 400: Invalid puzzle ID format
 * - 404: Puzzle not found
 * - 500: Internal server error
 *
 * Cache Strategy:
 * - Cache-Control: public, max-age=86400, immutable
 * - Long TTL (24 hours) since content never changes
 * - Aggressive CDN caching
 *
 * Design:
 * - Stateless: No user or session data
 * - Read-only: No database writes
 * - Idempotent: Same ID always returns same puzzle
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPuzzleService } from '@/services/puzzle/service';
import { randomUUID } from 'crypto';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ puzzle_id: string }> }
): Promise<NextResponse> {
  const requestId = randomUUID();

  try {
    const { puzzle_id } = await context.params;

    const service = createPuzzleService();
    const result = await service.getPuzzleById(puzzle_id, requestId);

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
    console.error(`[API:PuzzleById:${requestId}] Unexpected error:`, error);

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
