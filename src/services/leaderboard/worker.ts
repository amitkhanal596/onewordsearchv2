/**
 * Leaderboard Worker
 *
 * Background process that consumes puzzle completion events from Redis
 * and updates the leaderboard asynchronously.
 *
 * Design Principles:
 * - Idempotency: Each event processed exactly once (via session_id)
 * - At-least-once Delivery: Events may be redelivered, but duplicates are handled
 * - Fault Tolerance: Graceful shutdown, error handling, restart safety
 * - Observability: Comprehensive logging and metrics
 * - Eventually Consistent: Leaderboard may lag behind real-time events
 *
 * Event Flow:
 * 1. Progress Service emits PuzzleCompletedEvent to Redis queue
 * 2. Worker consumes events from queue
 * 3. Repository checks if event already processed (idempotency)
 * 4. If new event: update processed_events + leaderboard (atomic)
 * 5. If duplicate: skip (log and continue)
 * 6. Acknowledge event and continue
 */

import Redis from 'ioredis';
import type {
  PuzzleCompletedEventPayload,
  WorkerConfig,
  WorkerStatus,
  LeaderboardRepository,
} from '@/types/leaderboard';
import { LEADERBOARD_QUEUE_NAME } from '@/types/leaderboard';
import { createLeaderboardRepository } from './repository';

/**
 * Default worker configuration
 */
const DEFAULT_CONFIG: WorkerConfig = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  queueName: LEADERBOARD_QUEUE_NAME,
  batchSize: 10, // Process up to 10 events per batch
  pollIntervalMs: 1000, // Poll every 1 second
  shutdownTimeoutMs: 10000, // 10 seconds to finish processing before force shutdown
};

/**
 * Leaderboard Worker Class
 */
