/**
 * Progress Service
 *
 * Business logic layer for puzzle completion tracking.
 * Orchestrates repository, star calculation, and event emission.
 *
 * Design Principles:
 * - Separation of Concerns: Business logic separated from data access
 * - Idempotency: Leverages repository's session_id constraint
 * - Event-Driven: Emits events for async leaderboard updates
 * - Validation: Enforces business rules (star calculation, input validation)
 * - Fault Isolation: Errors don't cascade between services
 *
 * Star Calculation Rules:
 * - 5 stars: < 60 seconds (< 1 minute)
 * - 4 stars: 60-119 seconds (1-2 minutes)
 * - 3 stars: 120-179 seconds (2-3 minutes)
 * - 2 stars: 180-239 seconds (3-4 minutes)
 * - 1 star: >= 240 seconds (4+ minutes)
 */

import type {
  ProgressService,
  RecordCompletionResponse,
  CompletionHistoryResponse,
  HealthCheckResponse,
  CompletionRecord,
  PuzzleCompletedEvent,
  StarCalculation,
  ProgressRepository,
} from '@/types/progress';
import { createProgressRepository } from './repository';
import { getEventEmitter } from './events';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Calculate star rating based on completion time
 *
 * @param completionTimeSeconds - Time taken to complete puzzle
 * @returns Star rating (1-5) and threshold description
 */
