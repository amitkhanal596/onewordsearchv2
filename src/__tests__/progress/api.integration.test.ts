/**
 * Progress API Integration Tests
 *
 * Real integration tests with actual database operations.
 * These tests verify the complete flow from API to database with authentication.
 *
 * Prerequisites:
 * 1. Database migration must be applied: supabase/migrations/003_game_results.sql
 * 2. Test user must exist in auth.users
 * 3. At least one puzzle must exist in puzzles table
 *
 * Note: These tests require a running server and will create real database records.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/utils/supabase/admin';
import { randomUUID } from 'crypto';

describe('Progress API Integration Tests (Real Database)', () => {
  let testUserId: string | null = null;
  let testUserEmail: string;
  let testUserPassword: string;
  let authToken: string | null = null;
  let testPuzzleId: string | null = null;
  const adminClient = createAdminClient();

  beforeAll(async () => {
    // 1. Create test user if not exists
    testUserEmail = `test-${randomUUID()}@example.com`;
    testUserPassword = 'TestPassword123!';

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testUserEmail,
      password: testUserPassword,
      email_confirm: true,
    });

    if (authError) {
      console.error('Failed to create test user:', authError);
      throw authError;
    }

    testUserId = authData.user?.id || null;
    console.log(`✅ Created test user: ${testUserEmail} (${testUserId})`);

    // 2. Sign in to get auth token
    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email: testUserEmail,
      password: testUserPassword,
    });

    if (signInError || !signInData.session) {
      console.error('Failed to sign in test user:', signInError);
      throw signInError || new Error('No session returned');
    }

    authToken = signInData.session.access_token;
    console.log('✅ Obtained auth token for test user');

    // 3. Get a test puzzle from database
    const { data: puzzleData, error: puzzleError } = await adminClient
      .from('puzzles')
      .select('id')
      .limit(1)
      .single();

    if (puzzleError || !puzzleData) {
      console.warn('⚠️  No puzzles in database. Some tests will be skipped.');
      console.warn('   To fix: Run `npx tsx scripts/import-puzzles.ts random 10`');
    } else {
      testPuzzleId = puzzleData.id;
      console.log(`✅ Found test puzzle: ${testPuzzleId}`);
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test user's game results
    if (testUserId) {
      await adminClient.from('game_results').delete().eq('user_id', testUserId);
      console.log('✅ Cleaned up test game results');

      // Delete test user
      await adminClient.auth.admin.deleteUser(testUserId);
      console.log('✅ Deleted test user');
    }
  });

  describe('POST /api/progress/complete', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch('http://localhost:3000/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          puzzle_id: testPuzzleId || '123e4567-e89b-12d3-a456-426614174000',
          completion_time_seconds: 90,
          session_id: randomUUID(),
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for missing puzzle_id', async () => {
      if (!authToken) return;

      const response = await fetch('http://localhost:3000/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          completion_time_seconds: 90,
          session_id: randomUUID(),
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_PUZZLE_ID');
    });

    it('should return 400 for invalid completion_time_seconds', async () => {
      if (!authToken || !testPuzzleId) return;

      const response = await fetch('http://localhost:3000/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          puzzle_id: testPuzzleId,
          completion_time_seconds: -10,
          session_id: randomUUID(),
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_COMPLETION_TIME');
    });

    it('should return 400 for missing session_id', async () => {
      if (!authToken || !testPuzzleId) return;

      const response = await fetch('http://localhost:3000/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          puzzle_id: testPuzzleId,
          completion_time_seconds: 90,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_SESSION_ID');
    });

    it('should record completion successfully with correct stars', async () => {
      if (!authToken || !testPuzzleId) {
        console.warn('⚠️  Skipping: No auth token or test puzzle');
        return;
      }

      const sessionId = randomUUID();
      const response = await fetch('http://localhost:3000/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          puzzle_id: testPuzzleId,
          completion_time_seconds: 90,
          session_id: sessionId,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.stars).toBe(4); // 90 seconds = 4 stars
      expect(data.puzzle_id).toBe(testPuzzleId);
      expect(data.completion_time_seconds).toBe(90);
      expect(data.session_id).toBe(sessionId);
      expect(data.completed_at).toBeDefined();

      // Verify X-Request-ID header
      expect(response.headers.get('X-Request-ID')).toBeTruthy();

      // Verify Cache-Control (should not cache completion endpoints)
      expect(response.headers.get('Cache-Control')).toContain('no-store');
    });

    it('should calculate correct stars for different completion times', async () => {
      if (!authToken || !testPuzzleId) {
        console.warn('⚠️  Skipping: No auth token or test puzzle');
        return;
      }

      const tests = [
        { time: 30, expectedStars: 5 },
        { time: 90, expectedStars: 4 },
        { time: 150, expectedStars: 3 },
        { time: 210, expectedStars: 2 },
        { time: 300, expectedStars: 1 },
      ];

      for (const { time, expectedStars } of tests) {
        const sessionId = randomUUID();
        const response = await fetch('http://localhost:3000/api/progress/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            puzzle_id: testPuzzleId,
            completion_time_seconds: time,
            session_id: sessionId,
          }),
        });

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.stars).toBe(expectedStars);
      }
    });

    it('should handle idempotent requests (duplicate session_id)', async () => {
      if (!authToken || !testPuzzleId) {
        console.warn('⚠️  Skipping: No auth token or test puzzle');
        return;
      }

      const sessionId = randomUUID();

      // First request
      const response1 = await fetch('http://localhost:3000/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          puzzle_id: testPuzzleId,
          completion_time_seconds: 90,
          session_id: sessionId,
        }),
      });

      expect(response1.status).toBe(201);
      const data1 = await response1.json();
      expect(data1.stars).toBe(4);

      // Second request with same session_id but different time
      const response2 = await fetch('http://localhost:3000/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          puzzle_id: testPuzzleId,
          completion_time_seconds: 150, // Different time
          session_id: sessionId, // Same session_id
        }),
      });

      // Should return success (idempotent)
      expect([200, 201]).toContain(response2.status);
      const data2 = await response2.json();

      // Should return original stars, not recalculated
      expect(data2.stars).toBe(4);
      expect(data2.session_id).toBe(sessionId);
    });

    it('should verify data was saved to database', async () => {
      if (!authToken || !testPuzzleId || !testUserId) {
        console.warn('⚠️  Skipping: Missing prerequisites');
        return;
      }

      const sessionId = randomUUID();

      // Record completion via API
      await fetch('http://localhost:3000/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          puzzle_id: testPuzzleId,
          completion_time_seconds: 60,
          session_id: sessionId,
        }),
      });

      // Verify in database
      const { data, error } = await adminClient
        .from('game_results')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.user_id).toBe(testUserId);
      expect(data?.puzzle_id).toBe(testPuzzleId);
      expect(data?.completion_time_seconds).toBe(60);
      expect(data?.stars).toBe(4);
    });
  });

  describe('GET /api/progress/history', () => {
    beforeAll(async () => {
      // Create some test completions
      if (!authToken || !testPuzzleId) return;

      for (let i = 0; i < 5; i++) {
        await fetch('http://localhost:3000/api/progress/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            puzzle_id: testPuzzleId,
            completion_time_seconds: 60 + i * 10,
            session_id: randomUUID(),
          }),
        });
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await fetch('http://localhost:3000/api/progress/history');

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('should return user history with default pagination', async () => {
      if (!authToken) {
        console.warn('⚠️  Skipping: No auth token');
        return;
      }

      const response = await fetch('http://localhost:3000/api/progress/history', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('completions');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');

      expect(Array.isArray(data.completions)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);

      // Verify completion structure
      if (data.completions.length > 0) {
        const completion = data.completions[0];
        expect(completion).toHaveProperty('id');
        expect(completion).toHaveProperty('puzzle_id');
        expect(completion).toHaveProperty('completion_time_seconds');
        expect(completion).toHaveProperty('stars');
        expect(completion).toHaveProperty('session_id');
        expect(completion).toHaveProperty('completed_at');
      }
    });

    it('should respect limit parameter', async () => {
      if (!authToken) {
        console.warn('⚠️  Skipping: No auth token');
        return;
      }

      const response = await fetch('http://localhost:3000/api/progress/history?limit=3', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.completions.length).toBeLessThanOrEqual(3);
      expect(data.limit).toBe(3);
    });

    it('should respect offset parameter', async () => {
      if (!authToken) {
        console.warn('⚠️  Skipping: No auth token');
        return;
      }

      const response = await fetch('http://localhost:3000/api/progress/history?offset=2', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.offset).toBe(2);
    });

    it('should return completions ordered by most recent first', async () => {
      if (!authToken) {
        console.warn('⚠️  Skipping: No auth token');
        return;
      }

      const response = await fetch('http://localhost:3000/api/progress/history', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (data.completions.length >= 2) {
        const first = new Date(data.completions[0].completed_at);
        const second = new Date(data.completions[1].completed_at);
        expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
      }
    });

    it('should return 400 for invalid pagination parameters', async () => {
      if (!authToken) {
        console.warn('⚠️  Skipping: No auth token');
        return;
      }

      const response = await fetch('http://localhost:3000/api/progress/history?limit=-1', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_PAGINATION');
    });

    it('should include proper cache headers', async () => {
      if (!authToken) {
        console.warn('⚠️  Skipping: No auth token');
        return;
      }

      const response = await fetch('http://localhost:3000/api/progress/history', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('private'); // User-specific data
      expect(cacheControl).toContain('max-age');
    });
  });

  describe('GET /api/progress/health', () => {
    it('should return 200 when service is healthy', async () => {
      const response = await fetch('http://localhost:3000/api/progress/health');

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('checks');
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('redis');

      expect(data.checks.database).toBe(true);
    });

    it('should not cache health check responses', async () => {
      const response = await fetch('http://localhost:3000/api/progress/health');

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('no-store');
    });

    it('should include X-Request-ID header', async () => {
      const response = await fetch('http://localhost:3000/api/progress/health');

      expect(response.headers.get('X-Request-ID')).toBeTruthy();
    });

    it('should not require authentication', async () => {
      // Health check should work without auth token
      const response = await fetch('http://localhost:3000/api/progress/health');

      expect(response.status).toBe(200);
    });
  });

  describe('Service Independence', () => {
    it('should work even if puzzle service is down', async () => {
      if (!authToken) {
        console.warn('⚠️  Skipping: No auth token');
        return;
      }

      // Use a fake puzzle_id (will fail foreign key constraint)
      const fakePuzzleId = '999e4567-e89b-12d3-a456-426614174999';

      const response = await fetch('http://localhost:3000/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          puzzle_id: fakePuzzleId,
          completion_time_seconds: 90,
          session_id: randomUUID(),
        }),
      });

      // Should return 409 (conflict) due to foreign key constraint
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.code).toBe('INVALID_REFERENCE');
    });
  });

  describe('Database Integration', () => {
    it('should have game_results table', async () => {
      const { error } = await adminClient
        .from('game_results')
        .select('id')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should enforce unique session_id constraint', async () => {
      if (!testUserId || !testPuzzleId) {
        console.warn('⚠️  Skipping: Missing prerequisites');
        return;
      }

      const sessionId = `test-unique-${randomUUID()}`;

      // Insert first record
      const { error: error1 } = await adminClient.from('game_results').insert({
        user_id: testUserId,
        puzzle_id: testPuzzleId,
        session_id: sessionId,
        completion_time_seconds: 60,
        stars: 4,
      });

      expect(error1).toBeNull();

      // Try to insert duplicate session_id
      const { error: error2 } = await adminClient.from('game_results').insert({
        user_id: testUserId,
        puzzle_id: testPuzzleId,
        session_id: sessionId, // Same session_id
        completion_time_seconds: 90,
        stars: 4,
      });

      expect(error2).toBeTruthy();
      expect(error2?.code).toBe('23505'); // Unique constraint violation
    });
  });
});
