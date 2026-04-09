/**
 * Supabase Admin Client
 *
 * This client is used for server-side operations that run outside of request context
 * (like CLI scripts, cron jobs, etc.). It bypasses Row Level Security.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local (for CLI scripts)
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  dotenv.config({ path: envPath });
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY - Required for admin operations');
}

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
