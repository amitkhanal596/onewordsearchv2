/**
 * CLI Script to Import Puzzles
 *
 * This script imports puzzles from OneWordSearch.com into the database.
 * Run with: npx tsx scripts/import-puzzles.ts [mode] [options]
 *
 * Examples:
 *   npx tsx scripts/import-puzzles.ts recent 30
 *   npx tsx scripts/import-puzzles.ts random 20
 *   npx tsx scripts/import-puzzles.ts single 2024-03-15
 *   npx tsx scripts/import-puzzles.ts range 2024-03-01 2024-03-31
 */

import {
  importPuzzle,
  importPuzzleRange,
  importRecentPuzzles,
  importRandomPuzzles
} from '../src/services/puzzle-importer/importer';

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'recent';

  console.log('='.repeat(60));
  console.log('OneWordSearch Puzzle Importer');
  console.log('='.repeat(60));
  console.log();

  try {
    let result;

    switch (mode) {
      case 'single': {
        const date = args[1];
        if (!date) {
          console.error('❌ Error: Date is required for single mode');
          console.log('Usage: npx tsx scripts/import-puzzles.ts single YYYY-MM-DD');
          console.log('Example: npx tsx scripts/import-puzzles.ts single 2024-03-15');
          process.exit(1);
        }
        console.log(`📥 Importing puzzle for ${date}...`);
        result = await importPuzzle(date, true);
        break;
      }

      case 'range': {
        const startDate = args[1];
        const endDate = args[2];
        if (!startDate) {
          console.error('❌ Error: Start date is required for range mode');
          console.log('Usage: npx tsx scripts/import-puzzles.ts range YYYY-MM-DD [YYYY-MM-DD]');
          console.log('Example: npx tsx scripts/import-puzzles.ts range 2024-03-01 2024-03-31');
          process.exit(1);
        }
        console.log(`📥 Importing puzzles from ${startDate} to ${endDate || 'today'}...`);
        result = await importPuzzleRange(startDate, endDate, true);
        break;
      }

      case 'recent': {
        const count = parseInt(args[1] || '30');
        console.log(`📥 Importing ${count} most recent puzzles...`);
        result = await importRecentPuzzles(count, true);
        break;
      }

      case 'random': {
        const count = parseInt(args[1] || '10');
        console.log(`📥 Importing ${count} random puzzles...`);
        result = await importRandomPuzzles(count, true);
        break;
      }

      default:
        console.error(`❌ Error: Unknown mode '${mode}'`);
        console.log();
        console.log('Available modes:');
        console.log('  recent [count]          - Import recent puzzles (default: 30)');
        console.log('  random [count]          - Import random puzzles (default: 10)');
        console.log('  single YYYY-MM-DD       - Import a single puzzle by date');
        console.log('  range START [END]       - Import a range of puzzles');
        console.log();
        console.log('Examples:');
        console.log('  npx tsx scripts/import-puzzles.ts recent 30');
        console.log('  npx tsx scripts/import-puzzles.ts random 20');
        console.log('  npx tsx scripts/import-puzzles.ts single 2024-03-15');
        console.log('  npx tsx scripts/import-puzzles.ts range 2024-03-01 2024-03-31');
        process.exit(1);
    }

    // Display results
    console.log();
    console.log('='.repeat(60));
    console.log('Import Results');
    console.log('='.repeat(60));

    if ('total' in result) {
      // Summary result
      console.log(`✅ Successful: ${result.successful}`);
      console.log(`⏭️  Skipped:    ${result.skipped}`);
      console.log(`❌ Failed:     ${result.failed}`);
      console.log(`📊 Total:      ${result.total}`);

      if (result.failed > 0) {
        console.log();
        console.log('Failed imports:');
        result.results
          .filter(r => !r.success)
          .forEach(r => {
            console.log(`  - ${r.date}: ${r.error}`);
          });
      }
    } else {
      // Single result
      if (result.success) {
        console.log(`✅ Successfully imported puzzle #${result.puzzleNumber} for ${result.date}`);
      } else {
        console.log(`❌ Failed to import puzzle for ${result.date}: ${result.error}`);
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('Import complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ Error during import:');
    console.error(error);
    process.exit(1);
  }
}

main();
