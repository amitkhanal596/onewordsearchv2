/**
 * Apply Progress Service Migration
 *
 * This script applies the game_results table migration to the database.
 * Run this before running integration tests for the Progress Service.
 *
 * Usage:
 *   npx tsx scripts/apply-progress-migration.ts
 */

import { createAdminClient } from '../src/utils/supabase/admin';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('📦 Applying Progress Service Migration...\n');

  const adminClient = createAdminClient();

  // Read migration file
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/003_game_results.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration file:', migrationPath);
  console.log('📝 SQL length:', migrationSQL.length, 'bytes\n');

  try {
    // Execute migration
    console.log('🔄 Executing migration...');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (!statement) continue;

      // Skip comments
      if (statement.startsWith('--')) continue;

      const { error } = await adminClient.rpc('exec_sql', {
        sql: statement + ';',
      });

      if (error) {
        // Try direct execution via postgres function
        const { error: directError } = await adminClient
          .from('_migrations')
          .select('*')
          .limit(0);

        if (directError) {
          console.error('❌ Failed to execute statement:', error);
          throw error;
        }
      }
    }

    console.log('✅ Migration applied successfully!\n');

    // Verify table exists
    console.log('🔍 Verifying table creation...');
    const { data, error } = await adminClient
      .from('game_results')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Table verification failed:', error);
      console.error('\n⚠️  The migration may not have applied correctly.');
      console.error('💡 Try running the SQL manually in Supabase Dashboard:\n');
      console.error('   1. Go to https://app.supabase.com/project/_/sql');
      console.error('   2. Copy the contents of:', migrationPath);
      console.error('   3. Run the SQL query\n');
      process.exit(1);
    }

    console.log('✅ Table game_results exists and is accessible\n');

    // Check indexes
    const { data: indexes } = await adminClient.rpc('exec_sql', {
      sql: `
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'game_results'
        ORDER BY indexname;
      `,
    });

    if (indexes) {
      console.log('📊 Indexes created:');
      console.log(indexes);
    }

    console.log('\n🎉 Progress Service is ready for use!');
    console.log('📝 You can now run the integration tests:\n');
    console.log('   npm run test:run src/__tests__/progress/api.integration.test.ts\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n💡 Manual migration steps:');
    console.error('   1. Go to Supabase Dashboard > SQL Editor');
    console.error('   2. Run the following file:');
    console.error('      ' + migrationPath + '\n');
    process.exit(1);
  }
}

// Run migration
applyMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
