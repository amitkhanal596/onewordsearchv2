/**
 * Authentication Types
 *
 * Type definitions for authentication-related data structures.
 */

import { User, Session } from '@supabase/supabase-js'

// Database profile type
export interface Profile {
  id: string
  username: string
  created_at: string
  updated_at: string
}

// Extended user type with profile
export interface UserWithProfile {
  user: User
  profile: Profile | null
}

// Auth state type
export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
}

// Form validation errors
export interface FormErrors {
  username?: string
  email?: string
  confirmEmail?: string
  password?: string
  confirmPassword?: string
  general?: string
}

// Sign up form data
export interface SignUpData {
  email: string
  password: string
  username: string
}

// Sign in form data
export interface SignInData {
  email: string
  password: string
}

// Password reset form data
export interface PasswordResetData {
  email: string
}

// Update password form data
export interface UpdatePasswordData {
  password: string
}

// Auth action result
export type AuthResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
