/**
 * Progress Service Unit Tests
 *
 * Tests for the progress service business logic layer.
 * Verifies:
 * - Star calculation algorithm
 * - Completion recording with idempotency
 * - User history retrieval with pagination
 * - Input validation
 * - Error handling
 * - Event emission
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProgressServiceImpl, calculateStars } from '@/services/progress/service';
import type {
  ProgressRepository,
  GameResultDbRow,
  RecordCompletionResponse,
} from '@/types/progress';
import type { EventEmitter, PuzzleCompletedEvent } from '@/services/progress/events';

// Mock repository implementation
class MockProgressRepository implements ProgressRepository {
  private mockData: GameResultDbRow[] = [];
  private shouldFail = false;
  private sessionIds = new Set<string>();

  setMockData(data: GameResultDbRow[]): void {
    this.mockData = data;
    this.sessionIds = new Set(data.map((r) => r.session_id));
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  async recordCompletion(
    userId: string,
    puzzleId: string,
    sessionId: string,
    completionTimeSeconds: number,
    stars: number
  ): Promise<GameResultDbRow | null> {
    if (this.shouldFail) {
      throw new Error('DATABASE_ERROR');
    }

    // Simulate idempotency check
    const existing = this.mockData.find((r) => r.session_id === sessionId);
    if (existing) {
      return existing;
    }

    const newRecord: GameResultDbRow = {
      id: `test-${Date.now()}`,
      user_id: userId,
      puzzle_id: puzzleId,
      session_id: sessionId,
      completion_time_seconds: completionTimeSeconds,
      stars,
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    this.mockData.push(newRecord);
    this.sessionIds.add(sessionId);
    return newRecord;
  }

  async getUserHistory(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ results: GameResultDbRow[]; total: number }> {
    if (this.shouldFail) {
      throw new Error('DATABASE_ERROR');
    }

    const userResults = this.mockData.filter((r) => r.user_id === userId);
    const sorted = userResults.sort(
      (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );
    const paginated = sorted.slice(offset, offset + limit);

    return {
      results: paginated,
      total: userResults.length,
    };
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail;
  }
}

// Mock event emitter
class MockEventEmitter implements EventEmitter {
  public emittedEvents: PuzzleCompletedEvent[] = [];
  private shouldFail = false;

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  async emitPuzzleCompleted(event: PuzzleCompletedEvent): Promise<void> {
    if (this.shouldFail) {
      throw new Error('EVENT_EMISSION_FAILED');
    }
    this.emittedEvents.push(event);
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail;
  }

  reset(): void {
    this.emittedEvents = [];
  }
}

describe('calculateStars', () => {
  describe('Star Thresholds', () => {
    it('should return 5 stars for completion < 60 seconds', () => {
      expect(calculateStars(0).stars).toBe(5);
      expect(calculateStars(30).stars).toBe(5);
      expect(calculateStars(59).stars).toBe(5);
    });

    it('should return 4 stars for completion 60-119 seconds', () => {
      expect(calculateStars(60).stars).toBe(4);
      expect(calculateStars(90).stars).toBe(4);
      expect(calculateStars(119).stars).toBe(4);
    });

    it('should return 3 stars for completion 120-179 seconds', () => {
      expect(calculateStars(120).stars).toBe(3);
      expect(calculateStars(150).stars).toBe(3);
      expect(calculateStars(179).stars).toBe(3);
    });

    it('should return 2 stars for completion 180-239 seconds', () => {
      expect(calculateStars(180).stars).toBe(2);
      expect(calculateStars(210).stars).toBe(2);
      expect(calculateStars(239).stars).toBe(2);
    });

    it('should return 1 star for completion >= 240 seconds', () => {
      expect(calculateStars(240).stars).toBe(1);
      expect(calculateStars(300).stars).toBe(1);
      expect(calculateStars(1000).stars).toBe(1);
    });
  });

  describe('Threshold Descriptions', () => {
    it('should return correct threshold descriptions', () => {
      expect(calculateStars(30).threshold).toBe('< 1 minute');
      expect(calculateStars(90).threshold).toBe('1-2 minutes');
      expect(calculateStars(150).threshold).toBe('2-3 minutes');
      expect(calculateStars(210).threshold).toBe('3-4 minutes');
      expect(calculateStars(300).threshold).toBe('4+ minutes');
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      expect(calculateStars(59).stars).toBe(5);
      expect(calculateStars(60).stars).toBe(4);
      expect(calculateStars(119).stars).toBe(4);
      expect(calculateStars(120).stars).toBe(3);
      expect(calculateStars(179).stars).toBe(3);
      expect(calculateStars(180).stars).toBe(2);
      expect(calculateStars(239).stars).toBe(2);
      expect(calculateStars(240).stars).toBe(1);
    });

    it('should throw error for negative completion time', () => {
      expect(() => calculateStars(-1)).toThrow('INVALID_COMPLETION_TIME');
      expect(() => calculateStars(-100)).toThrow('INVALID_COMPLETION_TIME');
    });
  });
});

describe('ProgressServiceImpl', () => {
  let service: ProgressServiceImpl;
  let mockRepository: MockProgressRepository;
  let mockEventEmitter: MockEventEmitter;

  beforeEach(() => {
    mockRepository = new MockProgressRepository();
    mockEventEmitter = new MockEventEmitter();

    // Inject mocks into service
    service = new ProgressServiceImpl();
    (service as any).repository = mockRepository;
    (service as any).eventEmitter = mockEventEmitter;
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockEventEmitter.reset();
  });

  describe('recordCompletion', () => {
    const validUserId = '123e4567-e89b-12d3-a456-426614174000';
    const validPuzzleId = '223e4567-e89b-12d3-a456-426614174001';
    const validSessionId = 'session-12345678';

    it('should record completion successfully', async () => {
      const result = await service.recordCompletion(
        validUserId,
        validPuzzleId,
        validSessionId,
        90
      );

      expect(result.success).toBe(true);
      expect(result.stars).toBe(4); // 90 seconds = 4 stars
      expect(result.puzzle_id).toBe(validPuzzleId);
      expect(result.completion_time_seconds).toBe(90);
      expect(result.session_id).toBe(validSessionId);
      expect(result.completed_at).toBeDefined();
    });

    it('should calculate correct stars based on completion time', async () => {
      const tests = [
        { time: 30, expectedStars: 5 },
        { time: 90, expectedStars: 4 },
        { time: 150, expectedStars: 3 },
        { time: 210, expectedStars: 2 },
        { time: 300, expectedStars: 1 },
      ];

      for (const { time, expectedStars } of tests) {
        const result = await service.recordCompletion(
          validUserId,
          validPuzzleId,
          `session-${time}`,
          time
        );
        expect(result.stars).toBe(expectedStars);
      }
    });

    it('should emit event after successful completion', async () => {
      await service.recordCompletion(validUserId, validPuzzleId, validSessionId, 90);

      // Wait for async event emission
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockEventEmitter.emittedEvents).toHaveLength(1);
      const event = mockEventEmitter.emittedEvents[0];
      expect(event.event_type).toBe('puzzle_completed');
      expect(event.user_id).toBe(validUserId);
      expect(event.puzzle_id).toBe(validPuzzleId);
      expect(event.session_id).toBe(validSessionId);
      expect(event.completion_time_seconds).toBe(90);
      expect(event.stars).toBe(4);
      expect(event.timestamp).toBeDefined();
    });

    it('should handle idempotent requests (duplicate session_id)', async () => {
      // First request
      const result1 = await service.recordCompletion(
        validUserId,
        validPuzzleId,
        validSessionId,
        90
      );

      // Second request with same session_id
      const result2 = await service.recordCompletion(
        validUserId,
        validPuzzleId,
        validSessionId,
        120 // Different time, should be ignored
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.session_id).toBe(result2.session_id);
      expect(result1.stars).toBe(result2.stars); // Should return same stars
    });

    describe('Input Validation', () => {
      it('should reject invalid puzzle_id format', async () => {
        await expect(
          service.recordCompletion(validUserId, 'invalid-uuid', validSessionId, 90)
        ).rejects.toThrow('INVALID_PUZZLE_ID');
      });

      it('should reject empty puzzle_id', async () => {
        await expect(
          service.recordCompletion(validUserId, '', validSessionId, 90)
        ).rejects.toThrow('INVALID_PUZZLE_ID');
      });

      it('should reject invalid session_id (too short)', async () => {
        await expect(
          service.recordCompletion(validUserId, validPuzzleId, 'short', 90)
        ).rejects.toThrow('INVALID_SESSION_ID');
      });

      it('should reject empty session_id', async () => {
        await expect(
          service.recordCompletion(validUserId, validPuzzleId, '', 90)
        ).rejects.toThrow('INVALID_SESSION_ID');
      });

      it('should reject zero completion time', async () => {
        await expect(
          service.recordCompletion(validUserId, validPuzzleId, validSessionId, 0)
        ).rejects.toThrow('INVALID_COMPLETION_TIME');
      });

      it('should reject negative completion time', async () => {
        await expect(
          service.recordCompletion(validUserId, validPuzzleId, validSessionId, -10)
        ).rejects.toThrow('INVALID_COMPLETION_TIME');
      });

      it('should reject non-integer completion time', async () => {
        await expect(
          service.recordCompletion(validUserId, validPuzzleId, validSessionId, 90.5)
        ).rejects.toThrow('INVALID_COMPLETION_TIME');
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        mockRepository.setShouldFail(true);

        await expect(
          service.recordCompletion(validUserId, validPuzzleId, validSessionId, 90)
        ).rejects.toThrow('DATABASE_ERROR');
      });

      it('should not fail if event emission fails (graceful degradation)', async () => {
        mockEventEmitter.setShouldFail(true);

        // Should still succeed even if event emission fails
        const result = await service.recordCompletion(
          validUserId,
          validPuzzleId,
          validSessionId,
          90
        );

        expect(result.success).toBe(true);
        expect(result.stars).toBe(4);
      });
    });
  });

  describe('getUserHistory', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    beforeEach(() => {
      const mockData: GameResultDbRow[] = [
        {
          id: 'result-1',
          user_id: userId,
          puzzle_id: 'puzzle-1',
          session_id: 'session-1',
          completion_time_seconds: 60,
          stars: 4,
          completed_at: '2024-02-21T12:00:00Z',
          created_at: '2024-02-21T12:00:00Z',
        },
        {
          id: 'result-2',
          user_id: userId,
          puzzle_id: 'puzzle-2',
          session_id: 'session-2',
          completion_time_seconds: 120,
          stars: 3,
          completed_at: '2024-02-21T13:00:00Z',
          created_at: '2024-02-21T13:00:00Z',
        },
        {
          id: 'result-3',
          user_id: userId,
          puzzle_id: 'puzzle-3',
          session_id: 'session-3',
          completion_time_seconds: 45,
          stars: 5,
          completed_at: '2024-02-21T14:00:00Z',
          created_at: '2024-02-21T14:00:00Z',
        },
      ];
      mockRepository.setMockData(mockData);
    });

    it('should return user history with default pagination', async () => {
      const result = await service.getUserHistory(userId);

      expect(result.completions).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should return completions ordered by most recent first', async () => {
      const result = await service.getUserHistory(userId);

      expect(result.completions[0].completed_at).toBe('2024-02-21T14:00:00Z');
      expect(result.completions[1].completed_at).toBe('2024-02-21T13:00:00Z');
      expect(result.completions[2].completed_at).toBe('2024-02-21T12:00:00Z');
    });

    it('should respect custom limit', async () => {
      const result = await service.getUserHistory(userId, 2);

      expect(result.completions).toHaveLength(2);
      expect(result.limit).toBe(2);
    });

    it('should respect offset for pagination', async () => {
      const result = await service.getUserHistory(userId, 20, 1);

      expect(result.completions).toHaveLength(2);
      expect(result.offset).toBe(1);
      expect(result.completions[0].session_id).toBe('session-2');
    });

    it('should clamp limit to maximum of 100', async () => {
      const result = await service.getUserHistory(userId, 200);

      expect(result.limit).toBe(100);
    });

    it('should clamp limit to minimum of 1', async () => {
      const result = await service.getUserHistory(userId, 0);

      expect(result.limit).toBe(1);
    });

    it('should handle negative offset as 0', async () => {
      const result = await service.getUserHistory(userId, 20, -10);

      expect(result.offset).toBe(0);
    });

    it('should return empty array for user with no history', async () => {
      mockRepository.setMockData([]);

      const result = await service.getUserHistory('different-user-id');

      expect(result.completions).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle database errors', async () => {
      mockRepository.setShouldFail(true);

      await expect(service.getUserHistory(userId)).rejects.toThrow('DATABASE_ERROR');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are healthy', async () => {
      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(new Date(health.timestamp).toString()).not.toBe('Invalid Date');
      expect(health.checks.database).toBe(true);
      expect(health.checks.redis).toBe(true);
    });

    it('should return unhealthy when database fails', async () => {
      mockRepository.setShouldFail(true);

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.checks.database).toBe(false);
    });

    it('should return unhealthy when event emitter fails', async () => {
      mockEventEmitter.setShouldFail(true);

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.checks.redis).toBe(false);
    });

    it('should return unhealthy when all services fail', async () => {
      mockRepository.setShouldFail(true);
      mockEventEmitter.setShouldFail(true);

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.checks.database).toBe(false);
      expect(health.checks.redis).toBe(false);
    });
  });
});
