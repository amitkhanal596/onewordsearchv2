/**
 * Simple Migration Script
 * Applies the game_results migration to Supabase
 */

import { createAdminClient } from '../src/utils/supabase/admin';

async function applyMigration() {
  console.log('📦 Applying game_results table migration...\n');

  const supabase = createAdminClient();

  // Check if table already exists
  const { data: existingTable, error: checkError } = await supabase
    .from('game_results')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ Table game_results already exists!');
    console.log('Skipping migration.\n');
    return;
  }

  console.log('❌ Table does not exist. You need to apply the migration manually.\n');
  console.log('📝 Steps to apply migration:');
  console.log('   1. Go to your Supabase Dashboard');
  console.log('   2. Navigate to SQL Editor');
  console.log('   3. Copy and paste the contents of:');
  console.log('      supabase/migrations/003_game_results.sql');
  console.log('   4. Click "Run"\n');

  process.exit(0);
}

applyMigration();
