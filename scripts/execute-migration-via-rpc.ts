#!/usr/bin/env tsx

/**
 * Execute Migration via RPC Function
 *
 * This script first creates a helper RPC function in Supabase,
 * then uses it to execute the migration SQL.
 */

import { createAdminClient } from '../src/utils/supabase/admin';
import * as fs from 'fs';
import * as path from 'path';

async function executeMigration() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('        Execute Migration via Supabase RPC Function');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const admin = createAdminClient();

  // Read the migration file
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/003_game_results.sql');
  console.log(`📖 Reading migration file: ${migrationPath}\n`);

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  console.log('✅ Migration file loaded\n');

  // Step 1: Create the bootstrap helper function
  console.log('Step 1: Creating bootstrap RPC helper function...\n');

  const bootstrapSQL = `
create or replace function exec_migration_sql(sql_query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  execute sql_query;
  result := jsonb_build_object('status', 'success', 'message', 'Migration executed successfully');
  return result;
exception
  when others then
    result := jsonb_build_object('status', 'error', 'message', SQLERRM, 'code', SQLSTATE);
    return result;
end;
$$;

-- Grant execute to service_role only
revoke all on function exec_migration_sql(text) from public;
grant execute on function exec_migration_sql(text) to service_role;
`;

  console.log('⚠️  NOTE: This requires executing SQL in Supabase Studio first.\n');
  console.log('Please run this SQL in Supabase Studio to create the helper function:\n');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(bootstrapSQL);
  console.log('─────────────────────────────────────────────────────────────\n');

  console.log('Once you\'ve created the helper function, press Enter to continue...');
  console.log('Or press Ctrl+C to exit and apply migration manually.\n');

  // Try to call the RPC function (will fail if it doesn't exist)
  console.log('Attempting to execute migration via RPC...\n');

  try {
    const { data, error } = await admin.rpc('exec_migration_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.log(`❌ RPC call failed: ${error.message}\n`);

      if (error.message.includes('Could not find the function')) {
        console.log('The helper function does not exist yet.\n');
        console.log('Please create it using the SQL above, then run this script again.\n');
        return false;
      } else {
        throw error;
      }
    }

    if (data && data.status === 'error') {
      console.log(`❌ Migration execution error: ${data.message}`);
      console.log(`   Error code: ${data.code}\n`);
      return false;
    }

    console.log('✅ Migration executed successfully via RPC!\n');
    return true;

  } catch (error: any) {
    console.error(`❌ Unexpected error: ${error.message}\n`);
    return false;
  }
}

// Run the migration
executeMigration()
  .then((success) => {
    if (success) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('                   ✅ Migration Successful!');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('Next step: Verify the migration');
      console.log('  npm run migrate:verify\n');
      process.exit(0);
    } else {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('                   Migration Not Applied');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('Please apply the migration manually:\n');
      console.log('  npm run migrate:apply\n');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
