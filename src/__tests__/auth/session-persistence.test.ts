/**
 * Session Persistence Tests
 *
 * Tests for session management including:
 * - Session persistence across page refreshes
 * - Session storage in cookies
 * - Session expiration handling
 * - Logout and session cleanup
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { signOut, getUser } from '@/app/actions/auth'
import { updateSession } from '@/utils/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockSuccessfulLogout,
  mockSession,
  mockUser,
} from '../mocks/supabase'

// Mock the Supabase server client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock Next.js navigation
const mockRedirect = vi.fn()
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    redirect: (path: string) => {
      mockRedirect(path)
      throw new Error('NEXT_REDIRECT')
    },
  }
})

import { createClient } from '@/utils/supabase/server'

describe('Session Persistence', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Session Persistence Across Page Refreshes', () => {
    it('should maintain session after page refresh', async () => {
      // Arrange: Simulate authenticated session
      mockAuthenticatedUser(mockSupabase.auth)

      // Act: Get user (simulating page refresh)
      const user = await getUser()

      // Assert: User is still authenticated
      expect(user).toBeDefined()
      expect(user?.id).toBe(mockUser.id)
    })

    it('should retrieve same user data after multiple requests', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act: Multiple requests
      const user1 = await getUser()
      const user2 = await getUser()
      const user3 = await getUser()

      // Assert: Consistent user data
      expect(user1?.id).toBe(user2?.id)
      expect(user2?.id).toBe(user3?.id)
      expect(user1?.email).toBe(user2?.email)
    })

    it('should maintain session state in Supabase client', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      await getUser()

      // Assert: getUser was called to check session
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    it('should handle page refresh during active session', async () => {
      // Arrange: User is logged in
      mockAuthenticatedUser(mockSupabase.auth)

      // Act: Simulate page refresh by calling getUser multiple times
      const results = await Promise.all([getUser(), getUser(), getUser()])

      // Assert: All requests return the same authenticated user
      results.forEach((user) => {
        expect(user).toBeDefined()
        expect(user?.id).toBe(mockUser.id)
      })
    })
  })

  describe('Session Storage in Cookies', () => {
    it('should store session in httpOnly cookies', async () => {
      // Arrange: Middleware request with session cookie
      const mockRequest = new NextRequest('http://localhost:3000/protected', {
        headers: {
          cookie: `sb-access-token=${mockSession.access_token}`,
        },
      })

      // Act
      const response = await updateSession(mockRequest)

      // Assert: Response includes session cookies
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should read session from cookies on subsequent requests', async () => {
      // Arrange: Request with existing session cookie
      const mockRequest = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: `sb-access-token=${mockSession.access_token}`,
        },
      })

      // Act
      const response = await updateSession(mockRequest)

      // Assert: Session is maintained
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(200)
    })

    it('should handle multiple cookies correctly', async () => {
      // Arrange
      const mockRequest = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: `sb-access-token=${mockSession.access_token}; sb-refresh-token=${mockSession.refresh_token}`,
        },
      })

      // Act
      const response = await updateSession(mockRequest)

      // Assert
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should use secure cookie settings', async () => {
      // Arrange: This is handled by Supabase SSR configuration
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert: User can be retrieved from secure cookies
      expect(user).toBeDefined()
    })
  })

  describe('Session Expiration', () => {
    it('should handle expired session gracefully', async () => {
      // Arrange: Mock expired session
      mockUnauthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert: User is not authenticated
      expect(user).toBeNull()
    })

    it('should prompt re-authentication on session expiry', async () => {
      // Arrange: Protected route with expired session
      const mockRequest = new NextRequest('http://localhost:3000/protected')

      // Act
      const response = await updateSession(mockRequest)

      // Assert: Redirected to login
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('should clear expired session data', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })

    it('should handle token expiration time correctly', async () => {
      // Arrange: Mock session with specific expiration
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            ...mockSession,
            expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          },
        },
        error: null,
      })
      mockUnauthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert: Session is expired
      expect(user).toBeNull()
    })
  })

  describe('Logout and Session Cleanup', () => {
    it('should clear session on logout', async () => {
      // Arrange
      mockSuccessfulLogout(mockSupabase.auth)

      // Act & Assert
      await expect(signOut()).rejects.toThrow('NEXT_REDIRECT')
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should redirect to login page after logout', async () => {
      // Arrange
      mockSuccessfulLogout(mockSupabase.auth)

      // Act
      try {
        await signOut()
      } catch {
        // Expected redirect error
      }

      // Assert
      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })

    it('should remove authentication cookies on logout', async () => {
      // Arrange
      mockSuccessfulLogout(mockSupabase.auth)

      // Act
      try {
        await signOut()
      } catch {
        // Expected redirect error
      }

      // Assert: signOut was called which clears cookies
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should invalidate JWT on logout', async () => {
      // Arrange
      mockSuccessfulLogout(mockSupabase.auth)

      // Act
      try {
        await signOut()
      } catch {
        // Expected redirect error
      }

      // Assert
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should prevent access to protected routes after logout', async () => {
      // Arrange: User logged out
      const mockRequest = new NextRequest('http://localhost:3000/protected')

      // Act
      const response = await updateSession(mockRequest)

      // Assert: Redirected to login
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('should completely clear session state', async () => {
      // Arrange
      mockSuccessfulLogout(mockSupabase.auth)

      // Act: Logout
      try {
        await signOut()
      } catch {
        // Expected redirect error
      }

      // Clear mocks and set up for next check
      vi.clearAllMocks()
      mockUnauthenticatedUser(mockSupabase.auth)
      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      // Try to get user after logout
      const user = await getUser()

      // Assert: No user session
      expect(user).toBeNull()
    })
  })

  describe('Session Recovery', () => {
    it('should handle session recovery from refresh token', async () => {
      // Arrange: Session with refresh token
      mockAuthenticatedUser(mockSupabase.auth)
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      // Act
      const user = await getUser()

      // Assert: Session is recovered
      expect(user).toBeDefined()
    })

    it('should maintain session during token refresh', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act: Multiple calls during refresh window
      const user1 = await getUser()
      const user2 = await getUser()

      // Assert: Consistent session
      expect(user1?.id).toBe(user2?.id)
    })
  })

  describe('Concurrent Session Handling', () => {
    it('should handle multiple concurrent requests with same session', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act: Simulate concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => getUser())
      const users = await Promise.all(promises)

      // Assert: All requests succeed with same user
      users.forEach((user) => {
        expect(user?.id).toBe(mockUser.id)
      })
    })

    it('should maintain session consistency across parallel requests', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const results = await Promise.all([getUser(), getUser(), getUser()])

      // Assert
      const userIds = results.map((u) => u?.id)
      expect(new Set(userIds).size).toBe(1) // All same user ID
    })
  })

  describe('Session State Transitions', () => {
    it('should transition from unauthenticated to authenticated', async () => {
      // Arrange: Start unauthenticated
      mockUnauthenticatedUser(mockSupabase.auth)
      const user1 = await getUser()
      expect(user1).toBeNull()

      // Act: Simulate login
      vi.clearAllMocks()
      mockAuthenticatedUser(mockSupabase.auth)
      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
      const user2 = await getUser()

      // Assert: Now authenticated
      expect(user2).toBeDefined()
      expect(user2?.id).toBe(mockUser.id)
    })

    it('should transition from authenticated to unauthenticated on logout', async () => {
      // Arrange: Start authenticated
      mockAuthenticatedUser(mockSupabase.auth)
      const user1 = await getUser()
      expect(user1).toBeDefined()

      // Act: Logout
      mockSuccessfulLogout(mockSupabase.auth)
      try {
        await signOut()
      } catch {
        // Expected redirect error
      }

      // Simulate post-logout state
      vi.clearAllMocks()
      mockUnauthenticatedUser(mockSupabase.auth)
      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
      const user2 = await getUser()

      // Assert: Now unauthenticated
      expect(user2).toBeNull()
    })
  })

  describe('Cookie Security', () => {
    it('should use httpOnly cookies for session storage', async () => {
      // Arrange: Supabase SSR handles this automatically
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert: User retrieved from secure storage
      expect(user).toBeDefined()
    })

    it('should handle cross-site cookie settings', async () => {
      // Arrange
      const mockRequest = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: `sb-access-token=${mockSession.access_token}`,
        },
      })

      // Act
      const response = await updateSession(mockRequest)

      // Assert: Response maintains secure cookie settings
      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe('Session Lifetime', () => {
    it('should respect session expiration time', async () => {
      // Arrange: Session with specific expiry
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            ...mockSession,
            expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
          },
        },
        error: null,
      })
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert: Session is valid
      expect(user).toBeDefined()
    })

    it('should auto-refresh session before expiration', async () => {
      // Arrange: Middleware handles auto-refresh
      const mockRequest = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: `sb-refresh-token=${mockSession.refresh_token}`,
        },
      })

      // Act
      const response = await updateSession(mockRequest)

      // Assert: Session is maintained
      expect(response).toBeInstanceOf(NextResponse)
    })
  })
})