export function calculateStars(completionTimeSeconds: number): StarCalculation {
  if (completionTimeSeconds < 0) {
    throw new Error('INVALID_COMPLETION_TIME');
  }

  if (completionTimeSeconds < 60) {
    return { stars: 5, threshold: '< 1 minute' };
  }
  if (completionTimeSeconds < 120) {
    return { stars: 4, threshold: '1-2 minutes' };
  }
  if (completionTimeSeconds < 180) {
    return { stars: 3, threshold: '2-3 minutes' };
  }
  if (completionTimeSeconds < 240) {
    return { stars: 2, threshold: '3-4 minutes' };
  }
  return { stars: 1, threshold: '4+ minutes' };
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate session ID format (should be UUID v4 or similar)
 */
function isValidSessionId(sessionId: string): boolean {
  // Session IDs can be UUIDs or other unique identifiers
  // For now, just check it's a non-empty string with reasonable length
  return sessionId.length >= 10 && sessionId.length <= 255;
}

/**
 * Implementation of ProgressService
 */
export class ProgressServiceImpl implements ProgressService {
  private repository: ProgressRepository;
  private eventEmitter = getEventEmitter();

  constructor(supabaseClient?: SupabaseClient) {
    this.repository = createProgressRepository(supabaseClient);
  }

  /**
   * Record puzzle completion
   *
   * Steps:
   * 1. Validate input (puzzle_id, session_id, completion_time)
   * 2. Calculate stars based on completion time
   * 3. Store in database (idempotent via session_id)
   * 4. Emit event to Redis for leaderboard processing
   * 5. Return success response
   *
   * @param userId - Authenticated user's UUID
   * @param puzzleId - Puzzle UUID
   * @param sessionId - Unique session identifier
   * @param completionTimeSeconds - Time taken in seconds
   * @param puzzleDate - Optional puzzle date (YYYY-MM-DD) for auto-insert
   * @returns RecordCompletionResponse with stars and metadata
   * @throws INVALID_PUZZLE_ID, INVALID_SESSION_ID, INVALID_COMPLETION_TIME, DATABASE_ERROR
   */
  async recordCompletion(
    userId: string,
    puzzleId: string,
    sessionId: string,
    completionTimeSeconds: number,
    puzzleDate?: string
  ): Promise<RecordCompletionResponse> {
    // Validate inputs
    if (!isValidUUID(puzzleId)) {
      throw new Error('INVALID_PUZZLE_ID');
    }

    if (!isValidSessionId(sessionId)) {
      throw new Error('INVALID_SESSION_ID');
    }

    if (completionTimeSeconds <= 0 || !Number.isInteger(completionTimeSeconds)) {
      throw new Error('INVALID_COMPLETION_TIME');
    }

    // Calculate stars
    const { stars } = calculateStars(completionTimeSeconds);

    console.info('[ProgressService] Recording completion:', {
      userId,
      puzzleId,
      sessionId,
      completionTimeSeconds,
      stars,
    });

    // Record in database (idempotent)
    const result = await this.repository.recordCompletion(
      userId,
      puzzleId,
      sessionId,
      completionTimeSeconds,
      stars,
      puzzleDate
    );

    if (!result) {
      // This should not happen with current implementation,
      // but handle defensively
      throw new Error('DATABASE_ERROR');
    }

    // Emit event for leaderboard (fire-and-forget, don't await)
    // Use puzzle_id from result (actual DB ID, which may differ from frontend-generated ID)
    const event: PuzzleCompletedEvent = {
      event_type: 'puzzle_completed',
      user_id: userId,
      puzzle_id: result.puzzle_id,
      completion_time_seconds: completionTimeSeconds,
      stars,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    };

    // Fire-and-forget: don't block on event emission
    this.eventEmitter.emitPuzzleCompleted(event).catch((error) => {
      console.error('[ProgressService] Failed to emit event (non-blocking):', error);
    });

    // Return success response
    // Use stars from database record (handles idempotent case correctly)
    return {
      success: true,
      stars: result.stars,
      puzzle_id: result.puzzle_id,
      completion_time_seconds: result.completion_time_seconds,
      session_id: result.session_id,
      completed_at: result.completed_at,
    };
  }

  /**
   * Get user's completion history
   *
   * Returns paginated list of completions ordered by most recent first.
   *
   * @param userId - Authenticated user's UUID
   * @param limit - Maximum number of records (default: 20, max: 100)
   * @param offset - Number of records to skip (default: 0)
   * @returns CompletionHistoryResponse with completions and pagination metadata
   */
  async getUserHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<CompletionHistoryResponse> {
    // Validate and sanitize pagination params
    const sanitizedLimit = Math.min(Math.max(1, limit), 100); // Clamp between 1 and 100
    const sanitizedOffset = Math.max(0, offset); // No negative offsets

    console.info('[ProgressService] Fetching user history:', {
      userId,
      limit: sanitizedLimit,
      offset: sanitizedOffset,
    });

    const { results, total } = await this.repository.getUserHistory(
      userId,
      sanitizedLimit,
      sanitizedOffset
    );

    // Transform database rows to API response format
    const completions: CompletionRecord[] = results.map((row) => ({
      id: row.id,
      puzzle_id: row.puzzle_id,
      completion_time_seconds: row.completion_time_seconds,
      stars: row.stars,
      session_id: row.session_id,
      completed_at: row.completed_at,
    }));

    return {
      completions,
      total,
      limit: sanitizedLimit,
      offset: sanitizedOffset,
    };
  }

  /**
   * Health check for service monitoring
   *
   * Checks database and event emitter connectivity.
   *
   * @returns HealthCheckResponse with status and component checks
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const timestamp = new Date().toISOString();

    try {
      // Check database
      const dbHealthy = await this.repository.healthCheck();

      // Check event emitter (Redis)
      const redisHealthy = await this.eventEmitter.healthCheck();

      const allHealthy = dbHealthy && redisHealthy;

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp,
        checks: {
          database: dbHealthy,
          redis: redisHealthy,
        },
      };
    } catch (error) {
      console.error('[ProgressService] Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp,
        checks: {
          database: false,
          redis: false,
        },
      };
    }
  }
}

/**
 * Factory function to create service instance
 * Enables dependency injection and testing
 *
 * @param supabaseClient - Optional authenticated Supabase client with user context
 * @returns ProgressService instance
 */
export function createProgressService(supabaseClient?: SupabaseClient): ProgressService {
  return new ProgressServiceImpl(supabaseClient);
}
