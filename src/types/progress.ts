/**
 * Progress Service Types
 *
 * Type definitions for puzzle completion tracking and user progress.
 * These types enforce the contract between service layers and API endpoints.
 */

// Database row structure (snake_case matching PostgreSQL)
export interface GameResultDbRow {
  id: string;
  user_id: string;
  puzzle_id: string;
  session_id: string;
  completion_time_seconds: number;
  stars: number;
  completed_at: string;
  created_at: string;
}

// API Request/Response types (camelCase for TypeScript conventions)

/**
 * Request payload for recording puzzle completion
 */
export interface RecordCompletionRequest {
  puzzle_id: string;
  completion_time_seconds: number;
  session_id: string;
  puzzle_date?: string; // Optional YYYY-MM-DD format for auto-insert
}

/**
 * Response for successful completion recording
 */
export interface RecordCompletionResponse {
  success: true;
  stars: number;
  puzzle_id: string;
  completion_time_seconds: number;
  session_id: string;
  completed_at: string;
}

/**
 * Single completion record in user history
 */
export interface CompletionRecord {
  id: string;
  puzzle_id: string;
  completion_time_seconds: number;
  stars: number;
  session_id: string;
  completed_at: string;
}

/**
 * Paginated history response
 */
export interface CompletionHistoryResponse {
  completions: CompletionRecord[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    redis?: boolean;
  };
}

/**
 * Progress service error response
 */
export interface ProgressServiceError {
  error: string;
  code: string;
  statusCode: number;
  requestId?: string;
}

/**
 * Event emitted to Redis for leaderboard processing
 */
export interface PuzzleCompletedEvent {
  event_type: 'puzzle_completed';
  user_id: string;
  puzzle_id: string;
  completion_time_seconds: number;
  stars: number;
  session_id: string;
  timestamp: string;
}

/**
 * Repository interface for data access
 */
export interface ProgressRepository {
  recordCompletion(
    userId: string,
    puzzleId: string,
    sessionId: string,
    completionTimeSeconds: number,
    stars: number,
    puzzleDate?: string
  ): Promise<GameResultDbRow | null>;

  getUserHistory(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ results: GameResultDbRow[]; total: number }>;

  healthCheck(): Promise<boolean>;
}

/**
 * Service interface for business logic
 */
export interface ProgressService {
  recordCompletion(
    userId: string,
    puzzleId: string,
    sessionId: string,
    completionTimeSeconds: number,
    puzzleDate?: string
  ): Promise<RecordCompletionResponse>;

  getUserHistory(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<CompletionHistoryResponse>;

  healthCheck(): Promise<HealthCheckResponse>;
}

/**
 * Star calculation result
 */
export interface StarCalculation {
  stars: number;
  threshold: string;
}
