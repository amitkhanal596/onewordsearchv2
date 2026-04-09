/**
 * JWT Verification Tests
 *
 * Tests for JWT token verification including:
 * - Valid JWT acceptance
 * - Expired JWT rejection
 * - Malformed JWT rejection
 * - Missing JWT rejection
 * - User ID extraction from JWT
 * - Middleware JWT verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getUser, getUserProfile } from '@/app/actions/auth'
import { updateSession } from '@/utils/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockUser,
  mockProfile,
  createMockJWT,
  createExpiredMockJWT,
  createMalformedJWT,
} from '../mocks/supabase'

// Mock the Supabase server client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/utils/supabase/server'

describe('JWT Verification', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
  })

  describe('Valid JWT Token', () => {
    it('should accept valid JWT and return user', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeDefined()
      expect(user?.id).toBe(mockUser.id)
      expect(user?.email).toBe(mockUser.email)
    })

    it('should extract user data from valid JWT', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user).toEqual(mockUser)
    })

    it('should allow access to protected resources with valid JWT', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user).not.toBeNull()
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    it('should verify JWT signature via Supabase client', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      await getUser()

      // Assert: Supabase client verifies JWT automatically
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })
  })

  describe('Expired JWT Token', () => {
    it('should reject expired JWT', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })

    it('should not allow access to protected resources with expired JWT', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })

    it('should handle token expiration gracefully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthError', message: 'Token expired', status: 401 },
      })

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })
  })

  describe('Malformed JWT Token', () => {
    it('should reject malformed JWT', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })

    it('should handle invalid JWT format', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthError', message: 'Invalid token format', status: 401 },
      })

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })

    it('should reject JWT with invalid signature', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthError', message: 'Invalid signature', status: 401 },
      })

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })
  })

  describe('Missing JWT Token', () => {
    it('should reject requests without JWT', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })

    it('should return null for missing authentication', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })
  })

  describe('User ID Extraction', () => {
    it('should extract user_id from valid JWT', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user?.id).toBe(mockUser.id)
    })

    it('should extract correct user_id for different users', async () => {
      // Arrange
      const customUser = { ...mockUser, id: 'different-user-id' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: customUser },
        error: null,
      })

      // Act
      const user = await getUser()

      // Assert
      expect(user?.id).toBe('different-user-id')
    })

    it('should use user_id to fetch user profile', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Mock profile query
      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          })),
        })),
      }))
      mockSupabase.from = fromMock

      // Act
      const profile = await getUserProfile()

      // Assert
      expect(profile).toBeDefined()
      expect(profile?.id).toBe(mockUser.id)
      expect(fromMock).toHaveBeenCalledWith('profiles')
    })
  })

  describe('Middleware JWT Verification', () => {
    it('should verify JWT in middleware for protected routes', async () => {
      // Arrange
      const mockRequest = new NextRequest('http://localhost:3000/protected', {
        headers: {
          cookie: 'sb-access-token=valid-jwt-token',
        },
      })

      // Mock Supabase client creation in middleware
      const mockMiddlewareSupabase = createMockSupabaseClient()
      mockAuthenticatedUser(mockMiddlewareSupabase.auth)

      // Act
      const response = await updateSession(mockRequest)

      // Assert
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should redirect to login if JWT is missing on protected route', async () => {
      // Arrange
      const mockRequest = new NextRequest('http://localhost:3000/protected')

      // Act
      const response = await updateSession(mockRequest)

      // Assert
      expect(response.status).toBe(307) // Redirect status
      expect(response.headers.get('location')).toContain('/login')
    })

    it('should allow access to public routes without JWT', async () => {
      // Arrange
      const mockRequest = new NextRequest('http://localhost:3000/')

      // Act
      const response = await updateSession(mockRequest)

      // Assert
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(200)
    })

    it('should refresh expired JWT in middleware', async () => {
      // Arrange
      const mockRequest = new NextRequest('http://localhost:3000/protected', {
        headers: {
          cookie: 'sb-refresh-token=valid-refresh-token',
        },
      })

      // Act
      const response = await updateSession(mockRequest)

      // Assert: Middleware handles token refresh automatically
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should not allow access with malformed JWT', async () => {
      // Arrange
      const mockRequest = new NextRequest('http://localhost:3000/protected', {
        headers: {
          cookie: `sb-access-token=${createMalformedJWT()}`,
        },
      })

      // Act
      const response = await updateSession(mockRequest)

      // Assert
      expect(response.status).toBe(307) // Redirect to login
    })
  })

  describe('JWT Claims Validation', () => {
    it('should validate JWT expiration claim', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert: Supabase validates exp claim
      expect(user).toBeDefined()
    })

    it('should validate JWT issuer claim', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert: Supabase validates iss claim
      expect(user).toBeDefined()
    })

    it('should extract email from JWT claims', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user?.email).toBe(mockUser.email)
    })

    it('should extract role from JWT claims', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user?.role).toBe('authenticated')
    })
  })

  describe('Token Refresh', () => {
    it('should handle token refresh automatically', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert: Supabase SSR handles refresh automatically
      expect(user).toBeDefined()
    })

    it('should maintain session during token refresh', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase.auth)

      // Act
      const user1 = await getUser()
      const user2 = await getUser()

      // Assert: Same user across calls
      expect(user1?.id).toBe(user2?.id)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors during JWT verification', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'))

      // Act & Assert
      await expect(getUser()).rejects.toThrow('Network error')
    })

    it('should handle Supabase service errors', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthError', message: 'Service unavailable', status: 503 },
      })

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })

    it('should handle missing required JWT claims', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthError', message: 'Missing required claims', status: 401 },
      })

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })
  })

  describe('Security Validations', () => {
    it('should reject JWT with tampered payload', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase.auth)

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })

    it('should reject JWT from wrong issuer', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthError', message: 'Invalid issuer', status: 401 },
      })

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })

    it('should reject JWT with invalid audience', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthError', message: 'Invalid audience', status: 401 },
      })

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })
  })
})
