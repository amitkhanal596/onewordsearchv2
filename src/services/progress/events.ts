/**
 * Event Emitter for Progress Service
 *
 * Emits events to Redis queue for asynchronous leaderboard processing.
 * This ensures the Progress Service remains stateless and decoupled from
 * the Leaderboard Service.
 *
 * Design Principles:
 * - Fire-and-forget: Never block on event emission
 * - Graceful degradation: Log errors but don't fail the request
 * - Structured events: JSON-serialized with consistent schema
 * - Event sourcing ready: All events have timestamps and correlation IDs
 *
 * Current Implementation: STUB
 * - Logs events to console (for development/testing)
 * - Ready for Redis integration (RPUSH to queue)
 *
 * Future Integration:
 * - Connect to Redis using ioredis or redis client
 * - Use RPUSH to 'leaderboard_events' queue
 * - Add retry logic with exponential backoff
 * - Add dead letter queue for failed events
 */

import type { PuzzleCompletedEvent } from '@/types/progress';

/**
 * Event emitter interface
 */
export interface EventEmitter {
  emitPuzzleCompleted(event: PuzzleCompletedEvent): Promise<void>;
  healthCheck(): Promise<boolean>;
}

/**
 * Stub implementation for development
 * Logs events instead of sending to Redis
 */
class StubEventEmitter implements EventEmitter {
  /**
   * Emit puzzle completion event
   * Currently logs to console, will be replaced with Redis RPUSH
   */
  async emitPuzzleCompleted(event: PuzzleCompletedEvent): Promise<void> {
    try {
      // In production, this would be:
      // await redisClient.rpush('leaderboard_events', JSON.stringify(event));

      console.info('[EventEmitter] Puzzle completed event:', {
        event_type: event.event_type,
        user_id: event.user_id,
        puzzle_id: event.puzzle_id,
        stars: event.stars,
        completion_time_seconds: event.completion_time_seconds,
        session_id: event.session_id,
        timestamp: event.timestamp,
      });

      // Simulate successful emission
      return Promise.resolve();
    } catch (error) {
      // Never throw - graceful degradation
      console.error('[EventEmitter] Failed to emit event:', error);
      console.error('[EventEmitter] Event data:', event);

      // In production, log to error tracking service (Sentry, etc.)
      // TODO: Add retry logic with exponential backoff
      // TODO: Add dead letter queue for persistent failures
    }
  }

  /**
   * Health check for Redis connectivity
   * Currently always returns true (stub mode)
   */
  async healthCheck(): Promise<boolean> {
    try {
      // In production, this would be:
      // await redisClient.ping();

      console.info('[EventEmitter] Health check (stub mode): OK');
      return true;
    } catch (error) {
      console.error('[EventEmitter] Health check failed:', error);
      return false;
    }
  }
}

/**
 * Redis implementation for production using Upstash REST API
 */
import { Redis } from '@upstash/redis';

class RedisEventEmitter implements EventEmitter {
  private client: Redis;
  private queueName = 'leaderboard_events';

  constructor() {
    // Use Upstash REST API (serverless-friendly)
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('[EventEmitter] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
    }

    this.client = new Redis({
      url,
      token,
    });

    console.info('[EventEmitter] Upstash Redis client initialized');
  }

  async emitPuzzleCompleted(event: PuzzleCompletedEvent): Promise<void> {
    try {
      const serialized = JSON.stringify(event);
      await this.client.rpush(this.queueName, serialized);

      console.info('[EventEmitter] Event emitted to Redis:', {
        queue: this.queueName,
        event_type: event.event_type,
        session_id: event.session_id,
      });
    } catch (error) {
      console.error('[EventEmitter] Failed to emit event to Redis:', error);
      console.error('[EventEmitter] Event data:', event);
      // Don't throw - graceful degradation
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch (error) {
      console.error('[EventEmitter] Redis health check failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    // Upstash REST client doesn't need explicit disconnection
    console.info('[EventEmitter] Upstash client cleanup (no-op for REST)');
  }
}

/**
 * Factory function to create event emitter
 * Switch between stub and Redis based on environment
 */
export function createEventEmitter(): EventEmitter {
  const useRedis = process.env.UPSTASH_REDIS_REST_URL !== undefined && process.env.UPSTASH_REDIS_REST_TOKEN !== undefined;

  if (useRedis) {
    console.info('[EventEmitter] Upstash Redis mode enabled');
    return new RedisEventEmitter();
  }

  console.info('[EventEmitter] Using stub mode (development)');
  return new StubEventEmitter();
}

/**
 * Singleton instance for reuse across requests
 */
let emitterInstance: EventEmitter | null = null;

export function getEventEmitter(): EventEmitter {
  if (!emitterInstance) {
    emitterInstance = createEventEmitter();
  }
  return emitterInstance;
}
