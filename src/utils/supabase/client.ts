/**
 * Supabase Client for Client Components
 *
 * This client is used in React Client Components (components with "use client" directive).
 * It uses browser-based storage for session management.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
