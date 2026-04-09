/**
 * Puzzle Importer Service
 *
 * Fetches puzzles from OneWordSearch.com and imports them into the database.
 * This service is used to populate the puzzle database with real puzzle data.
 */

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { Puzzle } from '@/types/game';
import { generatePuzzleId } from '@/utils/puzzle-id';

interface ImportResult {
  success: boolean;
  date: string;
  puzzleNumber?: number;
  error?: string;
}

interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: ImportResult[];
}

/**
 * Fetches a puzzle from OneWordSearch.com for a specific date
 */
async function fetchPuzzleFromAPI(date: string): Promise<Puzzle | null> {
  try {
    const apiUrl = `https://onewordsearch.com/${date}.json`;

    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://onewordsearch.com/',
      },
    });

    if (!res.ok) {
      console.error(`[PuzzleImporter] Failed to fetch puzzle for date: ${date}, Status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`[PuzzleImporter] Error fetching puzzle for ${date}:`, error);
    return null;
  }
}

/**
 * Imports a single puzzle into the database
 * @param date - Date in YYYY-MM-DD format
 * @param useAdminClient - If true, uses admin client (for CLI). If false, uses request client (for API)
 */
export async function importPuzzle(date: string, useAdminClient: boolean = false): Promise<ImportResult> {
  try {
    // Fetch puzzle from API
    const puzzle = await fetchPuzzleFromAPI(date);

    if (!puzzle) {
      return {
        success: false,
        date,
        error: 'Failed to fetch puzzle from API'
      };
    }

    // Get Supabase client
    const supabase = useAdminClient ? createAdminClient() : await createClient();

    // Check if puzzle already exists for this date
    const { data: existing } = await supabase
      .from('puzzles')
      .select('id')
      .eq('puzzle_date', date)
      .maybeSingle();

    if (existing) {
      console.log(`[PuzzleImporter] Puzzle for ${date} already exists, skipping`);
      return {
        success: true,
        date,
        puzzleNumber: puzzle.number,
        error: 'Already exists (skipped)'
      };
    }

    // Insert puzzle into database
    // Use deterministic ID generation to ensure consistency
    const puzzleId = generatePuzzleId(date);
    const { error: insertError } = await supabase
      .from('puzzles')
      .insert({
        id: puzzleId,
        puzzle_number: puzzle.number,
        puzzle_date: date,
        board: puzzle.board,
        words: puzzle.words,
        difficulty: null, // Can be calculated or set manually later
        category: null,
        metadata: {
          source: 'onewordsearch.com',
          imported_at: new Date().toISOString()
        }
      });

    if (insertError) {
      console.error(`[PuzzleImporter] Error inserting puzzle for ${date}:`, insertError);
      return {
        success: false,
        date,
        error: insertError.message
      };
    }

    console.log(`[PuzzleImporter] Successfully imported puzzle ${puzzle.number} for ${date}`);
    return {
      success: true,
      date,
      puzzleNumber: puzzle.number
    };

  } catch (error) {
    console.error(`[PuzzleImporter] Unexpected error importing puzzle for ${date}:`, error);
    return {
      success: false,
      date,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Imports puzzles for a date range
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format (defaults to today)
 * @param useAdminClient - If true, uses admin client (for CLI)
 */
export async function importPuzzleRange(
  startDate: string,
  endDate?: string,
  useAdminClient: boolean = false
): Promise<ImportSummary> {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  const results: ImportResult[] = [];
  let current = new Date(start);

  console.log(`[PuzzleImporter] Starting import from ${startDate} to ${end.toISOString().split('T')[0]}`);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const result = await importPuzzle(dateStr, useAdminClient);
    results.push(result);

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  const summary: ImportSummary = {
    total: results.length,
    successful: results.filter(r => r.success && !r.error?.includes('skipped')).length,
    failed: results.filter(r => !r.success).length,
    skipped: results.filter(r => r.error?.includes('skipped')).length,
    results
  };

  console.log(`[PuzzleImporter] Import complete:`, {
    total: summary.total,
    successful: summary.successful,
    failed: summary.failed,
    skipped: summary.skipped
  });

  return summary;
}

/**
 * Imports the most recent N puzzles
 * @param count - Number of recent puzzles to import
 * @param useAdminClient - If true, uses admin client (for CLI)
 */
export async function importRecentPuzzles(count: number = 30, useAdminClient: boolean = false): Promise<ImportSummary> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - count + 1);

  return importPuzzleRange(
    startDate.toISOString().split('T')[0],
    today.toISOString().split('T')[0],
    useAdminClient
  );
}

/**
 * Imports random puzzles from the available date range
 * @param count - Number of random puzzles to import
 * @param useAdminClient - If true, uses admin client (for CLI)
 */
export async function importRandomPuzzles(count: number = 10, useAdminClient: boolean = false): Promise<ImportSummary> {
  const firstDate = new Date(Date.UTC(2024, 1, 21)); // Feb 21, 2024
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000));

  const results: ImportResult[] = [];
  const importedDates = new Set<string>();

  console.log(`[PuzzleImporter] Importing ${count} random puzzles`);

  for (let i = 0; i < count; i++) {
    // Generate random date
    const randomOffset = Math.floor(Math.random() * diffDays);
    const randomDate = new Date(firstDate.getTime() + randomOffset * 24 * 60 * 60 * 1000);
    const dateStr = randomDate.toISOString().split('T')[0];

    // Skip if we already imported this date
    if (importedDates.has(dateStr)) {
      i--;
      continue;
    }

    importedDates.add(dateStr);
    const result = await importPuzzle(dateStr, useAdminClient);
    results.push(result);

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  const summary: ImportSummary = {
    total: results.length,
    successful: results.filter(r => r.success && !r.error?.includes('skipped')).length,
    failed: results.filter(r => !r.success).length,
    skipped: results.filter(r => r.error?.includes('skipped')).length,
    results
  };

  console.log(`[PuzzleImporter] Random import complete:`, {
    total: summary.total,
    successful: summary.successful,
    failed: summary.failed,
    skipped: summary.skipped
  });

  return summary;
}
