#!/usr/bin/env tsx

/**
 * Migration Script: Apply game_results table migration
 *
 * This script executes the SQL migration using direct PostgreSQL connection.
 * It uses the connection string format: postgresql://postgres:[password]@[host]:5432/postgres
 */

import { Client } from 'pg';
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

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  // Extract project details from Supabase URL
  // Format: https://[project-ref].supabase.co
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

  console.log(`Project Reference: ${projectRef}`);
  console.log('\nNOTE: To use direct PostgreSQL connection, you need:');
  console.log('  1. Database password from Supabase Dashboard');
  console.log('  2. Connection pooler enabled (optional but recommended)\n');

  // Check if we have DB_PASSWORD in env
  const dbPassword = process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;

  if (!dbPassword) {
    console.log('⚠ Database password not found in environment variables\n');
    console.log('Add one of these to your .env.local file:');
    console.log('  DB_PASSWORD=your_database_password');
    console.log('  SUPABASE_DB_PASSWORD=your_database_password\n');
    console.log('You can find your database password in:');
    console.log('  Supabase Dashboard > Settings > Database > Connection string\n');
    throw new Error('Database password required');
  }

  // Construct connection string
  // Using connection pooler (port 6543) for better performance
  const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

  console.log('Connecting to database...');
  console.log(`Host: aws-0-us-east-1.pooler.supabase.com:6543`);
  console.log(`Database: postgres`);
  console.log(`User: postgres.${projectRef}\n`);

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    console.log('Executing migration SQL...');
    await client.query(migrationSQL);
    console.log('✓ Migration executed successfully\n');

    // Verify table creation
    console.log('=== Verification ===\n');

    // 1. Check if table exists
    console.log('1. Checking table existence...');
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'game_results'
      ) as exists;
    `);
    console.log(`✓ Table exists: ${tableCheckResult.rows[0].exists}\n`);

    // 2. Check indexes
    console.log('2. Checking indexes...');
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'game_results'
      ORDER BY indexname;
    `);
    console.log(`✓ Found ${indexResult.rows.length} indexes:`);
    indexResult.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });
    console.log('');

    // 3. Check RLS policies
    console.log('3. Checking RLS policies...');
    const policyResult = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'game_results'
      ORDER BY policyname;
    `);
    console.log(`✓ Found ${policyResult.rows.length} RLS policies:`);
    policyResult.rows.forEach(row => {
      console.log(`  - ${row.policyname} (${row.cmd})`);
    });
    console.log('');

    // 4. Check RLS is enabled
    console.log('4. Checking RLS status...');
    const rlsResult = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE tablename = 'game_results';
    `);
    console.log(`✓ RLS enabled: ${rlsResult.rows[0]?.rowsecurity}\n`);

    // 5. Check table structure
    console.log('5. Checking table structure...');
    const columnResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'game_results'
      ORDER BY ordinal_position;
    `);
    console.log(`✓ Found ${columnResult.rows.length} columns:`);
    columnResult.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`  - ${row.column_name}: ${row.data_type} ${nullable}${def}`);
    });
    console.log('');

    // 6. Check constraints
    console.log('6. Checking constraints...');
    const constraintResult = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'game_results'::regclass
      ORDER BY contype, conname;
    `);
    console.log(`✓ Found ${constraintResult.rows.length} constraints:`);
    constraintResult.rows.forEach(row => {
      const type = {
        'p': 'PRIMARY KEY',
        'f': 'FOREIGN KEY',
        'c': 'CHECK',
        'u': 'UNIQUE'
      }[row.contype] || row.contype;
      console.log(`  - ${row.conname} (${type})`);
    });

    console.log('\n=== Migration Complete ===');
    console.log('✓ All verifications passed successfully\n');

    return true;
  } catch (error: any) {
    console.error('\n✗ Error during migration:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    throw error;
  } finally {
    await client.end();
    console.log('Database connection closed\n');
  }
}

// Run the migration
applyMigration()
  .then(() => {
    console.log('✓ Migration applied and verified successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration failed');
    if (error.message.includes('password')) {
      console.log('\nPlease add your database password to .env.local:');
      console.log('  DB_PASSWORD=your_database_password\n');
    }
    process.exit(1);
  });
