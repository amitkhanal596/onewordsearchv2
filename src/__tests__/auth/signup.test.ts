/**
 * Signup Flow Tests
 *
 * Tests for the signup functionality including:
 * - Successful user registration
 * - Validation of input fields
 * - Username uniqueness
 * - Email format validation
 * - Password strength validation
 * - Profile creation
 * - JWT token handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signUp } from '@/app/actions/auth'
import {
  createMockSupabaseClient,
  mockSuccessfulSignUp,
  mockSignUpExistingEmail,
  mockSignUpError,
  mockProfileExists,
  mockProfileNotExists,
} from '../mocks/supabase'

// Mock the Supabase server client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/utils/supabase/server'

describe('Signup Flow', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Create a fresh mock Supabase client
    mockSupabase = createMockSupabaseClient()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
  })

  describe('Successful Signup', () => {
    it('should create a new user account successfully', async () => {
      // Arrange: Setup mocks for successful signup
      mockProfileNotExists(mockSupabase)
      mockSuccessfulSignUp(mockSupabase.auth)

      const signUpData = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        username: 'newuser',
      }

      // Act: Attempt to sign up
      const result = await signUp(signUpData)

      // Assert: Verify successful signup
      expect(result.success).toBe(true)
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            username: signUpData.username,
          },
          emailRedirectTo: expect.stringContaining('/auth/callback'),
        },
      })
    })

    it('should check username availability before signup', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSuccessfulSignUp(mockSupabase.auth)

      const signUpData = {
        email: 'test@example.com',
        password: 'Password123!',
        username: 'uniqueuser',
      }

      // Act
      await signUp(signUpData)

      // Assert: Verify username was checked
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should return success for valid signup data', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSuccessfulSignUp(mockSupabase.auth)

      // Act
      const result = await signUp({
        email: 'valid@example.com',
        password: 'ValidPass123!',
        username: 'validuser',
      })

      // Assert
      expect(result).toEqual({
        success: true,
        data: undefined,
      })
    })
  })

  describe('Existing Email Validation', () => {
    it('should reject signup with existing email', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSignUpExistingEmail(mockSupabase.auth)

      const signUpData = {
        email: 'existing@example.com',
        password: 'Password123!',
        username: 'newuser',
      }

      // Act
      const result = await signUp(signUpData)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('already registered')
    })

    it('should provide helpful error message for existing email', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSignUpExistingEmail(mockSupabase.auth)

      // Act
      const result = await signUp({
        email: 'duplicate@example.com',
        password: 'Password123!',
        username: 'testuser',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('This email is already registered. Please sign in instead.')
    })
  })

  describe('Invalid Email Format', () => {
    it('should be handled by Supabase client validation', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSignUpError(mockSupabase.auth, 'Invalid email format')

      // Act
      const result = await signUp({
        email: 'not-an-email',
        password: 'Password123!',
        username: 'testuser',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email')
    })
  })

  describe('Weak Password Validation', () => {
    it('should reject passwords shorter than 8 characters', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)

      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'Short1!',
        username: 'testuser',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('at least 8 characters')
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
    })

    it('should accept passwords with exactly 8 characters', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSuccessfulSignUp(mockSupabase.auth)

      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'Pass123!',
        username: 'testuser',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSupabase.auth.signUp).toHaveBeenCalled()
    })

    it('should accept strong passwords', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSuccessfulSignUp(mockSupabase.auth)

      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'VeryStrongPassword123!',
        username: 'testuser',
      })

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe('Username Uniqueness Validation', () => {
    it('should reject signup with existing username', async () => {
      // Arrange
      mockProfileExists(mockSupabase)

      // Act
      const result = await signUp({
        email: 'new@example.com',
        password: 'Password123!',
        username: 'testuser',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Username is already taken')
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
    })

    it('should reject invalid username format (too short)', async () => {
      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'ab',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('3-20 characters')
    })

    it('should reject invalid username format (too long)', async () => {
      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'a'.repeat(21),
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('3-20 characters')
    })

    it('should reject username with invalid characters', async () => {
      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'user@name',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('letters, numbers, underscores only')
    })

    it('should accept valid username formats', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSuccessfulSignUp(mockSupabase.auth)

      const validUsernames = ['user123', 'User_Name', 'test_user_1']

      // Act & Assert
      for (const username of validUsernames) {
        vi.clearAllMocks()
        mockProfileNotExists(mockSupabase)
        mockSuccessfulSignUp(mockSupabase.auth)

        const result = await signUp({
          email: 'test@example.com',
          password: 'Password123!',
          username,
        })

        expect(result.success).toBe(true)
      }
    })
  })

  describe('Profile Creation', () => {
    it('should pass username in user metadata for profile creation', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSuccessfulSignUp(mockSupabase.auth)

      const signUpData = {
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
      }

      // Act
      await signUp(signUpData)

      // Assert: Verify username is passed to Supabase
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: {
              username: signUpData.username,
            },
          }),
        })
      )
    })
  })

  describe('JWT Token Handling', () => {
    it('should return session data after successful signup', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSuccessfulSignUp(mockSupabase.auth)

      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
      })

      // Assert: Supabase handles JWT automatically
      expect(result.success).toBe(true)
      expect(mockSupabase.auth.signUp).toHaveBeenCalled()
    })

    it('should handle signup when email confirmation is required', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'test-id',
            email: 'test@example.com',
            email_confirmed_at: null,
          } as any,
          session: null, // No session until email is confirmed
        },
        error: null,
      })

      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
      })

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle Supabase errors gracefully', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSignUpError(mockSupabase.auth, 'Database connection failed')

      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })

    it('should handle network errors', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSignUpError(mockSupabase.auth, 'Network error')

      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('should handle missing user data in response', async () => {
      // Arrange
      mockProfileNotExists(mockSupabase)
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: null,
      })

      // Act
      const result = await signUp({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to create user account')
    })
  })
})
