/**
 * Puzzle Service Tests
 *
 * Tests for the stateless puzzle service business logic layer.
 * Verifies:
 * - Random puzzle generation
 * - Puzzle retrieval by ID
 * - Cache header generation
 * - Error handling
 * - Statelessness
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PuzzleService, CACHE_CONFIG } from '@/services/puzzle/service';
import type { PuzzleRepository } from '@/services/puzzle/repository';
import type { PuzzleDbRow } from '@/types/game';

// Mock repository implementation
class MockPuzzleRepository implements PuzzleRepository {
  private mockData: PuzzleDbRow[] = [];
  private shouldFail = false;

  setMockData(data: PuzzleDbRow[]): void {
    this.mockData = data;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  async getRandomPuzzle(): Promise<PuzzleDbRow | null> {
    if (this.shouldFail) {
      throw new Error('DATABASE_ERROR');
    }
    if (this.mockData.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * this.mockData.length);
    return this.mockData[randomIndex];
  }

  async getPuzzleById(id: string): Promise<PuzzleDbRow | null> {
    if (this.shouldFail) {
      throw new Error('DATABASE_ERROR');
    }
    return this.mockData.find((p) => p.id === id) || null;
  }

  async getPuzzleByNumber(number: number): Promise<PuzzleDbRow | null> {
    if (this.shouldFail) {
      throw new Error('DATABASE_ERROR');
    }
    return this.mockData.find((p) => p.puzzle_number === number) || null;
  }

  async getPuzzleByDate(date: string): Promise<PuzzleDbRow | null> {
    if (this.shouldFail) {
      throw new Error('DATABASE_ERROR');
    }
    return this.mockData.find((p) => p.puzzle_date === date) || null;
  }

  async healthCheck(): Promise<boolean> {
    if (this.shouldFail) {
      return false;
    }
    return true;
  }
}

// Sample test data
const samplePuzzle1: PuzzleDbRow = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  puzzle_number: 1,
  puzzle_date: '2024-02-21',
  board: [
    ['C', 'A', 'T'],
    ['D', 'O', 'G'],
    ['B', 'I', 'R'],
  ],
  words: ['CAT', 'DOG', 'BIRD'],
  difficulty: 'easy',
  category: 'animals',
  metadata: { theme: 'pets' },
  created_at: '2024-02-21T00:00:00Z',
  updated_at: '2024-02-21T00:00:00Z',
};

const samplePuzzle2: PuzzleDbRow = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  puzzle_number: 2,
  puzzle_date: '2024-02-22',
  board: [
    ['S', 'U', 'N'],
    ['M', 'O', 'O'],
    ['N', 'S', 'T'],
  ],
  words: ['SUN', 'MOON', 'STAR'],
  difficulty: 'medium',
  category: 'astronomy',
  metadata: { theme: 'space' },
  created_at: '2024-02-22T00:00:00Z',
  updated_at: '2024-02-22T00:00:00Z',
};

describe('PuzzleService', () => {
  let service: PuzzleService;
  let mockRepository: MockPuzzleRepository;

  beforeEach(() => {
    mockRepository = new MockPuzzleRepository();
    service = new PuzzleService(mockRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getRandomPuzzle', () => {
    it('should return a random puzzle with correct structure', async () => {
      mockRepository.setMockData([samplePuzzle1, samplePuzzle2]);

      const result = await service.getRandomPuzzle('test-request-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('puzzleNumber');
      expect(result.data).toHaveProperty('puzzleDate');
      expect(result.data).toHaveProperty('board');
      expect(result.data).toHaveProperty('words');
      expect(result.data).toHaveProperty('createdAt');
    });

    it('should return proper cache headers for random puzzles', async () => {
      mockRepository.setMockData([samplePuzzle1]);

      const result = await service.getRandomPuzzle('test-request-2');

      expect(result.cacheHeaders).toBeDefined();
      expect(result.cacheHeaders['Cache-Control']).toContain('public');
      expect(result.cacheHeaders['Cache-Control']).toContain(
        `max-age=${CACHE_CONFIG.RANDOM_PUZZLE_TTL}`
      );
      expect(result.cacheHeaders['Cache-Control']).toContain('stale-while-revalidate');
      expect(result.cacheHeaders.ETag).toBeDefined();
      expect(result.cacheHeaders.Vary).toBe('Accept-Encoding');
    });

    it('should return valid ETag for cache validation', async () => {
      mockRepository.setMockData([samplePuzzle1]);

      const result = await service.getRandomPuzzle('test-request-3');

      expect(result.cacheHeaders.ETag).toBeDefined();
      expect(result.cacheHeaders.ETag).toMatch(/^"[A-Za-z0-9+/=]+"$/);
    });

    it('should handle no puzzles available', async () => {
      mockRepository.setMockData([]);

      const result = await service.getRandomPuzzle('test-request-4');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('NO_PUZZLES');
      expect(result.error?.statusCode).toBe(503);
      expect(result.cacheHeaders['Cache-Control']).toBe('no-cache');
    });

    it('should handle database errors gracefully', async () => {
      mockRepository.setShouldFail(true);

      const result = await service.getRandomPuzzle('test-request-5');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
      expect(result.error?.statusCode).toBe(503);
    });

    it('should be stateless - multiple calls work independently', async () => {
      mockRepository.setMockData([samplePuzzle1, samplePuzzle2]);

      const result1 = await service.getRandomPuzzle('request-1');
      const result2 = await service.getRandomPuzzle('request-2');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Results are independent (may be same or different puzzle)
      expect(result1.data).toBeDefined();
      expect(result2.data).toBeDefined();
    });
  });

  describe('getPuzzleById', () => {
    it('should return puzzle by valid UUID', async () => {
      mockRepository.setMockData([samplePuzzle1, samplePuzzle2]);

      const result = await service.getPuzzleById(
        '123e4567-e89b-12d3-a456-426614174000',
        'test-request-6'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.data?.puzzleNumber).toBe(1);
    });

    it('should return proper cache headers for puzzle by ID', async () => {
      mockRepository.setMockData([samplePuzzle1]);

      const result = await service.getPuzzleById(samplePuzzle1.id, 'test-request-7');

      expect(result.cacheHeaders).toBeDefined();
      expect(result.cacheHeaders['Cache-Control']).toContain('public');
      expect(result.cacheHeaders['Cache-Control']).toContain(
        `max-age=${CACHE_CONFIG.PUZZLE_BY_ID_TTL}`
      );
      expect(result.cacheHeaders['Cache-Control']).toContain('immutable');
      expect(result.cacheHeaders.ETag).toBeDefined();
    });

    it('should validate UUID format', async () => {
      const result = await service.getPuzzleById('invalid-uuid', 'test-request-8');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ID');
      expect(result.error?.statusCode).toBe(400);
    });

    it('should return 404 for non-existent puzzle', async () => {
      mockRepository.setMockData([samplePuzzle1]);

      const result = await service.getPuzzleById(
        '999e4567-e89b-12d3-a456-426614174999',
        'test-request-9'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.statusCode).toBe(404);
      // 404s should have short cache
      expect(result.cacheHeaders['Cache-Control']).toContain('max-age=60');
    });

    it('should be idempotent - same ID returns same puzzle', async () => {
      mockRepository.setMockData([samplePuzzle1]);

      const result1 = await service.getPuzzleById(samplePuzzle1.id, 'request-1');
      const result2 = await service.getPuzzleById(samplePuzzle1.id, 'request-2');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data?.id).toBe(result2.data?.id);
      expect(result1.data?.puzzleNumber).toBe(result2.data?.puzzleNumber);
    });

    it('should handle database errors', async () => {
      mockRepository.setShouldFail(true);

      const result = await service.getPuzzleById(samplePuzzle1.id, 'test-request-10');

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(503);
    });
  });

  describe('getPuzzleByNumber', () => {
    it('should return puzzle by valid number', async () => {
      mockRepository.setMockData([samplePuzzle1, samplePuzzle2]);

      const result = await service.getPuzzleByNumber(1, 'test-request-11');

      expect(result.success).toBe(true);
      expect(result.data?.puzzleNumber).toBe(1);
      expect(result.data?.id).toBe(samplePuzzle1.id);
    });

    it('should validate puzzle number', async () => {
      const result1 = await service.getPuzzleByNumber(-1, 'test-request-12');
      const result2 = await service.getPuzzleByNumber(0, 'test-request-13');
      const result3 = await service.getPuzzleByNumber(1.5, 'test-request-14');

      expect(result1.success).toBe(false);
      expect(result1.error?.code).toBe('INVALID_NUMBER');
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });

    it('should return 404 for non-existent puzzle number', async () => {
      mockRepository.setMockData([samplePuzzle1]);

      const result = await service.getPuzzleByNumber(999, 'test-request-15');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.statusCode).toBe(404);
    });

    it('should return same cache headers as getPuzzleById', async () => {
      mockRepository.setMockData([samplePuzzle1]);

      const result = await service.getPuzzleByNumber(1, 'test-request-16');

      expect(result.cacheHeaders['Cache-Control']).toContain('immutable');
      expect(result.cacheHeaders['Cache-Control']).toContain(
        `max-age=${CACHE_CONFIG.PUZZLE_BY_ID_TTL}`
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is available', async () => {
      const health = await service.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.timestamp).toBeDefined();
      expect(new Date(health.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should return unhealthy status when database fails', async () => {
      mockRepository.setShouldFail(true);

      const health = await service.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Cacheability', () => {
    it('should not include user-specific data in responses', async () => {
      mockRepository.setMockData([samplePuzzle1]);

      const result = await service.getRandomPuzzle('test-request-17');

      expect(result.data).toBeDefined();
      expect(result.data).not.toHaveProperty('userId');
      expect(result.data).not.toHaveProperty('session');
      expect(result.data).not.toHaveProperty('authToken');
    });

    it('should generate consistent ETags for same puzzle', async () => {
      mockRepository.setMockData([samplePuzzle1]);

      const result1 = await service.getPuzzleById(samplePuzzle1.id, 'request-1');
      const result2 = await service.getPuzzleById(samplePuzzle1.id, 'request-2');

      expect(result1.cacheHeaders.ETag).toBe(result2.cacheHeaders.ETag);
    });
  });

  describe('Error Handling', () => {
    it('should include request ID in error responses', async () => {
      mockRepository.setMockData([]);

      const requestId = 'test-correlation-id';
      const result = await service.getRandomPuzzle(requestId);

      expect(result.error?.requestId).toBe(requestId);
    });

    it('should not expose internal error details', async () => {
      mockRepository.setShouldFail(true);

      const result = await service.getRandomPuzzle('test-request-18');

      expect(result.error?.error).not.toContain('DATABASE_ERROR');
      expect(result.error?.error).toBe('Internal server error');
    });
  });
});
