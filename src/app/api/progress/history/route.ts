/**
 * GET /api/progress/history
 *
 * Retrieves user's puzzle completion history with pagination.
 *
 * Authentication: Required (JWT verification via Supabase)
 * Method: GET
 *
 * Query Parameters:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 *
 * Response Format:
 * {
 *   "completions": [...],
 *   "total": number,
 *   "limit": number,
 *   "offset": number
 * }
 *
 * Response Codes:
 * - 200 OK: History retrieved successfully
 * - 400 Bad Request: Invalid pagination parameters
 * - 401 Unauthorized: Not authenticated
 * - 500 Internal Server Error: Database error
 *
 * Headers:
 * - X-Request-ID: Correlation ID for distributed tracing
 * - Cache-Control: private, max-age=60 (user-specific, cache for 1 minute)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createProgressService } from '@/services/progress/service';
import { randomUUID } from 'crypto';
import { verifyAuth } from '@/utils/auth/verify';

/**
 * Generate or extract request ID for tracing
 */
function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || randomUUID();
}

/**
 * Parse and validate pagination parameters
 */
function getPaginationParams(request: NextRequest): {
  limit: number;
  offset: number;
  error?: string;
} {
  const { searchParams } = new URL(request.url);

  let limit = 20; // default
  let offset = 0; // default

  const limitParam = searchParams.get('limit');
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return { limit: 0, offset: 0, error: 'Invalid limit parameter (must be positive integer)' };
    }
    limit = parsed;
  }

  const offsetParam = searchParams.get('offset');
  if (offsetParam) {
    const parsed = parseInt(offsetParam, 10);
    if (isNaN(parsed) || parsed < 0) {
      return { limit: 0, offset: 0, error: 'Invalid offset parameter (must be non-negative integer)' };
    }
    offset = parsed;
  }

  return { limit, offset };
}

/**
 * GET handler for retrieving user completion history
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // 1. Authenticate user (supports both cookies and Bearer tokens)
    const { user, error: authError, supabase } = await verifyAuth(request);

    if (authError || !user) {
      console.warn('[GET /api/progress/history] Unauthorized access attempt:', {
        requestId,
        error: authError?.message,
      });
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          statusCode: 401,
          requestId,
        },
        {
          status: 401,
          headers: {
            'X-Request-ID': requestId,
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // 2. Parse and validate pagination parameters
    const { limit, offset, error } = getPaginationParams(request);

    if (error) {
      console.warn('[GET /api/progress/history] Invalid pagination params:', {
        requestId,
        error,
      });
      return NextResponse.json(
        {
          error,
          code: 'INVALID_PAGINATION',
          statusCode: 400,
          requestId,
        },
        {
          status: 400,
          headers: {
            'X-Request-ID': requestId,
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // 3. Fetch user history via service layer
    const service = createProgressService(supabase);

    console.info('[GET /api/progress/history] Fetching history:', {
      requestId,
      userId: user.id,
      limit,
      offset,
    });

    const result = await service.getUserHistory(user.id, limit, offset);

    // 4. Return success response
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        // Cache for 1 minute - user-specific data
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/progress/history] Error:', {
      requestId,
      error,
    });

    // Handle known errors
    if (error instanceof Error) {
      if (error.message === 'DATABASE_ERROR') {
        return NextResponse.json(
          {
            error: 'Database error',
            code: 'DATABASE_ERROR',
            statusCode: 500,
            requestId,
          },
          {
            status: 500,
            headers: {
              'X-Request-ID': requestId,
              'Cache-Control': 'no-store',
            },
          }
        );
      }
    }

    // Unknown error
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
          'X-Request-ID': requestId,
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
