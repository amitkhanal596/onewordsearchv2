/**
 * GET /api/puzzle/health
 *
 * Health check endpoint for service monitoring.
 *
 * Response:
 * - 200: Service healthy
 * - 503: Service unhealthy (database connection failed)
 *
 * Design:
 * - Used for load balancer health checks
 * - Used for circuit breaker monitoring
 * - No caching (always fresh status)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPuzzleService } from '@/services/puzzle/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const service = createPuzzleService();
    const health = await service.healthCheck();

    if (!health.healthy) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: health.timestamp,
          service: 'puzzle-service',
        },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: health.timestamp,
        service: 'puzzle-service',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[API:PuzzleHealth] Unexpected error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'puzzle-service',
        error: 'Health check failed',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
