/**
 * Leaderboard Service Types
 *
 * Type definitions for leaderboard worker and API endpoints.
 * Enforces skill-based ranking with qualification thresholds.
 */

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Leaderboard database row (snake_case matching PostgreSQL)
 */
export interface LeaderboardDbRow {
  user_id: string;
  total_puzzles_completed: number;
  total_stars: number;
  average_stars: number;
  weighted_average: number;
  last_updated: string;
  username?: string;
  best_time_seconds?: number | null;
}

/**
 * Processed event database row (snake_case matching PostgreSQL)
 */
export interface ProcessedEventDbRow {
  session_id: string;
  user_id: string;
  puzzle_id: string;
  stars: number;
  completion_time_seconds: number;
  processed_at: string;
  event_timestamp: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Single leaderboard entry in API response
 */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  total_puzzles_completed: number;
  average_stars: number;
  weighted_average: number;
  best_time_seconds: number | null;
}

/**
 * Leaderboard API response with pagination
 */
export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Leaderboard health check response
 */
export interface LeaderboardHealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    redis: boolean;
  };
  worker_status?: {
    running: boolean;
    last_processed?: string;
  };
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

/**
 * Repository for leaderboard data access
 */
export interface LeaderboardRepository {
  /**
   * Check if event has already been processed
   * @returns true if session_id exists in processed_events
   */
  isEventProcessed(sessionId: string): Promise<boolean>;

  /**
   * Record that event has been processed and update leaderboard
   * Must be atomic (transaction) to ensure consistency
   *
   * @param event - Puzzle completion event to process
   * @returns true if successfully processed, false if already processed
   */
  processEvent(event: PuzzleCompletedEventPayload): Promise<boolean>;

  /**
   * Get top users for leaderboard API
   * Only returns users with >= 30 puzzles (qualification threshold)
   *
   * @param limit - Maximum number of entries
   * @param offset - Number of entries to skip
   * @returns Leaderboard entries and total count
   */
  getLeaderboard(
    limit: number,
    offset: number
  ): Promise<{ entries: LeaderboardDbRow[]; total: number }>;

  /**
   * Get leaderboard statistics for a specific user
   */
  getUserStats(userId: string): Promise<LeaderboardDbRow | null>;

  /**
   * Health check for database connectivity
   */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// WORKER TYPES
// ============================================================================

/**
 * Puzzle completion event payload (from Redis queue)
 * Matches PuzzleCompletedEvent from progress service
 */
export interface PuzzleCompletedEventPayload {
  event_type: 'puzzle_completed';
  user_id: string;
  puzzle_id: string;
  completion_time_seconds: number;
  stars: number;
  session_id: string;
  timestamp: string;
}

/**
 * Worker configuration
 */
export interface WorkerConfig {
  redisUrl: string;
  queueName: string;
  batchSize: number;
  pollIntervalMs: number;
  shutdownTimeoutMs: number;
}

/**
 * Worker status information
 */
export interface WorkerStatus {
  running: boolean;
  eventsProcessed: number;
  eventsSkipped: number;
  lastProcessedAt: string | null;
  startedAt: string;
  errors: Array<{
    timestamp: string;
    error: string;
    event?: PuzzleCompletedEventPayload;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Minimum number of puzzles required to appear on leaderboard
 */
export const QUALIFICATION_THRESHOLD = 30;

/**
 * Default pagination limits
 */
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

/**
 * Redis queue name for leaderboard events
 */
export const LEADERBOARD_QUEUE_NAME = 'leaderboard_events';
