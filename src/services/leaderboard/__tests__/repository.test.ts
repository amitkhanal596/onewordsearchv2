/**
 * Leaderboard Repository Tests
 *
 * Tests for:
 * - Event processing idempotency
 * - Leaderboard calculation accuracy
 * - Qualification threshold filtering
 * - Concurrent event handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LeaderboardRepositoryImpl } from '../repository';
import type { PuzzleCompletedEventPayload } from '@/types/leaderboard';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockClient = {
    from: vi.fn(),
  };

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  mockClient.from.mockReturnValue(mockQuery);

  return { mockClient, mockQuery };
};

describe('LeaderboardRepository', () => {
  describe('isEventProcessed', () => {
    it('should return false if event not processed', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const result = await repository.isEventProcessed('session-123');

      expect(result).toBe(false);
      expect(mockClient.from).toHaveBeenCalledWith('processed_events');
      expect(mockQuery.select).toHaveBeenCalledWith('session_id');
      expect(mockQuery.eq).toHaveBeenCalledWith('session_id', 'session-123');
    });

    it('should return true if event already processed', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();
      mockQuery.single.mockResolvedValue({
        data: { session_id: 'session-123' },
        error: null,
      });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const result = await repository.isEventProcessed('session-123');

      expect(result).toBe(true);
    });

    it('should throw on database error', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Database error' },
      });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);

      await expect(repository.isEventProcessed('session-123')).rejects.toThrow();
    });
  });

  describe('processEvent', () => {
    const createMockEvent = (overrides = {}): PuzzleCompletedEventPayload => ({
      event_type: 'puzzle_completed',
      user_id: 'user-123',
      puzzle_id: 'puzzle-456',
      completion_time_seconds: 45,
      stars: 5,
      session_id: 'session-789',
      timestamp: new Date().toISOString(),
      ...overrides,
    });

    it('should process new event and update leaderboard', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();

      // Mock: event not processed yet
      mockQuery.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })
        // Mock: no existing stats for user
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        });

      // Mock: insert and upsert succeed
      mockQuery.insert = vi.fn().mockResolvedValue({ data: null, error: null });
      mockQuery.upsert = vi.fn().mockResolvedValue({ data: null, error: null });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const event = createMockEvent();
      const result = await repository.processEvent(event);

      expect(result).toBe(true);

      // Verify processed_events insert
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: event.session_id,
          user_id: event.user_id,
          puzzle_id: event.puzzle_id,
          stars: event.stars,
        })
      );

      // Verify leaderboard upsert with correct calculations
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: event.user_id,
          total_puzzles_completed: 1,
          total_stars: 5,
          average_stars: 5.0,
        })
      );
    });

    it('should calculate correct averages for existing users', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();

      // Mock: event not processed yet
      mockQuery.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })
        // Mock: existing user stats (10 puzzles, 40 stars)
        .mockResolvedValueOnce({
          data: {
            total_puzzles_completed: 10,
            total_stars: 40,
          },
          error: null,
        });

      mockQuery.insert = vi.fn().mockResolvedValue({ data: null, error: null });
      mockQuery.upsert = vi.fn().mockResolvedValue({ data: null, error: null });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const event = createMockEvent({ stars: 5 });
      await repository.processEvent(event);

      // Verify calculations: (40 + 5) / (10 + 1) = 45 / 11 = 4.09
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: event.user_id,
          total_puzzles_completed: 11,
          total_stars: 45,
          average_stars: expect.closeTo(4.09, 2),
        })
      );
    });

    it('should skip already processed events', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();

      // Mock: event already processed
      mockQuery.single.mockResolvedValueOnce({
        data: { session_id: 'session-789' },
        error: null,
      });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const event = createMockEvent();
      const result = await repository.processEvent(event);

      expect(result).toBe(false);
      expect(mockQuery.insert).not.toHaveBeenCalled();
      expect(mockQuery.upsert).not.toHaveBeenCalled();
    });

    it('should handle concurrent processing (unique violation)', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();

      // Mock: event not processed initially
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock: unique violation on insert (another worker processed it)
      mockQuery.insert = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505' }, // PostgreSQL unique_violation
      });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const event = createMockEvent();
      const result = await repository.processEvent(event);

      expect(result).toBe(false);
      expect(mockQuery.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getLeaderboard', () => {
    it('should return qualified users sorted by average stars', async () => {
      const { mockClient } = createMockSupabaseClient();

      const mockData = [
        {
          user_id: 'user-1',
          total_puzzles_completed: 10,
          total_stars: 48,
          average_stars: 4.8,
          last_updated: new Date().toISOString(),
        },
        {
          user_id: 'user-2',
          total_puzzles_completed: 5,
          total_stars: 23,
          average_stars: 4.6,
          last_updated: new Date().toISOString(),
        },
      ];

      // Create a fresh query mock for this test
      const countQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ count: 2, error: null }),
      };

      const dataQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      mockClient.from
        .mockReturnValueOnce(countQuery as any)
        .mockReturnValueOnce(dataQuery as any);

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const result = await repository.getLeaderboard(10, 0);

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(2);

      // Verify qualification threshold filter
      expect(dataQuery.gte).toHaveBeenCalledWith('total_puzzles_completed', 5);

      // Verify sorting
      expect(dataQuery.order).toHaveBeenCalledWith('average_stars', { ascending: false });
      expect(dataQuery.order).toHaveBeenCalledWith('total_puzzles_completed', {
        ascending: false,
      });
    });

    it('should apply pagination correctly', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();

      mockQuery.single.mockResolvedValue({ count: 100, error: null });
      mockQuery.range = vi.fn().mockResolvedValue({ data: [], error: null });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      await repository.getLeaderboard(20, 40);

      // Verify range (offset 40, limit 20 -> range(40, 59))
      expect(mockQuery.range).toHaveBeenCalledWith(40, 59);
    });
  });

  describe('getUserStats', () => {
    it('should return user stats if they exist', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();

      const mockStats = {
        user_id: 'user-123',
        total_puzzles_completed: 10,
        total_stars: 45,
        average_stars: 4.5,
        last_updated: new Date().toISOString(),
      };

      mockQuery.single.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const result = await repository.getUserStats('user-123');

      expect(result).toEqual(mockStats);
    });

    it('should return null if user not found', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const result = await repository.getUserStats('user-123');

      expect(result).toBeNull();
    });
  });

  describe('healthCheck', () => {
    it('should return true if database is accessible', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const result = await repository.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false on database error', async () => {
      const { mockClient, mockQuery } = createMockSupabaseClient();

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'CONNECTION_ERROR', message: 'Cannot connect' },
      });

      const repository = new LeaderboardRepositoryImpl(mockClient as any);
      const result = await repository.healthCheck();

      expect(result).toBe(false);
    });
  });
});
