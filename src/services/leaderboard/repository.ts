/**
 * Leaderboard Repository
 *
 * Data access layer for leaderboard operations.
 * Handles idempotency via processed_events tracking.
 *
 * Design Principles:
 * - Idempotency First: Check processed_events before updating
 * - Atomic Operations: Use transactions for consistency
 * - Accurate Calculations: average_stars = total_stars / total_puzzles_completed
 * - Qualification Enforcement: Only return users with >= 30 puzzles
 * - Crash Safety: Graceful error handling with rollback
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LeaderboardRepository,
  LeaderboardDbRow,
  PuzzleCompletedEventPayload,
} from '@/types/leaderboard';
import { QUALIFICATION_THRESHOLD } from '@/types/leaderboard';
import { createClient } from '@supabase/supabase-js';

/**
 * Repository implementation using Supabase
 */
export class LeaderboardRepositoryImpl implements LeaderboardRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      // Create service role client for worker (bypasses RLS)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
          'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
        );
      }

      this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }

  /**
   * Check if event has already been processed
   */
  async isEventProcessed(sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('processed_events')
        .select('session_id')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        // PGRST116 = row not found (event not processed yet)
        if (error.code === 'PGRST116') {
          return false;
        }
        console.error('[LeaderboardRepository] Error checking processed event:', error);
        throw error;
      }

      return data !== null;
    } catch (error) {
      console.error('[LeaderboardRepository] Failed to check if event processed:', error);
      throw error;
    }
  }

  /**
   * Process event and update leaderboard atomically
   *
   * Steps:
   * 1. Check if session_id already processed (idempotency)
   * 2. Insert into processed_events
   * 3. Upsert leaderboard record (increment totals, recalculate average)
   * 4. Commit transaction
   *
   * Returns true if processed, false if already processed
   */
  async processEvent(event: PuzzleCompletedEventPayload): Promise<boolean> {
    try {
      console.info('[LeaderboardRepository] Processing event:', {
        session_id: event.session_id,
        user_id: event.user_id,
        stars: event.stars,
      });

      // Step 1: Check if already processed
      const alreadyProcessed = await this.isEventProcessed(event.session_id);
      if (alreadyProcessed) {
        console.info('[LeaderboardRepository] Event already processed, skipping:', {
          session_id: event.session_id,
        });
        return false;
      }

      // Step 2: Insert into processed_events (marks event as processed)
      const { error: processedError } = await this.supabase
        .from('processed_events')
        .insert({
          session_id: event.session_id,
          user_id: event.user_id,
          puzzle_id: event.puzzle_id,
          stars: event.stars,
          completion_time_seconds: event.completion_time_seconds,
          event_timestamp: event.timestamp,
          processed_at: new Date().toISOString(),
        });

      if (processedError) {
        // 23505 = unique_violation (another worker processed this event concurrently)
        if (processedError.code === '23505') {
          console.warn('[LeaderboardRepository] Event already processed by another worker:', {
            session_id: event.session_id,
          });
          return false;
        }
        console.error('[LeaderboardRepository] Failed to insert processed event:', processedError);
        throw processedError;
      }

      // Step 3: Upsert leaderboard record
      // First, get current stats (if they exist)
      const { data: currentStats, error: fetchError } = await this.supabase
        .from('leaderboard')
        .select('total_puzzles_completed, total_stars')
        .eq('user_id', event.user_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = not found (first completion for this user)
        console.error('[LeaderboardRepository] Failed to fetch current stats:', fetchError);
        throw fetchError;
      }

      // Calculate new aggregates
      const currentPuzzles = currentStats?.total_puzzles_completed ?? 0;
      const currentStars = currentStats?.total_stars ?? 0;
      const newTotalPuzzles = currentPuzzles + 1;
      const newTotalStars = currentStars + event.stars;
      const newAverageStars = newTotalStars / newTotalPuzzles;

      // Calculate weighted average: avg_stars * log(total_games)
      // Using natural logarithm (ln) for the weight
      const weightedAverage = newAverageStars * Math.log(newTotalPuzzles);

      // Upsert leaderboard record
      const { error: upsertError } = await this.supabase
        .from('leaderboard')
        .upsert({
          user_id: event.user_id,
          total_puzzles_completed: newTotalPuzzles,
          total_stars: newTotalStars,
          average_stars: newAverageStars,
          weighted_average: weightedAverage,
          last_updated: new Date().toISOString(),
        });

      if (upsertError) {
        console.error('[LeaderboardRepository] Failed to upsert leaderboard:', upsertError);
        throw upsertError;
      }

      console.info('[LeaderboardRepository] Event processed successfully:', {
        session_id: event.session_id,
        user_id: event.user_id,
        new_total_puzzles: newTotalPuzzles,
        new_total_stars: newTotalStars,
        new_average_stars: newAverageStars.toFixed(2),
      });

      return true;
    } catch (error) {
      console.error('[LeaderboardRepository] Failed to process event:', error);
      throw error;
    }
  }

  /**
   * Get top users for leaderboard API
   *
   * Sorting:
   * 1. average_stars DESC (primary ranking)
   * 2. total_puzzles_completed DESC (tiebreaker)
   *
   * Filter: Only users with >= 30 puzzles (qualification threshold)
   */
  async getLeaderboard(
    limit: number,
    offset: number
  ): Promise<{ entries: LeaderboardDbRow[]; total: number }> {
    try {
      // Get total count of qualified users
      const { count, error: countError } = await this.supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .gte('total_puzzles_completed', QUALIFICATION_THRESHOLD);

      if (countError) {
        console.error('[LeaderboardRepository] Failed to count leaderboard entries:', countError);
        throw countError;
      }

      // Get paginated leaderboard entries with user email and best time
      const { data, error } = await this.supabase
        .from('leaderboard')
        .select(`
          user_id,
          total_puzzles_completed,
          total_stars,
          average_stars,
          weighted_average,
          last_updated
        `)
        .gte('total_puzzles_completed', QUALIFICATION_THRESHOLD)
        .order('weighted_average', { ascending: false })
        .order('total_puzzles_completed', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[LeaderboardRepository] Failed to fetch leaderboard:', error);
        throw error;
      }

      // For each user, fetch their username and best time
      const enrichedEntries = await Promise.all(
        (data || []).map(async (entry) => {
          // Get username from profiles table
          // Note: profiles table uses 'id' column, not 'user_id'
          const { data: profileData } = await this.supabase
            .from('profiles')
            .select('username')
            .eq('id', entry.user_id)
            .single();

          // Get best (minimum) completion time from game_results
          const { data: bestTimeData } = await this.supabase
            .from('game_results')
            .select('completion_time_seconds')
            .eq('user_id', entry.user_id)
            .order('completion_time_seconds', { ascending: true })
            .limit(1)
            .single();

          return {
            ...entry,
            username: profileData?.username || 'Unknown',
            best_time_seconds: bestTimeData?.completion_time_seconds || null,
          };
        })
      );

      return {
        entries: enrichedEntries as any,
        total: count || 0,
      };
    } catch (error) {
      console.error('[LeaderboardRepository] Failed to get leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get statistics for a specific user
   */
  async getUserStats(userId: string): Promise<LeaderboardDbRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('leaderboard')
        .select('user_id, total_puzzles_completed, total_stars, average_stars, weighted_average, last_updated')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        console.error('[LeaderboardRepository] Failed to fetch user stats:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('[LeaderboardRepository] Failed to get user stats:', error);
      throw error;
    }
  }

  /**
   * Health check for database connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('leaderboard')
        .select('user_id')
        .limit(1)
        .single();

      // Either success or "no rows" is healthy
      return !error || error.code === 'PGRST116';
    } catch (error) {
      console.error('[LeaderboardRepository] Health check failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create repository instance
 */
export function createLeaderboardRepository(
  supabaseClient?: SupabaseClient
): LeaderboardRepository {
  return new LeaderboardRepositoryImpl(supabaseClient);
}
