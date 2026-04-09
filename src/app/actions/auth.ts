/**
 * Server Actions for Authentication
 *
 * These server actions handle all authentication operations using Supabase Auth.
 * They are called from client components and execute on the server for security.
 *
 * SECURITY PRINCIPLES:
 * - All authentication uses Supabase Auth (no custom password handling)
 * - JWT tokens are automatically managed by Supabase
 * - Sessions are stored in httpOnly cookies for XSS protection
 * - All actions validate input and return structured results
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { AuthResult, SignUpData, SignInData } from '@/types/auth'

/**
 * Sign up a new user with email and password
 *
 * Process:
 * 1. Validates input data
 * 2. Creates user via Supabase Auth
 * 3. Auto-creates profile via database trigger
 * 4. Sends confirmation email if enabled
 */
export async function signUp(data: SignUpData): Promise<AuthResult> {
  const supabase = await createClient()

  // Validate password strength
  if (data.password.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters long',
    }
  }

  // Validate username format
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username)) {
    return {
      success: false,
      error: 'Username must be 3-20 characters (letters, numbers, underscores only)',
    }
  }

  // Check if username is already taken
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', data.username)
    .maybeSingle()

  if (existingProfile) {
    return {
      success: false,
      error: 'Username is already taken',
    }
  }

  // Create user with Supabase Auth
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      // Pass username in metadata for the database trigger
      data: {
        username: data.username,
      },
      // Email confirmation settings
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (signUpError) {
    return {
      success: false,
      error: signUpError.message,
    }
  }

  if (!authData.user) {
    return {
      success: false,
      error: 'Failed to create user account',
    }
  }

  // Check if email confirmation is required
  if (authData.user.identities && authData.user.identities.length === 0) {
    return {
      success: false,
      error: 'This email is already registered. Please sign in instead.',
    }
  }

  revalidatePath('/', 'layout')

  // If email confirmation is not required, redirect to home
  // Otherwise, user will see a message about checking their email
  return {
    success: true,
    data: undefined,
  }
}

/**
 * Sign in an existing user with email and password
 *
 * Process:
 * 1. Validates credentials with Supabase Auth
 * 2. Creates session with JWT stored in httpOnly cookie
 * 3. Redirects to home page on success
 */
export async function signIn(data: SignInData): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

/**
 * Sign out the current user
 *
 * Process:
 * 1. Invalidates the current session
 * 2. Clears authentication cookies
 * 3. Redirects to login page
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * Send password reset email
 *
 * Process:
 * 1. Sends password reset email via Supabase Auth
 * 2. Email contains link to password reset page
 */
export async function sendPasswordResetEmail(email: string): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
  })

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: true,
    data: undefined,
  }
}

/**
 * Update user password (after reset)
 *
 * Process:
 * 1. Validates new password strength
 * 2. Updates password via Supabase Auth
 * 3. User must be authenticated (via reset link) to call this
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = await createClient()

  if (newPassword.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters long',
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: true,
    data: undefined,
  }
}

/**
 * Get current user session
 *
 * Returns:
 * - User object if authenticated
 * - null if not authenticated
 */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Get current user profile
 *
 * Returns:
 * - Profile object if user is authenticated and has a profile
 * - null if not authenticated or no profile exists
 */
export async function getUserProfile() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
