/**
 * POST /api/progress/complete
 *
 * Records puzzle completion with idempotency guarantee.
 *
 * Authentication: Required (JWT verification via Supabase)
 * Method: POST
 * Content-Type: application/json
 *
 * Request Body:
 * {
 *   "puzzle_id": "uuid",
 *   "completion_time_seconds": number,
 *   "session_id": "unique-session-id"
 * }
 *
 * Response Codes:
 * - 201 Created: New completion recorded
 * - 200 OK: Duplicate session_id (idempotent response)
 * - 400 Bad Request: Invalid input
 * - 401 Unauthorized: Not authenticated
 * - 409 Conflict: Foreign key violation (invalid puzzle_id)
 * - 500 Internal Server Error: Database error
 *
 * Headers:
 * - X-Request-ID: Correlation ID for distributed tracing
 * - Cache-Control: no-store (never cache completion endpoints)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createProgressService } from '@/services/progress/service';
import type { RecordCompletionRequest } from '@/types/progress';
import { randomUUID } from 'crypto';
import { verifyAuth } from '@/utils/auth/verify';

/**
 * Generate or extract request ID for tracing
 */
function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || randomUUID();
}

/**
 * POST handler for recording puzzle completion
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // 1. Authenticate user (supports both cookies and Bearer tokens)
    const { user, error: authError, supabase } = await verifyAuth(request);

    if (authError || !user) {
      console.warn('[POST /api/progress/complete] Unauthorized access attempt:', {
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

    // 2. Parse and validate request body
    let body: RecordCompletionRequest;
    try {
      body = await request.json();
    } catch (error) {
      console.warn('[POST /api/progress/complete] Invalid JSON:', {
        requestId,
        error,
      });
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
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

    // 3. Validate required fields
    const { puzzle_id, puzzle_date, completion_time_seconds, session_id } = body;

    if (!puzzle_id || typeof puzzle_id !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing or invalid puzzle_id',
          code: 'INVALID_PUZZLE_ID',
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

    if (
      !completion_time_seconds ||
      typeof completion_time_seconds !== 'number' ||
      completion_time_seconds <= 0 ||
      !Number.isInteger(completion_time_seconds)
    ) {
      return NextResponse.json(
        {
          error: 'Missing or invalid completion_time_seconds (must be positive integer)',
          code: 'INVALID_COMPLETION_TIME',
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

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing or invalid session_id',
          code: 'INVALID_SESSION_ID',
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

    // 4. Record completion via service layer
    const service = createProgressService(supabase);

    console.info('[POST /api/progress/complete] Recording completion:', {
      requestId,
      userId: user.id,
      puzzleId: puzzle_id,
      sessionId: session_id,
      completionTime: completion_time_seconds,
    });

    const result = await service.recordCompletion(
      user.id,
      puzzle_id,
      session_id,
      completion_time_seconds,
      puzzle_date
    );

    // 5. Return success response
    return NextResponse.json(result, {
      status: 201,
      headers: {
        'X-Request-ID': requestId,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('[POST /api/progress/complete] Error:', {
      requestId,
      error,
    });

    // Handle known errors
    if (error instanceof Error) {
      switch (error.message) {
        case 'INVALID_PUZZLE_ID':
          return NextResponse.json(
            {
              error: 'Invalid puzzle_id format',
              code: 'INVALID_PUZZLE_ID',
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

        case 'INVALID_SESSION_ID':
          return NextResponse.json(
            {
              error: 'Invalid session_id format',
              code: 'INVALID_SESSION_ID',
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

        case 'INVALID_COMPLETION_TIME':
          return NextResponse.json(
            {
              error: 'Invalid completion_time_seconds',
              code: 'INVALID_COMPLETION_TIME',
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

        case 'INVALID_REFERENCE':
          return NextResponse.json(
            {
              error: 'Invalid puzzle_id (puzzle not found)',
              code: 'INVALID_REFERENCE',
              statusCode: 409,
              requestId,
            },
            {
              status: 409,
              headers: {
                'X-Request-ID': requestId,
                'Cache-Control': 'no-store',
              },
            }
          );

        case 'DATABASE_ERROR':
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
