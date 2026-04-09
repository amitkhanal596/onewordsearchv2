/**
 * Puzzle ID Generation Utilities
 *
 * Generates deterministic UUIDs for puzzles based on their date.
 * This ensures the same puzzle date always produces the same UUID,
 * enabling auto-insert functionality even when puzzles aren't in the database yet.
 */

import { createHash } from 'crypto';

/**
 * Namespace UUID for OneWordSearch puzzles
 * Generated once and used consistently
 */
const PUZZLE_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace (standard)

/**
 * Generate a deterministic UUID v5 from a puzzle date
 *
 * @param date - Puzzle date in YYYY-MM-DD format
 * @returns UUID string
 *
 * @example
 * generatePuzzleId('2024-03-15') // Always returns same UUID for this date
 */
export function generatePuzzleId(date: string): string {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
  }

  // Create a deterministic hash using the date and namespace
  const name = `onewordsearch:${date}`;
  const hash = createHash('sha1');
  hash.update(PUZZLE_NAMESPACE);
  hash.update(name);
  const digest = hash.digest();

  // Format as UUID v5 (version 5 = name-based with SHA-1)
  // Set version (4 bits) and variant (2 bits) according to RFC 4122
  digest[6] = (digest[6] & 0x0f) | 0x50; // Version 5
  digest[8] = (digest[8] & 0x3f) | 0x80; // Variant 10

  // Format as UUID string
  const uuid = [
    digest.toString('hex', 0, 4),
    digest.toString('hex', 4, 6),
    digest.toString('hex', 6, 8),
    digest.toString('hex', 8, 10),
    digest.toString('hex', 10, 16),
  ].join('-');

  return uuid;
}
