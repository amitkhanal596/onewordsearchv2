/**
 * Supabase Mock Utilities
 *
 * This file provides mock implementations of Supabase client methods
 * for use in tests. It allows us to test auth flows without hitting
 * the actual Supabase backend.
 */

import { vi } from 'vitest'
import type { User, Session, AuthError } from '@supabase/supabase-js'

// Mock user data
export const mockUser: User = {
  id: 'test-user-id-123',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {
    username: 'testuser',
  },
  identities: [
    {
      id: 'test-identity-id',
      user_id: 'test-user-id-123',
      identity_data: {
        email: 'test@example.com',
        sub: 'test-user-id-123',
      },
      provider: 'email',
      last_sign_in_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ] as any,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// Mock session data
export const mockSession: Session = {
  access_token: 'mock-access-token-jwt-string',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser,
}

// Mock profile data
export const mockProfile = {
  id: mockUser.id,
  username: 'testuser',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// Create a mock auth error
export const createAuthError = (message: string): AuthError => ({
  name: 'AuthError',
  message,
  status: 400,
})

// Mock Supabase Auth methods
export const createMockAuth = () => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
})

// Mock Supabase Database methods
export const createMockDatabase = () => {
  const mockChain = {
    select: vi.fn(() => mockChain),
    eq: vi.fn(() => mockChain),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(() => mockChain),
    update: vi.fn(() => mockChain),
    delete: vi.fn(() => mockChain),
  }

  return {
    from: vi.fn(() => mockChain),
  }
}

// Create a full mock Supabase client
export const createMockSupabaseClient = () => {
  const auth = createMockAuth()
  const db = createMockDatabase()

  return {
    auth,
    from: db.from,
    // Add other Supabase client methods as needed
  }
}

// Default mock implementations for common scenarios

/**
 * Mock successful signup
 */
export const mockSuccessfulSignUp = (mockAuth: ReturnType<typeof createMockAuth>) => {
  mockAuth.signUp.mockResolvedValue({
    data: {
      user: mockUser,
      session: mockSession,
    },
    error: null,
  })
}

/**
 * Mock signup with existing email
 */
export const mockSignUpExistingEmail = (mockAuth: ReturnType<typeof createMockAuth>) => {
  mockAuth.signUp.mockResolvedValue({
    data: {
      user: { ...mockUser, identities: [] },
      session: null,
    },
    error: null,
  })
}

/**
 * Mock signup with error
 */
export const mockSignUpError = (
  mockAuth: ReturnType<typeof createMockAuth>,
  message: string = 'Signup failed'
) => {
  mockAuth.signUp.mockResolvedValue({
    data: {
      user: null,
      session: null,
    },
    error: createAuthError(message),
  })
}

/**
 * Mock successful login
 */
export const mockSuccessfulLogin = (mockAuth: ReturnType<typeof createMockAuth>) => {
  mockAuth.signInWithPassword.mockResolvedValue({
    data: {
      user: mockUser,
      session: mockSession,
    },
    error: null,
  })
}

/**
 * Mock login with invalid credentials
 */
export const mockLoginInvalidCredentials = (mockAuth: ReturnType<typeof createMockAuth>) => {
  mockAuth.signInWithPassword.mockResolvedValue({
    data: {
      user: null,
      session: null,
    },
    error: createAuthError('Invalid login credentials'),
  })
}

/**
 * Mock authenticated user
 */
export const mockAuthenticatedUser = (mockAuth: ReturnType<typeof createMockAuth>) => {
  mockAuth.getUser.mockResolvedValue({
    data: {
      user: mockUser,
    },
    error: null,
  })

  mockAuth.getSession.mockResolvedValue({
    data: {
      session: mockSession,
    },
    error: null,
  })
}

/**
 * Mock unauthenticated user
 */
export const mockUnauthenticatedUser = (mockAuth: ReturnType<typeof createMockAuth>) => {
  mockAuth.getUser.mockResolvedValue({
    data: {
      user: null,
    },
    error: null,
  })

  mockAuth.getSession.mockResolvedValue({
    data: {
      session: null,
    },
    error: null,
  })
}

/**
 * Mock successful logout
 */
export const mockSuccessfulLogout = (mockAuth: ReturnType<typeof createMockAuth>) => {
  mockAuth.signOut.mockResolvedValue({
    error: null,
  })
}

/**
 * Mock profile exists in database
 */
export const mockProfileExists = (mockSupabase: ReturnType<typeof createMockSupabaseClient>) => {
  // Reset the from mock to ensure fresh setup
  ;(mockSupabase.from as any).mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: mockProfile,
      error: null,
    }),
  })
}

/**
 * Mock profile does not exist
 */
export const mockProfileNotExists = (mockSupabase: ReturnType<typeof createMockSupabaseClient>) => {
  // Reset the from mock to ensure fresh setup
  ;(mockSupabase.from as any).mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  })
}

/**
 * Create a mock JWT token
 * Note: This is a simple mock and not a real JWT
 */
export const createMockJWT = (userId: string = mockUser.id, expiresIn: number = 3600) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email: mockUser.email,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
      iat: Math.floor(Date.now() / 1000),
      role: 'authenticated',
    })
  ).toString('base64')
  const signature = 'mock-signature'

  return `${header}.${payload}.${signature}`
}

/**
 * Create an expired mock JWT token
 */
export const createExpiredMockJWT = (userId: string = mockUser.id) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email: mockUser.email,
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      iat: Math.floor(Date.now() / 1000) - 7200,
      role: 'authenticated',
    })
  ).toString('base64')
  const signature = 'mock-signature'

  return `${header}.${payload}.${signature}`
}

/**
 * Create a malformed JWT token
 */
export const createMalformedJWT = () => {
  return 'not.a.valid.jwt.token'
}
