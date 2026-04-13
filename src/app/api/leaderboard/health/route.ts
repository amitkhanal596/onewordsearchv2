/**
 * GET /api/leaderboard/health
 *
 * Health check endpoint for leaderboard service.
 *
 * Checks:
 * - Database connectivity
 * - Redis connectivity (if worker is integrated)
 *
 * Returns:
 * {
 *   "status": "healthy" | "unhealthy",
 *   "timestamp": "ISO 8601 timestamp",
 *   "checks": {
 *     "database": true | false,
 *     "redis": true | false
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { createLeaderboardRepository } from '@/services/leaderboard/repository';
import type { LeaderboardHealthCheckResponse } from '@/types/leaderboard';
import { Redis } from '@upstash/redis';

/**
 * GET /api/leaderboard/health
 */
export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  try {
    // Check database
    const repository = createLeaderboardRepository();
    const dbHealthy = await repository.healthCheck();

    // Check Redis (if configured with Upstash)
    let redisHealthy = false;
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      try {
        const redis = new Redis({
          url: upstashUrl,
          token: upstashToken,
        });

        const pong = await redis.ping();
        redisHealthy = pong === 'PONG';
      } catch (error) {
        console.error('[LeaderboardHealth] Redis health check failed:', error);
        redisHealthy = false;
      }
    } else {
      // Redis not configured (development mode)
      redisHealthy = true;
    }

    const allHealthy = dbHealthy && redisHealthy;

    const response: LeaderboardHealthCheckResponse = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      checks: {
        database: dbHealthy,
        redis: redisHealthy,
      },
    };

    console.info('[LeaderboardHealth] Health check:', response);

    return NextResponse.json(response, {
      status: allHealthy ? 200 : 503,
    });
  } catch (error) {
    console.error('[LeaderboardHealth] Health check failed:', error);

    const response: LeaderboardHealthCheckResponse = {
      status: 'unhealthy',
      timestamp,
      checks: {
        database: false,
        redis: false,
      },
    };

    return NextResponse.json(response, { status: 503 });
  }
}
