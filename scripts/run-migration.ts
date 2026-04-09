/**
 * Run Migration Script
 * Applies SQL migrations directly to Supabase using the admin client
 */

import { createAdminClient } from '../src/utils/supabase/admin';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('📦 Running game_results migration...\n');

  const supabase = createAdminClient();

  // Read the migration file
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/003_game_results.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration file:', migrationPath);
  console.log('📝 Executing SQL...\n');

  try {
    // Execute the SQL directly
    // Note: This uses the REST API which may have limitations
    // For complex migrations, use Supabase Dashboard SQL Editor

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!response.ok) {
      console.log('⚠️  REST API method not available.');
      console.log('Please apply the migration manually via Supabase Dashboard.\n');
      console.log('📋 Copy this SQL and run it in SQL Editor:');
      console.log('─'.repeat(60));
      console.log(sql);
      console.log('─'.repeat(60));
      return;
    }

    console.log('✅ Migration applied successfully!\n');

    // Verify table creation
    const { data, error } = await supabase
      .from('game_results')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Table game_results is ready!\n');
    console.log('🎉 You can now run the tests:\n');
    console.log('   npm run test:run src/__tests__/progress/\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n💡 Please apply the migration manually:');
    console.log('   1. Open Supabase Dashboard > SQL Editor');
    console.log('   2. Copy the SQL from:', migrationPath);
    console.log('   3. Paste and run it\n');
  }
}

runMigration();
