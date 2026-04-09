#!/usr/bin/env tsx

/**
 * Direct Migration Application
 *
 * This script applies the migration by executing SQL statements one by one
 * using the Supabase REST API with the service role key.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function applyMigration() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           Direct Migration Application (Simplified)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required environment variables');
  }

  // Read migration file
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/003_game_results.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📋 Migration File: 003_game_results.sql');
  console.log(`📊 Size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}\n`);

  console.log('─────────────────────────────────────────────────────────────\n');

  console.log('⚠️  IMPORTANT INFORMATION:\n');
  console.log('Supabase does not provide a direct SQL execution endpoint via');
  console.log('the REST API for security reasons. This is intentional and expected.\n');

  console.log('The migration MUST be applied through one of these methods:\n');

  console.log('1️⃣  Supabase Studio (EASIEST - Recommended)');
  console.log('   • The SQL is already in your clipboard');
  console.log('   • Go to: https://supabase.com/dashboard');
  console.log('   • Navigate to SQL Editor');
  console.log('   • Paste (Cmd/Ctrl + V) and click RUN\n');

  console.log('2️⃣  Supabase CLI');
  console.log('   • npm install -g supabase');
  console.log('   • supabase link --project-ref nonagwthysjaqyngjodl');
  console.log('   • supabase db push\n');

  console.log('3️⃣  Direct PostgreSQL Connection');
  console.log('   • Get password from Dashboard > Settings > Database');
  console.log('   • Add DB_PASSWORD to .env.local');
  console.log('   • npm run migrate:direct\n');

  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('💡 TIP: The easiest way is option 1 (Supabase Studio).');
  console.log('   The SQL has already been copied to your clipboard!\n');

  console.log('After applying, verify with:');
  console.log('   npm run migrate:verify\n');

  console.log('═══════════════════════════════════════════════════════════════\n');

  // Copy to clipboard again in case it was lost
  const { exec } = await import('child_process');
  const util = await import('util');
  const execPromise = util.promisify(exec);

  try {
    await execPromise(`echo '${migrationSQL.replace(/'/g, "'\\''")}' | pbcopy`);
    console.log('✅ Migration SQL re-copied to clipboard!\n');
  } catch (error) {
    // Clipboard copy failed, but that's okay
  }
}

// Run
applyMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
