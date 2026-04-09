/**
 * Admin API Endpoint - Import Puzzles
 *
 * POST /api/admin/import-puzzles
 *
 * Imports puzzles from OneWordSearch.com into the database.
 * This is an admin-only endpoint that requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  importPuzzle,
  importPuzzleRange,
  importRecentPuzzles,
  importRandomPuzzles
} from '@/services/puzzle-importer/importer';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { mode, date, startDate, endDate, count } = body;

    console.log(`[ImportPuzzlesAPI] Import request from user ${user.id}:`, { mode, date, startDate, endDate, count });

    let result;

    switch (mode) {
      case 'single':
        // Import a single puzzle by date
        if (!date) {
          return NextResponse.json(
            { error: 'Date is required for single mode' },
            { status: 400 }
          );
        }
        result = await importPuzzle(date);
        break;

      case 'range':
        // Import a range of puzzles
        if (!startDate) {
          return NextResponse.json(
            { error: 'Start date is required for range mode' },
            { status: 400 }
          );
        }
        result = await importPuzzleRange(startDate, endDate);
        break;

      case 'recent':
        // Import recent puzzles (default: 30 days)
        result = await importRecentPuzzles(count || 30);
        break;

      case 'random':
        // Import random puzzles
        result = await importRandomPuzzles(count || 10);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid mode. Use: single, range, recent, or random' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      mode,
      result
    });

  } catch (error) {
    console.error('[ImportPuzzlesAPI] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check authentication and provide usage instructions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          authenticated: false,
          message: 'Please log in to use the puzzle import endpoint'
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email
      },
      usage: {
        endpoint: '/api/admin/import-puzzles',
        method: 'POST',
        modes: {
          single: {
            description: 'Import a single puzzle by date',
            body: { mode: 'single', date: 'YYYY-MM-DD' },
            example: { mode: 'single', date: '2024-03-15' }
          },
          range: {
            description: 'Import a range of puzzles',
            body: { mode: 'range', startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD (optional)' },
            example: { mode: 'range', startDate: '2024-03-01', endDate: '2024-03-31' }
          },
          recent: {
            description: 'Import recent puzzles (default: 30 days)',
            body: { mode: 'recent', count: 'number (optional, default: 30)' },
            example: { mode: 'recent', count: 30 }
          },
          random: {
            description: 'Import random puzzles from available dates',
            body: { mode: 'random', count: 'number (optional, default: 10)' },
            example: { mode: 'random', count: 20 }
          }
        }
      }
    });

  } catch (error) {
    console.error('[ImportPuzzlesAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
