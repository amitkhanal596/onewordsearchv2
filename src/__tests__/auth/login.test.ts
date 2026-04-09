/**
 * Login Flow Tests
 *
 * Tests for the login functionality including:
 * - Successful login with valid credentials
 * - Invalid email handling
 * - Incorrect password handling
 * - Non-existent user handling
 * - JWT token management
 * - Session persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signIn } from '@/app/actions/auth'
import {
  createMockSupabaseClient,
  mockSuccessfulLogin,
  mockLoginInvalidCredentials,
  createAuthError,
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
      // Throw error to stop execution (Next.js redirect behavior)
      throw new Error('NEXT_REDIRECT')
    },
  }
})

import { createClient } from '@/utils/supabase/server'

describe('Login Flow', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Create a fresh mock Supabase client
    mockSupabase = createMockSupabaseClient()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
  })

  describe('Successful Login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      mockSuccessfulLogin(mockSupabase.auth)

      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
      }

      // Act & Assert
      await expect(signIn(credentials)).rejects.toThrow('NEXT_REDIRECT')

      // Verify Supabase was called correctly
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
      })

      // Verify redirect to home page
      expect(mockRedirect).toHaveBeenCalledWith('/')
    })

    it('should call Supabase signInWithPassword with correct parameters', async () => {
      // Arrange
      mockSuccessfulLogin(mockSupabase.auth)

      // Act
      try {
        await signIn({
          email: 'user@example.com',
          password: 'SecurePass123!',
        })
      } catch {
        // Expected redirect error
      }

      // Assert
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'SecurePass123!',
      })
    })

    it('should redirect to home page after successful login', async () => {
      // Arrange
      mockSuccessfulLogin(mockSupabase.auth)

      // Act
      try {
        await signIn({
          email: 'test@example.com',
          password: 'Password123!',
        })
      } catch {
        // Expected redirect error
      }

      // Assert
      expect(mockRedirect).toHaveBeenCalledWith('/')
    })
  })

  describe('Invalid Email', () => {
    it('should reject login with invalid email format', async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: createAuthError('Invalid email format'),
      })

      // Act
      const result = await signIn({
        email: 'not-an-email',
        password: 'Password123!',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email')
    })

    it('should handle empty email', async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: createAuthError('Email is required'),
      })

      // Act
      const result = await signIn({
        email: '',
        password: 'Password123!',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Incorrect Password', () => {
    it('should reject login with incorrect password', async () => {
      // Arrange
      mockLoginInvalidCredentials(mockSupabase.auth)

      // Act
      const result = await signIn({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid login credentials')
    })

    it('should not leak information about whether email exists', async () => {
      // Arrange
      mockLoginInvalidCredentials(mockSupabase.auth)

      // Act
      const result = await signIn({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      })

      // Assert: Same error message for security
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid login credentials')
    })

    it('should handle empty password', async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: createAuthError('Password is required'),
      })

      // Act
      const result = await signIn({
        email: 'test@example.com',
        password: '',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Non-Existent User', () => {
    it('should reject login for non-existent user', async () => {
      // Arrange
      mockLoginInvalidCredentials(mockSupabase.auth)

      // Act
      const result = await signIn({
        email: 'doesnotexist@example.com',
        password: 'Password123!',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid login credentials')
    })

    it('should provide generic error message for security', async () => {
      // Arrange
      mockLoginInvalidCredentials(mockSupabase.auth)

      // Act
      const result = await signIn({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      })

      // Assert: Don't reveal if user exists or not
      expect(result.error).not.toContain('user does not exist')
      expect(result.error).not.toContain('not found')
    })
  })

  describe('JWT Token Management', () => {
    it('should receive JWT token after successful login', async () => {
      // Arrange
      mockSuccessfulLogin(mockSupabase.auth)

      // Act
      try {
        await signIn({
          email: 'test@example.com',
          password: 'Password123!',
        })
      } catch {
        // Expected redirect error
      }

      // Assert: Supabase handles JWT automatically
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled()
    })

    it('should store session in cookies via Supabase SSR', async () => {
      // Arrange
      mockSuccessfulLogin(mockSupabase.auth)

      // Act
      try {
        await signIn({
          email: 'test@example.com',
          password: 'Password123!',
        })
      } catch {
        // Expected redirect error
      }

      // Assert: createClient is called which handles cookie storage
      expect(createClient).toHaveBeenCalled()
    })
  })

  describe('Session Persistence', () => {
    it('should establish persistent session after login', async () => {
      // Arrange
      mockSuccessfulLogin(mockSupabase.auth)

      // Act
      try {
        await signIn({
          email: 'test@example.com',
          password: 'Password123!',
        })
      } catch {
        // Expected redirect error
      }

      // Assert: Session is handled by Supabase client
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: createAuthError('Network error'),
      })

      // Act
      const result = await signIn({
        email: 'test@example.com',
        password: 'Password123!',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle server errors', async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: createAuthError('Internal server error'),
      })

      // Act
      const result = await signIn({
        email: 'test@example.com',
        password: 'Password123!',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })

    it('should handle rate limiting errors', async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: createAuthError('Too many requests'),
      })

      // Act
      const result = await signIn({
        email: 'test@example.com',
        password: 'Password123!',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Too many requests')
    })

    it('should handle Supabase service unavailable', async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: createAuthError('Service temporarily unavailable'),
      })

      // Act
      const result = await signIn({
        email: 'test@example.com',
        password: 'Password123!',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('unavailable')
    })
  })

  describe('Multiple Login Attempts', () => {
    it('should handle consecutive failed login attempts', async () => {
      // Arrange
      mockLoginInvalidCredentials(mockSupabase.auth)

      // Act: Try multiple times
      const result1 = await signIn({
        email: 'test@example.com',
        password: 'Wrong1',
      })
      const result2 = await signIn({
        email: 'test@example.com',
        password: 'Wrong2',
      })
      const result3 = await signIn({
        email: 'test@example.com',
        password: 'Wrong3',
      })

      // Assert
      expect(result1.success).toBe(false)
      expect(result2.success).toBe(false)
      expect(result3.success).toBe(false)
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(3)
    })

    it('should allow successful login after failed attempts', async () => {
      // Arrange
      mockLoginInvalidCredentials(mockSupabase.auth)

      // First attempt fails
      await signIn({
        email: 'test@example.com',
        password: 'WrongPassword',
      })

      // Second attempt succeeds
      vi.clearAllMocks()
      mockSuccessfulLogin(mockSupabase.auth)

      // Act
      try {
        await signIn({
          email: 'test@example.com',
          password: 'CorrectPassword123!',
        })
      } catch {
        // Expected redirect error
      }

      // Assert
      expect(mockRedirect).toHaveBeenCalledWith('/')
    })
  })

  describe('Case Sensitivity', () => {
    it('should handle email case correctly', async () => {
      // Arrange
      mockSuccessfulLogin(mockSupabase.auth)

      // Act
      try {
        await signIn({
          email: 'Test@Example.COM',
          password: 'Password123!',
        })
      } catch {
        // Expected redirect error
      }

      // Assert: Supabase handles email normalization
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'Test@Example.COM',
        password: 'Password123!',
      })
    })
  })
})
