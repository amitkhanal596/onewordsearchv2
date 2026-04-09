/**
 * Leaderboard API Endpoint Tests
 *
 * Tests for:
 * - Query parameter validation
 * - Pagination handling
 * - Ranking calculation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the repository
vi.mock('@/services/leaderboard/repository', () => ({
  createLeaderboardRepository: vi.fn(() => ({
    getLeaderboard: vi.fn(),
  })),
}));

import { createLeaderboardRepository } from '@/services/leaderboard/repository';

const createMockRequest = (params: Record<string, string> = {}): NextRequest => {
  const url = new URL('http://localhost:3000/api/leaderboard');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return new NextRequest(url);
};

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return leaderboard with default pagination', async () => {
    const mockEntries = [
      {
        user_id: 'user-1',
        total_puzzles_completed: 20,
        total_stars: 95,
        average_stars: 4.75,
        last_updated: new Date().toISOString(),
      },
      {
        user_id: 'user-2',
        total_puzzles_completed: 15,
        total_stars: 67,
        average_stars: 4.47,
        last_updated: new Date().toISOString(),
      },
    ];

    const mockRepository = {
      getLeaderboard: vi.fn().mockResolvedValue({
        entries: mockEntries,
        total: 100,
      }),
    };

    vi.mocked(createLeaderboardRepository).mockReturnValue(mockRepository as any);

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.leaderboard).toHaveLength(2);
    expect(data.total).toBe(100);
    expect(data.limit).toBe(50); // Default limit
    expect(data.offset).toBe(0); // Default offset

    // Verify ranking calculation
    expect(data.leaderboard[0].rank).toBe(1);
    expect(data.leaderboard[1].rank).toBe(2);

    // Verify average stars are rounded to 2 decimals
    expect(data.leaderboard[0].average_stars).toBe(4.75);
    expect(data.leaderboard[1].average_stars).toBe(4.47);
  });

  it('should respect custom limit parameter', async () => {
    const mockRepository = {
      getLeaderboard: vi.fn().mockResolvedValue({
        entries: [],
        total: 0,
      }),
    };

    vi.mocked(createLeaderboardRepository).mockReturnValue(mockRepository as any);

    const request = createMockRequest({ limit: '25' });
    const response = await GET(request);
    const data = await response.json();

    expect(mockRepository.getLeaderboard).toHaveBeenCalledWith(25, 0);
    expect(data.limit).toBe(25);
  });

  it('should enforce maximum limit of 100', async () => {
    const mockRepository = {
      getLeaderboard: vi.fn().mockResolvedValue({
        entries: [],
        total: 0,
      }),
    };

    vi.mocked(createLeaderboardRepository).mockReturnValue(mockRepository as any);

    const request = createMockRequest({ limit: '500' });
    const response = await GET(request);
    const data = await response.json();

    expect(mockRepository.getLeaderboard).toHaveBeenCalledWith(100, 0);
    expect(data.limit).toBe(100);
  });

  it('should respect offset parameter', async () => {
    const mockEntry = {
      user_id: 'user-51',
      total_puzzles_completed: 10,
      total_stars: 45,
      average_stars: 4.5,
      last_updated: new Date().toISOString(),
    };

    const mockRepository = {
      getLeaderboard: vi.fn().mockResolvedValue({
        entries: [mockEntry],
        total: 100,
      }),
    };

    vi.mocked(createLeaderboardRepository).mockReturnValue(mockRepository as any);

    const request = createMockRequest({ offset: '50' });
    const response = await GET(request);
    const data = await response.json();

    expect(mockRepository.getLeaderboard).toHaveBeenCalledWith(50, 50);
    expect(data.offset).toBe(50);

    // Verify rank calculation with offset
    expect(data.leaderboard[0].rank).toBe(51); // offset + 1
  });

  it('should return 400 for invalid limit', async () => {
    const request = createMockRequest({ limit: 'invalid' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid limit parameter');
    expect(data.code).toBe('INVALID_LIMIT');
  });

  it('should return 400 for negative limit', async () => {
    const request = createMockRequest({ limit: '-10' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_LIMIT');
  });

  it('should return 400 for invalid offset', async () => {
    const request = createMockRequest({ offset: 'invalid' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid offset parameter');
    expect(data.code).toBe('INVALID_OFFSET');
  });

  it('should return 400 for negative offset', async () => {
    const request = createMockRequest({ offset: '-5' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_OFFSET');
  });

  it('should return 500 on repository error', async () => {
    const mockRepository = {
      getLeaderboard: vi.fn().mockRejectedValue(new Error('Database error')),
    };

    vi.mocked(createLeaderboardRepository).mockReturnValue(mockRepository as any);

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('should return empty leaderboard when no qualified users', async () => {
    const mockRepository = {
      getLeaderboard: vi.fn().mockResolvedValue({
        entries: [],
        total: 0,
      }),
    };

    vi.mocked(createLeaderboardRepository).mockReturnValue(mockRepository as any);

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.leaderboard).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('should include cache headers for performance', async () => {
    const mockRepository = {
      getLeaderboard: vi.fn().mockResolvedValue({
        entries: [],
        total: 0,
      }),
    };

    vi.mocked(createLeaderboardRepository).mockReturnValue(mockRepository as any);

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toContain('s-maxage=60');
  });
});
