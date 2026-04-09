/**
 * GET /api/progress/health
 *
 * Health check endpoint for service monitoring and load balancers.
 *
 * Authentication: Not required (public endpoint)
 * Method: GET
 *
 * Response Format:
 * {
 *   "status": "healthy" | "unhealthy",
 *   "timestamp": "ISO8601 datetime",
 *   "checks": {
 *     "database": boolean,
 *     "redis": boolean
 *   }
 * }
 *
 * Response Codes:
 * - 200 OK: All services healthy
 * - 503 Service Unavailable: One or more services unhealthy
 *
 * Headers:
 * - X-Request-ID: Correlation ID for distributed tracing
 * - Cache-Control: no-store (never cache health checks)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProgressService } from '@/services/progress/service';
import { randomUUID } from 'crypto';

/**
 * Generate or extract request ID for tracing
 */
function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || randomUUID();
}

/**
 * GET handler for health check
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const service = createProgressService();

    console.info('[GET /api/progress/health] Health check requested:', {
      requestId,
    });

    const health = await service.healthCheck();

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(health, {
      status: statusCode,
      headers: {
        'X-Request-ID': requestId,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/progress/health] Health check failed:', {
      requestId,
      error,
    });

    // Return unhealthy status on any error
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: false,
          redis: false,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      {
        status: 503,
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
