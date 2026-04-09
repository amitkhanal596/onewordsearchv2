/**
 * Client-side Form Validation Utilities
 *
 * These functions validate user input before submission to prevent
 * unnecessary server requests and provide immediate feedback.
 */

import type { FormErrors } from '@/types/auth'

/**
 * Validate email format
 */
export function validateEmail(email: string): string | undefined {
  if (!email) {
    return 'Email is required'
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }

  return undefined
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required'
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long'
  }

  // Optional: Add more strength requirements
  // Uncomment if you want to enforce stronger passwords
  /*
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number'
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character'
  }
  */

  return undefined
}

/**
 * Validate username format
 */
export function validateUsername(username: string): string | undefined {
  if (!username) {
    return 'Username is required'
  }

  if (username.length < 3) {
    return 'Username must be at least 3 characters long'
  }

  if (username.length > 20) {
    return 'Username must be no more than 20 characters long'
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores'
  }

  return undefined
}

/**
 * Validate registration form
 */
export function validateRegistrationForm(
  username: string,
  email: string,
  confirmEmail: string,
  password: string,
  confirmPassword: string
): FormErrors {
  const errors: FormErrors = {}

  // Validate username
  const usernameError = validateUsername(username)
  if (usernameError) {
    errors.username = usernameError
  }

  // Validate email
  const emailError = validateEmail(email)
  if (emailError) {
    errors.email = emailError
  }

  // Validate email confirmation
  if (!confirmEmail) {
    errors.confirmEmail = 'Please confirm your email'
  } else if (email !== confirmEmail) {
    errors.confirmEmail = 'Email addresses do not match'
  }

  // Validate password
  const passwordError = validatePassword(password)
  if (passwordError) {
    errors.password = passwordError
  }

  // Validate password confirmation
  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return errors
}

/**
 * Validate login form
 */
export function validateLoginForm(email: string, password: string): FormErrors {
  const errors: FormErrors = {}

  // Validate email
  const emailError = validateEmail(email)
  if (emailError) {
    errors.email = emailError
  }

  // Validate password (just check if it exists for login)
  if (!password) {
    errors.password = 'Password is required'
  }

  return errors
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0
}
