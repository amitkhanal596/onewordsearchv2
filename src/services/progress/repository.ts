/**
 * Progress Repository
 *
 * Data access layer for game completion records.
 * Implements idempotent writes using session_id unique constraint.
 *
 * Design Principles:
 * - Idempotency: Uses INSERT ... ON CONFLICT for duplicate protection
 * - Service Independence: Only stores puzzle_id (no joins to puzzle service)
 * - User Isolation: Leverages RLS policies for security
 * - Optimized Queries: Uses indexed columns for fast retrieval
 *
 * Error Handling:
 * - Returns null on duplicate session_id (idempotent behavior)
 * - Throws DATABASE_ERROR on connection/query failures
 * - Validates foreign key constraints (user_id, puzzle_id)
 */

import { createClient } from '@/utils/supabase/server';
import type {
  ProgressRepository,
  GameResultDbRow,
} from '@/types/progress';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase implementation of ProgressRepository
 */
export class SupabaseProgressRepository implements ProgressRepository {
  private supabaseClient: SupabaseClient | null;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabaseClient = supabaseClient || null;
  }

  /**
   * Get Supabase client - use injected client if provided, otherwise create a new one
   */
  private async getClient(): Promise<SupabaseClient> {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }
    return createClient();
  }

  /**
   * Ensure puzzle exists in database (auto-insert if missing)
   *
   * This handles edge cases like:
   * - Testing with future dates
   * - Time zone differences
   * - Manual puzzle entry before scheduled import
   *
   * Strategy:
   * 1. Check if puzzle exists by ID
   * 2. If not, get puzzle_date from the puzzle (requires lookup)
   * 3. Fetch puzzle from onewordsearch.com API
   * 4. Insert into database
   *
   * @param puzzleId - Puzzle UUID to check/insert
   * @param puzzleDate - Optional puzzle date (YYYY-MM-DD) to avoid extra lookup
   * @returns true if puzzle exists or was successfully inserted
   */
  private async ensurePuzzleExists(puzzleId: string, puzzleDate?: string): Promise<{ exists: boolean; actualId?: string }> {
    try {
      // Use admin client for puzzle operations (bypasses RLS for insert)
      const { createAdminClient } = await import('@/utils/supabase/admin');
      const supabase = createAdminClient();

      // First check by ID (in case frontend-generated ID matches)
      const { data: existingById, error: checkByIdError } = await supabase
        .from('puzzles')
        .select('id, puzzle_date')
        .eq('id', puzzleId)
        .maybeSingle();

      if (checkByIdError) {
        console.error('[ProgressRepository] Error checking puzzle by ID:', checkByIdError);
      }

      // Puzzle exists with our ID, we're good
      if (existingById) {
        return { exists: true, actualId: existingById.id };
      }

      // If we have a date, also check by date (puzzles may have different UUIDs)
      if (puzzleDate) {
        const { data: existingByDate, error: checkByDateError } = await supabase
          .from('puzzles')
          .select('id, puzzle_date')
          .eq('puzzle_date', puzzleDate)
          .maybeSingle();

        if (checkByDateError) {
          console.error('[ProgressRepository] Error checking puzzle by date:', checkByDateError);
        }

        if (existingByDate) {
          console.info('[ProgressRepository] Puzzle found by date with different ID:', {
            requestedId: puzzleId,
            actualId: existingByDate.id,
            puzzleDate,
          });
          return { exists: true, actualId: existingByDate.id };
        }
      }

      // Puzzle doesn't exist - we need the date to fetch it
      if (!puzzleDate) {
        console.warn('[ProgressRepository] Puzzle not found and no date provided:', puzzleId);
        console.warn('[ProgressRepository] Cannot auto-insert without puzzle date');
        return { exists: false };
      }

      console.info('[ProgressRepository] Puzzle not found, fetching from API:', {
        puzzleId,
        puzzleDate,
      });

      // Fetch puzzle from onewordsearch.com API
      const apiUrl = `https://onewordsearch.com/${puzzleDate}.json`;
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://onewordsearch.com/',
        },
      });

      if (!response.ok) {
        console.error('[ProgressRepository] Failed to fetch puzzle from API:', {
          puzzleDate,
          status: response.status,
        });
        return { exists: false };
      }

      const puzzleData = await response.json();

      // Calculate puzzle number from date
      const firstDate = new Date(Date.UTC(2024, 1, 21)); // Feb 21, 2024
      const currentDate = new Date(puzzleDate + 'T00:00:00Z');
      const diffDays = Math.floor(
        (currentDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      const puzzleNumber = diffDays + 1;

      // Insert puzzle into database
      // Use the provided puzzleId (which should be deterministically generated from date)
      const { error: insertError } = await supabase.from('puzzles').insert({
        id: puzzleId, // Use the deterministic ID from frontend
        puzzle_number: puzzleNumber,
        puzzle_date: puzzleDate,
        board: puzzleData.board,
        words: puzzleData.words,
        difficulty: 'medium', // Default, can be updated later
        category: null,
        metadata: {},
      });

      if (insertError) {
        console.error('[ProgressRepository] Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        });

        // Check if it's a duplicate (race condition or existing puzzle with different ID)
        if (insertError.code === '23505') {
          console.info('[ProgressRepository] Duplicate detected, looking up existing puzzle by date');

          // The puzzle exists but with a different ID - look it up by date
          const { data: existingByDate } = await supabase
            .from('puzzles')
            .select('id')
            .eq('puzzle_date', puzzleDate)
            .maybeSingle();

          if (existingByDate) {
            console.info('[ProgressRepository] Found existing puzzle by date:', {
              requestedId: puzzleId,
              actualId: existingByDate.id,
              puzzleDate,
            });
            return { exists: true, actualId: existingByDate.id };
          }

          console.error('[ProgressRepository] Duplicate error but puzzle not found by date');
          return { exists: false };
        }

        console.error('[ProgressRepository] Failed to insert puzzle:', insertError);
        return { exists: false };
      }

      console.info('[ProgressRepository] Successfully auto-inserted puzzle:', {
        puzzleId,
        puzzleDate,
        puzzleNumber,
      });

      return { exists: true, actualId: puzzleId };
    } catch (error) {
      console.error('[ProgressRepository] ensurePuzzleExists failed:', error);
      return { exists: false };
    }
  }

  /**
   * Record puzzle completion with idempotency guarantee
   *
   * Uses session_id unique constraint to prevent duplicates.
   * Returns null if session_id already exists (idempotent response).
   *
   * @param userId - Authenticated user's UUID
   * @param puzzleId - Puzzle UUID being completed
   * @param sessionId - Unique session identifier for idempotency
   * @param completionTimeSeconds - Time taken in seconds
   * @param stars - Star rating (1-5)
   * @param puzzleDate - Optional puzzle date (YYYY-MM-DD) for auto-insert
   * @returns GameResultDbRow on success, null on duplicate, throws on error
   */
  async recordCompletion(
    userId: string,
    puzzleId: string,
    sessionId: string,
    completionTimeSeconds: number,
    stars: number,
    puzzleDate?: string
  ): Promise<GameResultDbRow | null> {
    try {
      const supabase = await this.getClient();

      // First, check if session_id already exists (idempotency check)
      const { data: existing, error: checkError } = await supabase
        .from('game_results')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (checkError) {
        console.error('[ProgressRepository] Error checking existing session:', checkError);
        throw new Error('DATABASE_ERROR');
      }

      // If session already exists, return null (idempotent response)
      if (existing) {
        console.info('[ProgressRepository] Duplicate session_id detected, returning existing record:', sessionId);
        return existing as GameResultDbRow;
      }

      // Ensure puzzle exists in database (auto-insert if missing)
      // Also get the actual puzzle ID (may differ from frontend-generated ID)
      let actualPuzzleId = puzzleId;
      if (puzzleDate) {
        const puzzleResult = await this.ensurePuzzleExists(puzzleId, puzzleDate);
        if (!puzzleResult.exists) {
          console.warn('[ProgressRepository] Failed to ensure puzzle exists, proceeding anyway');
          // Continue anyway - foreign key constraint will catch it if puzzle truly doesn't exist
        } else if (puzzleResult.actualId) {
          actualPuzzleId = puzzleResult.actualId;
          console.info('[ProgressRepository] Using actual puzzle ID:', {
            requestedId: puzzleId,
            actualId: actualPuzzleId,
          });
        }
      }

      // Insert new completion record
      const { data, error } = await supabase
        .from('game_results')
        .insert({
          user_id: userId,
          puzzle_id: actualPuzzleId,
          session_id: sessionId,
          completion_time_seconds: completionTimeSeconds,
          stars: stars,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Check for foreign key violations
        if (error.code === '23503') {
          console.error('[ProgressRepository] Foreign key violation:', error.message);
          throw new Error('INVALID_REFERENCE');
        }

        // Check for unique constraint violation (should be caught by pre-check, but defensive)
        if (error.code === '23505') {
          console.warn('[ProgressRepository] Race condition: duplicate session_id:', sessionId);
          // Re-fetch the existing record
          const { data: raceData } = await supabase
            .from('game_results')
            .select('*')
            .eq('session_id', sessionId)
            .single();
          return raceData as GameResultDbRow | null;
        }

        console.error('[ProgressRepository] Error inserting completion:', error);
        throw new Error('DATABASE_ERROR');
      }

      console.info('[ProgressRepository] Completion recorded:', {
        userId,
        puzzleId,
        sessionId,
        stars,
      });

      return data as GameResultDbRow;
    } catch (error) {
      console.error('[ProgressRepository] recordCompletion failed:', error);
      throw error;
    }
  }

  /**
   * Get user's completion history with pagination
   *
   * Returns completions ordered by most recent first.
   * Uses composite index (user_id, completed_at) for optimal performance.
   *
   * @param userId - Authenticated user's UUID
   * @param limit - Maximum number of records to return (default: 20)
   * @param offset - Number of records to skip (default: 0)
   * @returns Object with results array and total count
   */
  async getUserHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ results: GameResultDbRow[]; total: number }> {
    try {
      const supabase = await this.getClient();

      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from('game_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        console.error('[ProgressRepository] Error getting history count:', countError);
        throw new Error('DATABASE_ERROR');
      }

      // Get paginated results
      const { data, error } = await supabase
        .from('game_results')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[ProgressRepository] Error fetching history:', error);
        throw new Error('DATABASE_ERROR');
      }

      return {
        results: (data as GameResultDbRow[]) || [],
        total: count || 0,
      };
    } catch (error) {
      console.error('[ProgressRepository] getUserHistory failed:', error);
      throw error;
    }
  }

  /**
   * Health check for database connectivity
   *
   * Performs a simple query to verify database is accessible.
   * Used by /health endpoint for service monitoring.
   *
   * @returns true if database is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const supabase = await this.getClient();

      // Simple query to check database connectivity
      const { error } = await supabase
        .from('game_results')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows, which is fine for health check
        console.error('[ProgressRepository] Health check failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ProgressRepository] Health check failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create repository instance
 * Makes it easy to swap implementations or add caching layer
 *
 * @param supabaseClient - Optional authenticated Supabase client with user context
 * @returns ProgressRepository instance
 */
export function createProgressRepository(
  supabaseClient?: SupabaseClient
): ProgressRepository {
  return new SupabaseProgressRepository(supabaseClient);
}
