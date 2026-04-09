/**
 * Authentication Verification Utilities
 *
 * Provides flexible authentication that works with both:
 * - Cookie-based sessions (production)
 * - Bearer tokens (testing/API clients)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createBrowserClient, SupabaseClient } from '@supabase/supabase-js';

export interface AuthResult {
  user: {
    id: string;
    email?: string;
  } | null;
  error: Error | null;
  supabase: SupabaseClient | undefined;
}

/**
 * Verify user authentication from either cookies or Authorization header
 *
 * This supports both production (cookie-based) and testing (Bearer token) scenarios.
 * Returns a Supabase client configured with the user's authentication context.
 *
 * @param request - Next.js request object
 * @returns User object and authenticated Supabase client if authenticated, null otherwise
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  // First, try Authorization header (for API clients and integration tests)
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Create a client with the provided token
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );

      // Verify the token by getting the user
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return { user: null, error: error || new Error('Invalid token'), supabase: undefined };
      }

      return { user, error: null, supabase };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error : new Error('Token verification failed'),
        supabase: undefined
      };
    }
  }

  // Fall back to cookie-based authentication (production)
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, error: error || new Error('Not authenticated'), supabase: undefined };
    }

    return { user, error: null, supabase };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error('Authentication failed'),
      supabase: undefined
    };
  }
}
