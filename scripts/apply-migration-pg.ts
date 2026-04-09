#!/usr/bin/env tsx

/**
 * Migration Script: Apply game_results table migration
 *
 * This script executes the 003_game_results.sql migration file directly
 * using PostgreSQL connection string derived from Supabase credentials.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function applyMigration() {
  console.log('=== Applying game_results Migration ===\n');

  // Read the migration file
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/003_game_results.sql');
  console.log(`Reading migration file: ${migrationPath}`);

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  console.log('✓ Migration file loaded\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required environment variables');
  }

  console.log(`Supabase URL: ${supabaseUrl}\n`);

  // Use Supabase Management API to execute SQL
  // Extract project ref from URL
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  console.log(`Project Reference: ${projectRef}\n`);

  console.log('Attempting to execute migration via Supabase REST API...\n');

  // Try using the database REST endpoint
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql: migrationSQL })
  });

  console.log(`Response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`Response: ${errorText}\n`);
    console.log('⚠ Direct SQL execution via REST API not available.\n');
    console.log('This is expected - Supabase JS client does not support arbitrary SQL execution for security reasons.\n');
  }

  // Verify if table exists
  console.log('=== Verification ===\n');
  console.log('Checking if game_results table already exists...\n');

  const { createAdminClient } = await import('../src/utils/supabase/admin');
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('game_results')
    .select('id')
    .limit(1);

  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('✗ Table does not exist\n');
      throw new Error('Migration must be applied manually via Supabase Studio');
    } else {
      console.log(`⚠ Error checking table: ${error.message}\n`);
    }
  } else {
    console.log('✓ Table game_results already exists!\n');
    return true;
  }

  return false;
}

// Run the migration
applyMigration()
  .then((exists) => {
    if (exists) {
      console.log('✓ Table verification successful - migration already applied\n');
    } else {
      console.log('\n' + '='.repeat(70));
      console.log('MANUAL MIGRATION REQUIRED');
      console.log('='.repeat(70));
      console.log('\nThe Supabase JS client does not support direct SQL execution.');
      console.log('Please apply the migration manually using one of these methods:\n');
      console.log('METHOD 1: Supabase Studio (Recommended)');
      console.log('  1. Go to https://supabase.com/dashboard');
      console.log('  2. Select your project');
      console.log('  3. Navigate to SQL Editor (left sidebar)');
      console.log('  4. Click "New Query"');
      console.log('  5. Paste the contents of:');
      console.log('     supabase/migrations/003_game_results.sql');
      console.log('  6. Click "Run" or press Cmd/Ctrl + Enter\n');
      console.log('METHOD 2: Supabase CLI');
      console.log('  1. Install: npm install -g supabase');
      console.log('  2. Link project: supabase link --project-ref YOUR_PROJECT_REF');
      console.log('  3. Apply migration: supabase db push\n');
      console.log('METHOD 3: Direct PostgreSQL Connection');
      console.log('  1. Get connection string from Supabase Dashboard > Settings > Database');
      console.log('  2. Run: psql "YOUR_CONNECTION_STRING" -f supabase/migrations/003_game_results.sql\n');
      console.log('='.repeat(70) + '\n');
    }
    process.exit(exists ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n✗ Error:', error.message);
    console.log('\nPlease apply the migration manually via Supabase Studio.\n');
    process.exit(1);
  });
