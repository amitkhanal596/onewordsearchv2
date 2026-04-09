#!/usr/bin/env tsx
/**
 * Leaderboard Worker Startup Script
 *
 * Starts the background worker that consumes puzzle completion events
 * from Redis and updates the leaderboard asynchronously.
 *
 * Usage:
 *   npm run worker:start              (production)
 *   npm run worker:dev                (development with auto-reload)
 *
 * Environment Variables Required:
 *   - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (bypasses RLS)
 *   - REDIS_URL: Redis connection URL (or REDIS_HOST/REDIS_PORT)
 *
 * Graceful Shutdown:
 *   - Send SIGTERM or SIGINT (Ctrl+C) to stop the worker
 *   - Worker will finish processing current batch before exiting
 *   - Maximum shutdown timeout: 10 seconds
 *
 * Monitoring:
 *   - Worker logs all events to stdout (JSON format recommended for production)
 *   - Check GET /api/leaderboard/health for system status
 *   - Metrics exposed via worker.getStatus()
 */

import { config } from 'dotenv';
import { startLeaderboardWorker } from '../src/services/leaderboard/worker';

// Load environment variables from .env.local
config({ path: '.env.local' });

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('[WorkerStartup] Missing required environment variables:', missing);
    console.error('[WorkerStartup] Please set them in .env.local or environment');
    process.exit(1);
  }

  // Check Redis configuration
  const hasRedis = process.env.REDIS_URL || process.env.REDIS_HOST;

  if (!hasRedis) {
    console.warn('[WorkerStartup] WARNING: Redis not configured (REDIS_URL or REDIS_HOST)');
    console.warn('[WorkerStartup] Worker will not be able to consume events');
    console.warn('[WorkerStartup] For development, you can run Redis locally:');
    console.warn('[WorkerStartup]   docker run -p 6379:6379 redis:7-alpine');
    process.exit(1);
  }

  console.info('[WorkerStartup] Environment validation passed');
}

/**
 * Main entry point
 */
async function main() {
  console.info('[WorkerStartup] ========================================');
  console.info('[WorkerStartup] Leaderboard Worker Starting...');
  console.info('[WorkerStartup] ========================================');
  console.info('[WorkerStartup] Timestamp:', new Date().toISOString());
  console.info('[WorkerStartup] Node version:', process.version);
  console.info('[WorkerStartup] Process ID:', process.pid);
  console.info('[WorkerStartup] ========================================');

  // Validate environment
  validateEnvironment();

  // Worker configuration (can be customized via environment variables)
  const config = {
    redisUrl: process.env.REDIS_URL || undefined,
    batchSize: parseInt(process.env.WORKER_BATCH_SIZE || '10'),
    pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS || '1000'),
    shutdownTimeoutMs: parseInt(process.env.WORKER_SHUTDOWN_TIMEOUT_MS || '10000'),
  };

  console.info('[WorkerStartup] Configuration:', {
    redisUrl: config.redisUrl ? '***configured***' : 'using individual params',
    batchSize: config.batchSize,
    pollIntervalMs: config.pollIntervalMs,
    shutdownTimeoutMs: config.shutdownTimeoutMs,
  });

  try {
    // Start worker (this will block until shutdown)
    const worker = await startLeaderboardWorker(config);

    console.info('[WorkerStartup] ========================================');
    console.info('[WorkerStartup] Worker started successfully!');
    console.info('[WorkerStartup] ========================================');
    console.info('[WorkerStartup] Listening for events on Redis queue: leaderboard_events');
    console.info('[WorkerStartup] Press Ctrl+C to stop gracefully');
    console.info('[WorkerStartup] ========================================');

    // Log status every 60 seconds (optional monitoring)
    if (process.env.WORKER_STATUS_LOG_INTERVAL_MS) {
      const interval = parseInt(process.env.WORKER_STATUS_LOG_INTERVAL_MS);
      setInterval(() => {
        const status = worker.getStatus();
        console.info('[WorkerStartup] Status update:', {
          running: status.running,
          eventsProcessed: status.eventsProcessed,
          eventsSkipped: status.eventsSkipped,
          lastProcessedAt: status.lastProcessedAt,
          recentErrors: status.errors.slice(-5).length,
        });
      }, interval);
    }
  } catch (error) {
    console.error('[WorkerStartup] ========================================');
    console.error('[WorkerStartup] FATAL ERROR: Failed to start worker');
    console.error('[WorkerStartup] ========================================');
    console.error('[WorkerStartup] Error:', error);

    if (error instanceof Error) {
      console.error('[WorkerStartup] Message:', error.message);
      console.error('[WorkerStartup] Stack:', error.stack);
    }

    process.exit(1);
  }
}

// Start the worker
main().catch((error) => {
  console.error('[WorkerStartup] Unhandled error in main:', error);
  process.exit(1);
});