export class LeaderboardWorker {
  private redis: Redis;
  private repository: LeaderboardRepository;
  private config: WorkerConfig;
  private status: WorkerStatus;
  private shutdownRequested = false;
  private isProcessing = false;

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.redis = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[LeaderboardWorker] Max Redis retries reached');
          return null;
        }
        const delay = Math.min(times * 1000, 5000);
        return delay;
      },
    });

    this.repository = createLeaderboardRepository();

    this.status = {
      running: false,
      eventsProcessed: 0,
      eventsSkipped: 0,
      lastProcessedAt: null,
      startedAt: new Date().toISOString(),
      errors: [],
    };

    this.setupRedisListeners();
  }

  /**
   * Setup Redis event listeners
   */
  private setupRedisListeners(): void {
    this.redis.on('error', (error) => {
      console.error('[LeaderboardWorker] Redis error:', error);
      this.recordError('Redis connection error', error);
    });

    this.redis.on('connect', () => {
      console.info('[LeaderboardWorker] Connected to Redis');
    });

    this.redis.on('ready', () => {
      console.info('[LeaderboardWorker] Redis client ready');
    });
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    console.info('[LeaderboardWorker] Starting worker...', {
      queue: this.config.queueName,
      batchSize: this.config.batchSize,
      pollInterval: this.config.pollIntervalMs,
    });

    this.status.running = true;
    this.status.startedAt = new Date().toISOString();

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();

    // Start processing loop
    await this.processingLoop();
  }

  /**
   * Main processing loop
   */
  private async processingLoop(): Promise<void> {
    while (!this.shutdownRequested) {
      try {
        this.isProcessing = true;
        await this.processBatch();
        this.isProcessing = false;

        // Wait before next poll
        await this.sleep(this.config.pollIntervalMs);
      } catch (error) {
        console.error('[LeaderboardWorker] Error in processing loop:', error);
        this.recordError('Processing loop error', error);

        // Back off on error
        await this.sleep(this.config.pollIntervalMs * 2);
      }
    }

    console.info('[LeaderboardWorker] Processing loop stopped');
  }

  /**
   * Process a batch of events from Redis queue
   */
  private async processBatch(): Promise<void> {
    try {
      // Use LPOP to consume events (FIFO order)
      // Note: For production, consider using BLPOP (blocking) or Redis Streams
      const events: string[] = [];

      for (let i = 0; i < this.config.batchSize; i++) {
        const event = await this.redis.lpop(this.config.queueName);
        if (!event) break; // Queue is empty
        events.push(event);
      }

      if (events.length === 0) {
        // Queue is empty, nothing to process
        return;
      }

      console.info('[LeaderboardWorker] Processing batch:', {
        count: events.length,
        queue: this.config.queueName,
      });

      // Process each event
      for (const eventJson of events) {
        try {
          const event: PuzzleCompletedEventPayload = JSON.parse(eventJson);
          await this.processEvent(event);
        } catch (error) {
          console.error('[LeaderboardWorker] Failed to process event:', error);
          console.error('[LeaderboardWorker] Event data:', eventJson);
          this.recordError('Failed to process event', error, eventJson);
        }
      }
    } catch (error) {
      console.error('[LeaderboardWorker] Failed to process batch:', error);
      this.recordError('Batch processing error', error);
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: PuzzleCompletedEventPayload): Promise<void> {
    try {
      console.info('[LeaderboardWorker] Processing event:', {
        session_id: event.session_id,
        user_id: event.user_id,
        stars: event.stars,
      });

      // Repository handles idempotency check and update
      const processed = await this.repository.processEvent(event);

      if (processed) {
        this.status.eventsProcessed++;
        this.status.lastProcessedAt = new Date().toISOString();
        console.info('[LeaderboardWorker] Event processed successfully:', {
          session_id: event.session_id,
          total_processed: this.status.eventsProcessed,
        });
      } else {
        this.status.eventsSkipped++;
        console.info('[LeaderboardWorker] Event skipped (duplicate):', {
          session_id: event.session_id,
          total_skipped: this.status.eventsSkipped,
        });
      }
    } catch (error) {
      console.error('[LeaderboardWorker] Failed to process event:', error);
      this.recordError('Event processing error', error, event);
      throw error; // Re-throw to trigger batch error handling
    }
  }

  /**
   * Record error in worker status
   */
  private recordError(message: string, error: unknown, event?: unknown): void {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      event: event as PuzzleCompletedEventPayload | undefined,
    };

    this.status.errors.push(errorEntry);

    // Keep only last 100 errors to prevent memory leak
    if (this.status.errors.length > 100) {
      this.status.errors = this.status.errors.slice(-100);
    }
  }

  /**
   * Get worker status
   */
  getStatus(): WorkerStatus {
    return { ...this.status };
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.info(`[LeaderboardWorker] Received ${signal}, shutting down gracefully...`);
      await this.shutdown();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.shutdownRequested) {
      console.warn('[LeaderboardWorker] Shutdown already in progress');
      return;
    }

    this.shutdownRequested = true;
    this.status.running = false;

    console.info('[LeaderboardWorker] Waiting for current processing to complete...');

    // Wait for current batch to finish (with timeout)
    const startTime = Date.now();
    while (this.isProcessing) {
      if (Date.now() - startTime > this.config.shutdownTimeoutMs) {
        console.warn('[LeaderboardWorker] Shutdown timeout reached, forcing exit');
        break;
      }
      await this.sleep(100);
    }

    // Disconnect from Redis
    await this.redis.quit();

    console.info('[LeaderboardWorker] Shutdown complete', {
      eventsProcessed: this.status.eventsProcessed,
      eventsSkipped: this.status.eventsSkipped,
      errors: this.status.errors.length,
    });

    process.exit(0);
  }

  /**
   * Helper: sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create and start worker
 */
export async function startLeaderboardWorker(
  config?: Partial<WorkerConfig>
): Promise<LeaderboardWorker> {
  const worker = new LeaderboardWorker(config);
  await worker.start();
  return worker;
}
