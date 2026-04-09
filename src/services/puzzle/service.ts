/**
 * Puzzle Service
 *
 * Business logic layer for puzzle operations.
 * Handles data transformation, validation, and caching headers.
 *
 * Design Principles:
 * - Stateless: No user or session state
 * - Cacheable: Returns proper cache headers
 * - Fault-isolated: Graceful error handling
 * - Independent: No dependencies on other services
 */

import type { PuzzleDbRow, PuzzleServiceResponse, PuzzleServiceError } from '@/types/game';
import type { PuzzleRepository } from './repository';
import { createPuzzleRepository } from './repository';

export type CacheHeaders = {
  'Cache-Control': string;
} & Record<string, string>;

export interface PuzzleServiceResult {
  success: boolean;
  data?: PuzzleServiceResponse;
  error?: PuzzleServiceError;
  cacheHeaders: CacheHeaders;
}

/**
 * Cache TTL configurations (in seconds)
 */
export const CACHE_CONFIG = {
  RANDOM_PUZZLE_TTL: 300, // 5 minutes - varies per request
  PUZZLE_BY_ID_TTL: 86400, // 24 hours - immutable content
  STALE_WHILE_REVALIDATE: 3600, // 1 hour
} as const;

export class PuzzleService {
  private repository: PuzzleRepository;

  constructor(repository?: PuzzleRepository) {
    this.repository = repository || createPuzzleRepository();
  }

  /**
   * Get a random puzzle
   *
   * Cache Strategy:
   * - Cache-Control: public, max-age=300, stale-while-revalidate=3600
   * - Short TTL since result varies
   * - CDN and browser cacheable
   */
  async getRandomPuzzle(requestId?: string): Promise<PuzzleServiceResult> {
    const logPrefix = `[PuzzleService:getRandomPuzzle${requestId ? `:${requestId}` : ''}]`;

    try {
      console.log(`${logPrefix} Fetching random puzzle`);
      const startTime = Date.now();

      const puzzle = await this.repository.getRandomPuzzle();

      const duration = Date.now() - startTime;
      console.log(`${logPrefix} Fetch completed in ${duration}ms`);

      if (!puzzle) {
        return {
          success: false,
          error: {
            error: 'No puzzles available',
            code: 'NO_PUZZLES',
            statusCode: 503,
            requestId,
          },
          cacheHeaders: {
            'Cache-Control': 'no-cache',
          },
        };
      }

      const response = this.transformPuzzleResponse(puzzle);
      const etag = this.generateETag(response);

      return {
        success: true,
        data: response,
        cacheHeaders: {
          'Cache-Control': `public, max-age=${CACHE_CONFIG.RANDOM_PUZZLE_TTL}, stale-while-revalidate=${CACHE_CONFIG.STALE_WHILE_REVALIDATE}`,
          ETag: etag,
          Vary: 'Accept-Encoding',
        },
      };
    } catch (error) {
      console.error(`${logPrefix} Error:`, error);
      return this.handleError(error, requestId);
    }
  }

  /**
   * Get puzzle by ID
   *
   * Cache Strategy:
   * - Cache-Control: public, max-age=86400, immutable
   * - Long TTL since content never changes
   * - Aggressive CDN caching
   */
  async getPuzzleById(id: string, requestId?: string): Promise<PuzzleServiceResult> {
    const logPrefix = `[PuzzleService:getPuzzleById${requestId ? `:${requestId}` : ''}]`;

    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        return {
          success: false,
          error: {
            error: 'Invalid puzzle ID format',
            code: 'INVALID_ID',
            statusCode: 400,
            requestId,
          },
          cacheHeaders: {
            'Cache-Control': 'no-cache',
          },
        };
      }

      console.log(`${logPrefix} Fetching puzzle ID: ${id}`);
      const startTime = Date.now();

      const puzzle = await this.repository.getPuzzleById(id);

      const duration = Date.now() - startTime;
      console.log(`${logPrefix} Fetch completed in ${duration}ms`);

      if (!puzzle) {
        return {
          success: false,
          error: {
            error: 'Puzzle not found',
            code: 'NOT_FOUND',
            statusCode: 404,
            requestId,
          },
          cacheHeaders: {
            'Cache-Control': 'public, max-age=60', // Cache 404s briefly
          },
        };
      }

