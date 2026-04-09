/**
 * Next.js Middleware for Authentication
 *
 * This middleware runs on every request and handles:
 * 1. JWT token refresh to keep sessions alive
 * 2. Route protection for authenticated-only pages
 * 3. Redirects for authenticated users trying to access login page
 *
 * IMPORTANT: This middleware is essential for maintaining stateless authentication.
 * It ensures that JWT tokens are refreshed before they expire and validates
 * user sessions on every request.
 */

import { updateSession } from '@/utils/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
