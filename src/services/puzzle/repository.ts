/**
 * Puzzle Repository
 *
 * Data access layer for puzzle operations.
 * Uses repository pattern for easy testing and future Redis integration.
 *
 * Design Principles:
 * - Stateless: No session or user state
 * - Read-only: No write operations
 * - Cacheable: Designed for cache-aside pattern
 * - Fault-isolated: Errors don't cascade
 */

import { createClient } from '@/utils/supabase/server';
import type { PuzzleDbRow } from '@/types/game';

export interface PuzzleRepository {
  getRandomPuzzle(): Promise<PuzzleDbRow | null>;
  getPuzzleById(id: string): Promise<PuzzleDbRow | null>;
  getPuzzleByNumber(number: number): Promise<PuzzleDbRow | null>;
  getPuzzleByDate(date: string): Promise<PuzzleDbRow | null>;
  healthCheck(): Promise<boolean>;
}

/**
 * Supabase implementation of PuzzleRepository
 */
export class SupabasePuzzleRepository implements PuzzleRepository {
  /**
   * Get a random puzzle from the database
   *
   * Cache Strategy: Short TTL (5 minutes) since result varies
   * Status Codes: 200 (success), 500 (DB error), 503 (service unavailable)
   */
  async getRandomPuzzle(): Promise<PuzzleDbRow | null> {
    try {
      const supabase = await createClient();

      // Get total count first
      const { count, error: countError } = await supabase
        .from('puzzles')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('[PuzzleRepository] Error getting puzzle count:', countError);
        throw new Error('DATABASE_ERROR');
      }

      if (!count || count === 0) {
        console.warn('[PuzzleRepository] No puzzles found in database');
        return null;
      }

      // Generate random offset
      const randomOffset = Math.floor(Math.random() * count);

      // Fetch random puzzle using offset
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .range(randomOffset, randomOffset)
        .single();

      if (error) {
        console.error('[PuzzleRepository] Error fetching random puzzle:', error);
        throw new Error('DATABASE_ERROR');
      }

      return data as PuzzleDbRow;
    } catch (error) {
      console.error('[PuzzleRepository] getRandomPuzzle failed:', error);
      throw error;
    }
  }

  /**
   * Get puzzle by UUID
   *
   * Cache Strategy: Long TTL (24 hours) - immutable content
   * Status Codes: 200 (success), 404 (not found), 500 (DB error)
   */
  async getPuzzleById(id: string): Promise<PuzzleDbRow | null> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('[PuzzleRepository] Error fetching puzzle by ID:', error);
        throw new Error('DATABASE_ERROR');
      }

      return data as PuzzleDbRow;
    } catch (error) {
      console.error('[PuzzleRepository] getPuzzleById failed:', error);
      throw error;
    }
  }

  /**
   * Get puzzle by puzzle number
   *
   * Cache Strategy: Long TTL (24 hours) - immutable content
   * Status Codes: 200 (success), 404 (not found), 500 (DB error)
   */
  async getPuzzleByNumber(number: number): Promise<PuzzleDbRow | null> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .eq('puzzle_number', number)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('[PuzzleRepository] Error fetching puzzle by number:', error);
        throw new Error('DATABASE_ERROR');
      }

      return data as PuzzleDbRow;
    } catch (error) {
      console.error('[PuzzleRepository] getPuzzleByNumber failed:', error);
      throw error;
    }
  }

  /**
   * Get puzzle by date
   *
   * Cache Strategy: Long TTL (24 hours) - immutable content
   * Status Codes: 200 (success), 404 (not found), 500 (DB error)
   */
  async getPuzzleByDate(date: string): Promise<PuzzleDbRow | null> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .eq('puzzle_date', date)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('[PuzzleRepository] Error fetching puzzle by date:', error);
        throw new Error('DATABASE_ERROR');
      }

      return data as PuzzleDbRow;
    } catch (error) {
      console.error('[PuzzleRepository] getPuzzleByDate failed:', error);
      throw error;
    }
  }

  /**
   * Health check for service monitoring
   *
   * Returns true if database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('puzzles')
        .select('id')
        .limit(1)
        .single();

      // If error is PGRST116 (no rows), that's still a healthy connection
      if (error && error.code !== 'PGRST116') {
        console.error('[PuzzleRepository] Health check failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PuzzleRepository] Health check failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create repository instance
 * Makes it easy to swap implementations (e.g., add Redis caching layer)
 */
export function createPuzzleRepository(): PuzzleRepository {
  return new SupabasePuzzleRepository();
}
