/**
 * Puzzle API Integration Tests
 *
 * Real integration tests using actual database with imported puzzles.
 * These tests verify the complete flow from API to database.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createAdminClient } from '@/utils/supabase/admin';

describe('Puzzle API Integration Tests (Real Database)', () => {
  let puzzleCount = 0;
  let samplePuzzleId: string | null = null;

  beforeAll(async () => {
    // Check if we have puzzles in the database
    const supabase = createAdminClient();
    const { count } = await supabase
      .from('puzzles')
      .select('*', { count: 'exact', head: true });

    puzzleCount = count || 0;

    if (puzzleCount > 0) {
      // Get a sample puzzle ID for testing
      const { data } = await supabase
        .from('puzzles')
        .select('id')
        .limit(1)
        .single();

      samplePuzzleId = data?.id || null;
    }
  });

  describe('GET /api/puzzle/random', () => {
    it('should return 200 with a random puzzle from real database', async () => {
      if (puzzleCount === 0) {
        console.warn('⚠️  Skipping test: No puzzles in database. Run: npx tsx scripts/import-puzzles.ts random 10');
        return;
      }

      const response = await fetch('http://localhost:3000/api/puzzle/random');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('puzzleNumber');
      expect(data).toHaveProperty('puzzleDate');
      expect(data).toHaveProperty('board');
      expect(data).toHaveProperty('words');
      expect(Array.isArray(data.board)).toBe(true);
      expect(Array.isArray(data.words)).toBe(true);
    });

    it('should include proper Cache-Control headers', async () => {
      if (puzzleCount === 0) {
        console.warn('⚠️  Skipping test: No puzzles in database');
        return;
      }

      const response = await fetch('http://localhost:3000/api/puzzle/random');
      const cacheControl = response.headers.get('Cache-Control');

      expect(cacheControl).toBeTruthy();
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('max-age');
    });

    it('should include ETag header', async () => {
      if (puzzleCount === 0) {
        console.warn('⚠️  Skipping test: No puzzles in database');
        return;
      }

      const response = await fetch('http://localhost:3000/api/puzzle/random');
      const etag = response.headers.get('ETag');

      expect(etag).toBeTruthy();
    });

    it('should include X-Request-ID header', async () => {
      if (puzzleCount === 0) {
        console.warn('⚠️  Skipping test: No puzzles in database');
        return;
      }

      const response = await fetch('http://localhost:3000/api/puzzle/random');
      const requestId = response.headers.get('X-Request-ID');

      expect(requestId).toBeTruthy();
    });
  });

  describe('GET /api/puzzle/id/{puzzle_id}', () => {
    it('should return 200 with correct puzzle by ID', async () => {
      if (!samplePuzzleId) {
        console.warn('⚠️  Skipping test: No puzzles in database');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/puzzle/id/${samplePuzzleId}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(samplePuzzleId);
      expect(data).toHaveProperty('puzzleNumber');
      expect(data).toHaveProperty('board');
      expect(data).toHaveProperty('words');
    });

    it('should include immutable cache headers for puzzle by ID', async () => {
      if (!samplePuzzleId) {
        console.warn('⚠️  Skipping test: No puzzles in database');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/puzzle/id/${samplePuzzleId}`);
      const cacheControl = response.headers.get('Cache-Control');

      expect(cacheControl).toBeTruthy();
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('immutable');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await fetch('http://localhost:3000/api/puzzle/id/invalid-uuid');
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 404 for non-existent puzzle', async () => {
      const fakeId = '999e4567-e89b-12d3-a456-426614174999';
      const response = await fetch(`http://localhost:3000/api/puzzle/id/${fakeId}`);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should be idempotent - same ID returns same puzzle', async () => {
      if (!samplePuzzleId) {
        console.warn('⚠️  Skipping test: No puzzles in database');
        return;
      }

      const response1 = await fetch(`http://localhost:3000/api/puzzle/id/${samplePuzzleId}`);
      const data1 = await response1.json();

      const response2 = await fetch(`http://localhost:3000/api/puzzle/id/${samplePuzzleId}`);
      const data2 = await response2.json();

      const response3 = await fetch(`http://localhost:3000/api/puzzle/id/${samplePuzzleId}`);
      const data3 = await response3.json();

      expect(data1).toEqual(data2);
      expect(data2).toEqual(data3);
    });
  });

  describe('GET /api/puzzle/health', () => {
    it('should return 200 when service is healthy', async () => {
      const response = await fetch('http://localhost:3000/api/puzzle/health');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('timestamp');
    });

    it('should not cache health check responses', async () => {
      const response = await fetch('http://localhost:3000/api/puzzle/health');
      const cacheControl = response.headers.get('Cache-Control');

      expect(cacheControl).toBeTruthy();
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('no-store');
    });
  });

  describe('Statelessness Verification', () => {
    it('should not include user-specific data in responses', async () => {
      if (!samplePuzzleId) {
        console.warn('⚠️  Skipping test: No puzzles in database');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/puzzle/id/${samplePuzzleId}`);
      const data = await response.json();

      // Verify no user-specific fields
      expect(data).not.toHaveProperty('userId');
      expect(data).not.toHaveProperty('userProgress');
      expect(data).not.toHaveProperty('attempts');
      expect(data).not.toHaveProperty('completedAt');
      expect(data).not.toHaveProperty('score');
    });

    it('should return same data regardless of request headers', async () => {
      if (!samplePuzzleId) {
        console.warn('⚠️  Skipping test: No puzzles in database');
        return;
      }

      // Request 1: No special headers
      const response1 = await fetch(`http://localhost:3000/api/puzzle/id/${samplePuzzleId}`);
      const data1 = await response1.json();

      // Request 2: With user-agent
      const response2 = await fetch(`http://localhost:3000/api/puzzle/id/${samplePuzzleId}`, {
        headers: { 'User-Agent': 'TestClient/1.0' }
      });
      const data2 = await response2.json();

      // Request 3: With custom headers
      const response3 = await fetch(`http://localhost:3000/api/puzzle/id/${samplePuzzleId}`, {
        headers: { 'X-Custom-Header': 'test-value' }
      });
      const data3 = await response3.json();

      // All responses should be identical (stateless)
      expect(data1).toEqual(data2);
      expect(data2).toEqual(data3);
    });
  });

  describe('Database Integration', () => {
    it('should have puzzles in database', () => {
      expect(puzzleCount).toBeGreaterThan(0);

      if (puzzleCount === 0) {
        console.error('❌ No puzzles found in database!');
        console.error('📝 To fix: Run `npx tsx scripts/import-puzzles.ts random 20`');
      } else {
        console.log(`✅ Found ${puzzleCount} puzzles in database`);
      }
    });

    it('should be able to query puzzles directly', async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        const puzzle = data[0];
        expect(puzzle).toHaveProperty('id');
        expect(puzzle).toHaveProperty('puzzle_number');
        expect(puzzle).toHaveProperty('board');
        expect(puzzle).toHaveProperty('words');
      }
    });
  });
});
