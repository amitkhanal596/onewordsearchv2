/**
 * GET /api/leaderboard
 *
 * Public endpoint for retrieving the leaderboard.
 *
 * Features:
 * - Publicly accessible (no authentication required)
 * - Returns top users ranked by average stars
 * - Only shows qualified users (>= 30 puzzles completed)
 * - Supports pagination
 * - Eventually consistent (updated by background worker)
 *
 * Query Parameters:
 * - limit: Maximum number of entries (default: 50, max: 100)
 * - offset: Number of entries to skip (default: 0)
 *
 * Response Format:
 * {
 *   "leaderboard": [
 *     {
 *       "rank": 1,
 *       "user_id": "uuid",
 *       "total_puzzles_completed": 100,
 *       "average_stars": 4.75
 *     }
 *   ],
 *   "total": 500,
 *   "limit": 50,
 *   "offset": 0
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLeaderboardRepository } from '@/services/leaderboard/repository';
import type { LeaderboardResponse, LeaderboardEntry } from '@/types/leaderboard';
import { DEFAULT_LIMIT, MAX_LIMIT } from '@/types/leaderboard';

/**
 * GET /api/leaderboard
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Validate and sanitize pagination parameters
    let limit = DEFAULT_LIMIT;
    let offset = 0;

    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json(
          {
            error: 'Invalid limit parameter',
            code: 'INVALID_LIMIT',
          },
          { status: 400 }
        );
      }
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }

    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return NextResponse.json(
          {
            error: 'Invalid offset parameter',
            code: 'INVALID_OFFSET',
          },
          { status: 400 }
        );
      }
      offset = parsedOffset;
    }

    console.info('[LeaderboardAPI] Fetching leaderboard:', { limit, offset });

    // Create repository (uses service role client)
    const repository = createLeaderboardRepository();

    // Fetch leaderboard data
    const { entries, total } = await repository.getLeaderboard(limit, offset);

    // Transform to API response format with rank calculation
    const leaderboard: LeaderboardEntry[] = entries.map((entry, index) => ({
      rank: offset + index + 1, // Calculate rank based on offset + position
      user_id: entry.user_id,
      username: entry.username || 'Unknown',
      total_puzzles_completed: entry.total_puzzles_completed,
      average_stars: parseFloat(entry.average_stars.toFixed(2)), // Round to 2 decimal places
      weighted_average: parseFloat(entry.weighted_average.toFixed(2)), // Round to 2 decimal places
      best_time_seconds: entry.best_time_seconds || null,
    }));

    const response: LeaderboardResponse = {
      leaderboard,
      total,
      limit,
      offset,
    };

    console.info('[LeaderboardAPI] Leaderboard fetched successfully:', {
      count: leaderboard.length,
      total,
      limit,
      offset,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[LeaderboardAPI] Failed to fetch leaderboard:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