      const response = this.transformPuzzleResponse(puzzle);
      const etag = this.generateETag(response);

      return {
        success: true,
        data: response,
        cacheHeaders: {
          'Cache-Control': `public, max-age=${CACHE_CONFIG.PUZZLE_BY_ID_TTL}, immutable`,
          ETag: etag,
          Vary: 'Accept-Encoding',
        },
      };
    } catch (error) {
      console.error(`${logPrefix} Error:`, error);
      return this.handleError(error, requestId);
    }
  }

  /**
   * Get puzzle by number
   *
   * Cache Strategy: Same as getPuzzleById (immutable content)
   */
  async getPuzzleByNumber(number: number, requestId?: string): Promise<PuzzleServiceResult> {
    const logPrefix = `[PuzzleService:getPuzzleByNumber${requestId ? `:${requestId}` : ''}]`;

    try {
      // Validate puzzle number
      if (!Number.isInteger(number) || number < 1) {
        return {
          success: false,
          error: {
            error: 'Invalid puzzle number',
            code: 'INVALID_NUMBER',
            statusCode: 400,
            requestId,
          },
          cacheHeaders: {
            'Cache-Control': 'no-cache',
          },
        };
      }

      console.log(`${logPrefix} Fetching puzzle number: ${number}`);
      const startTime = Date.now();

      const puzzle = await this.repository.getPuzzleByNumber(number);

      const duration = Date.now() - startTime;
      console.log(`${logPrefix} Fetch completed in ${duration}ms`);

      if (!puzzle) {
        return {
          success: false,
          error: {
            error: 'Puzzle not found',
            code: 'NOT_FOUND',
            statusCode: 404,
            requestId,
          },
          cacheHeaders: {
            'Cache-Control': 'public, max-age=60',
          },
        };
      }

      const response = this.transformPuzzleResponse(puzzle);
      const etag = this.generateETag(response);

      return {
        success: true,
        data: response,
        cacheHeaders: {
          'Cache-Control': `public, max-age=${CACHE_CONFIG.PUZZLE_BY_ID_TTL}, immutable`,
          ETag: etag,
          Vary: 'Accept-Encoding',
        },
      };
    } catch (error) {
      console.error(`${logPrefix} Error:`, error);
      return this.handleError(error, requestId);
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ healthy: boolean; timestamp: string }> {
    const healthy = await this.repository.healthCheck();
    return {
      healthy,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Transform database row to API response
   * Removes internal fields and normalizes naming
   */
  private transformPuzzleResponse(puzzle: PuzzleDbRow): PuzzleServiceResponse {
    return {
      id: puzzle.id,
      puzzleNumber: puzzle.puzzle_number,
      puzzleDate: puzzle.puzzle_date,
      board: puzzle.board,
      words: puzzle.words,
      difficulty: puzzle.difficulty || undefined,
      category: puzzle.category || undefined,
      metadata: puzzle.metadata || undefined,
      createdAt: puzzle.created_at,
    };
  }

  /**
   * Generate ETag for cache validation
   * Uses puzzle ID and created_at timestamp
   */
  private generateETag(puzzle: PuzzleServiceResponse): string {
    const hash = `${puzzle.id}-${new Date(puzzle.createdAt).getTime()}`;
    return `"${Buffer.from(hash).toString('base64')}"`;
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Handle errors with proper status codes
   */
  private handleError(error: unknown, requestId?: string): PuzzleServiceResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Map error types to status codes
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';

    if (errorMessage.includes('DATABASE_ERROR')) {
      statusCode = 503;
      code = 'SERVICE_UNAVAILABLE';
    }

    return {
      success: false,
      error: {
        error: 'Internal server error',
        code,
        statusCode,
        requestId,
      },
      cacheHeaders: {
        'Cache-Control': 'no-cache',
      },
    };
  }
}

/**
 * Factory function to create service instance
 */
export function createPuzzleService(repository?: PuzzleRepository): PuzzleService {
  return new PuzzleService(repository);
}
