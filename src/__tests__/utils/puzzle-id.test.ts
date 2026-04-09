/**
 * Tests for deterministic puzzle ID generation
 */

import { describe, it, expect } from 'vitest';
import { generatePuzzleId } from '@/utils/puzzle-id';

describe('generatePuzzleId', () => {
  describe('Deterministic generation', () => {
    it('should generate the same UUID for the same date', () => {
      const date = '2024-03-15';
      const id1 = generatePuzzleId(date);
      const id2 = generatePuzzleId(date);

      expect(id1).toBe(id2);
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should generate different UUIDs for different dates', () => {
      const id1 = generatePuzzleId('2024-03-15');
      const id2 = generatePuzzleId('2024-03-16');
      const id3 = generatePuzzleId('2024-03-17');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should handle future dates correctly', () => {
      const futureDate = '2026-01-10';
      const id = generatePuzzleId(futureDate);

      expect(id).toBeDefined();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should handle past dates correctly', () => {
      const pastDate = '2020-01-01';
      const id = generatePuzzleId(pastDate);

      expect(id).toBeDefined();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('UUID format validation', () => {
    it('should generate valid UUID v5 format', () => {
      const id = generatePuzzleId('2024-03-15');

      // Check UUID format
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      // Version should be 5 (name-based with SHA-1)
      expect(id[14]).toBe('5');

      // Variant should be 8, 9, a, or b (RFC 4122)
      expect(['8', '9', 'a', 'b']).toContain(id[19].toLowerCase());
    });

    it('should generate valid UUID for edge case dates', () => {
      const dates = [
        '2024-01-01', // Start of year
        '2024-12-31', // End of year
        '2024-02-29', // Leap year day
        '2100-01-01', // Far future
      ];

      dates.forEach((date) => {
        const id = generatePuzzleId(date);
        expect(id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      });
    });
  });

  describe('Input validation', () => {
    it('should throw error for invalid date format', () => {
      expect(() => generatePuzzleId('2024/03/15')).toThrow(
        'Invalid date format'
      );
      expect(() => generatePuzzleId('03-15-2024')).toThrow(
        'Invalid date format'
      );
      expect(() => generatePuzzleId('2024-3-15')).toThrow(
        'Invalid date format'
      );
      expect(() => generatePuzzleId('invalid')).toThrow(
        'Invalid date format'
      );
    });

    it('should accept valid YYYY-MM-DD format', () => {
      expect(() => generatePuzzleId('2024-03-15')).not.toThrow();
      expect(() => generatePuzzleId('2024-01-01')).not.toThrow();
      expect(() => generatePuzzleId('2024-12-31')).not.toThrow();
    });
  });

  describe('Consistency across environments', () => {
    it('should generate same UUID regardless of execution order', () => {
      const dates = ['2024-03-15', '2024-03-16', '2024-03-17'];
      const ids1 = dates.map(generatePuzzleId);
      const ids2 = dates.reverse().map(generatePuzzleId).reverse();

      expect(ids1).toEqual(ids2);
    });

    it('should be idempotent over many calls', () => {
      const date = '2024-03-15';
      const firstId = generatePuzzleId(date);

      // Generate 100 times
      for (let i = 0; i < 100; i++) {
        expect(generatePuzzleId(date)).toBe(firstId);
      }
    });
  });

  describe('Known test vectors', () => {
    it('should generate consistent UUIDs for known dates', () => {
      // These are test vectors that should remain constant
      // If these change, it means the algorithm changed and will break existing data
      const testVectors = [
        { date: '2024-03-15', expectedId: '91d1e5fd-fc40-52d6-ac87-bfd06dfc59ad' },
        { date: '2026-01-10', expectedId: '39ec75c3-e535-5c05-a40c-c527d58a08e8' },
      ];

      testVectors.forEach(({ date, expectedId }) => {
        const actualId = generatePuzzleId(date);
        expect(actualId).toBe(expectedId);
      });
    });
  });

  describe('Auto-insert compatibility', () => {
    it('should generate IDs compatible with auto-insert flow', () => {
      // Simulate the flow:
      // 1. Frontend generates ID from date
      // 2. Backend receives ID and date
      // 3. Backend generates ID from date to check for existence
      // 4. IDs should match

      const puzzleDate = '2026-01-11';
      const frontendId = generatePuzzleId(puzzleDate);
      const backendId = generatePuzzleId(puzzleDate);

      expect(frontendId).toBe(backendId);
    });

    it('should support import script consistency', () => {
      // Import script should generate same ID as frontend/backend
      const puzzleDate = '2024-12-25';
      const importId = generatePuzzleId(puzzleDate);
      const frontendId = generatePuzzleId(puzzleDate);
      const backendId = generatePuzzleId(puzzleDate);

      expect(importId).toBe(frontendId);
      expect(importId).toBe(backendId);
    });
  });
});
