/**
 * Validation Utilities Tests
 *
 * Tests for client-side validation functions including:
 * - Email format validation
 * - Password strength validation
 * - Username format validation
 * - Form validation
 */

import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateRegistrationForm,
  validateLoginForm,
  hasErrors,
} from '@/utils/auth/validation'

describe('Validation Utilities', () => {
  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        'user123@test-domain.com',
        'first.last@sub.domain.com',
      ]

      validEmails.forEach((email) => {
        expect(validateEmail(email)).toBeUndefined()
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'user@@example.com',
      ]

      invalidEmails.forEach((email) => {
        expect(validateEmail(email)).toBeDefined()
      })
    })

    it('should reject empty email', () => {
      expect(validateEmail('')).toBe('Email is required')
    })

    it('should provide helpful error messages', () => {
      expect(validateEmail('invalid')).toContain('valid email')
      expect(validateEmail('')).toContain('required')
    })
  })

  describe('Password Validation', () => {
    it('should accept passwords with 8 or more characters', () => {
      const validPasswords = [
        'password',
        'Password123',
        'VeryStrongPassword!',
        '12345678',
        'a'.repeat(100),
      ]

      validPasswords.forEach((password) => {
        expect(validatePassword(password)).toBeUndefined()
      })
    })

    it('should reject passwords shorter than 8 characters', () => {
      const shortPasswords = ['pass', '1234567', 'Short1!', 'a'.repeat(7)]

      shortPasswords.forEach((password) => {
        const error = validatePassword(password)
        expect(error).toBeDefined()
        expect(error).toContain('at least 8 characters')
      })
    })

    it('should reject empty password', () => {
      expect(validatePassword('')).toBe('Password is required')
    })

    it('should accept exactly 8 characters', () => {
      expect(validatePassword('12345678')).toBeUndefined()
    })

    it('should accept special characters in password', () => {
      expect(validatePassword('Pass@123!')).toBeUndefined()
      expect(validatePassword('P@$$w0rd')).toBeUndefined()
    })
  })

  describe('Username Validation', () => {
    it('should accept valid usernames', () => {
      const validUsernames = [
        'user',
        'user123',
        'User_Name',
        'test_user_123',
        'USERNAME',
        'a'.repeat(20), // Max length
      ]

      validUsernames.forEach((username) => {
        expect(validateUsername(username)).toBeUndefined()
      })
    })

    it('should reject usernames shorter than 3 characters', () => {
      const shortUsernames = ['ab', 'a', 'x1']

      shortUsernames.forEach((username) => {
        const error = validateUsername(username)
        expect(error).toBeDefined()
        expect(error).toContain('at least 3 characters')
      })
    })

    it('should reject usernames longer than 20 characters', () => {
      const longUsername = 'a'.repeat(21)
      const error = validateUsername(longUsername)
      expect(error).toBeDefined()
      expect(error).toContain('no more than 20 characters')
    })

    it('should reject usernames with invalid characters', () => {
      const invalidUsernames = [
        'user@name',
        'user name',
        'user-name',
        'user!',
        'user#123',
        'user.name',
      ]

      invalidUsernames.forEach((username) => {
        const error = validateUsername(username)
        expect(error).toBeDefined()
        expect(error).toContain('letters, numbers, and underscores')
      })
    })

    it('should accept underscores in username', () => {
      expect(validateUsername('user_name')).toBeUndefined()
      expect(validateUsername('_username_')).toBeUndefined()
    })

    it('should reject empty username', () => {
      expect(validateUsername('')).toBe('Username is required')
    })

    it('should accept exactly 3 characters', () => {
      expect(validateUsername('abc')).toBeUndefined()
    })

    it('should accept exactly 20 characters', () => {
      expect(validateUsername('a'.repeat(20))).toBeUndefined()
    })
  })

  describe('Registration Form Validation', () => {
    it('should validate complete registration form successfully', () => {
      const errors = validateRegistrationForm(
        'testuser',
        'test@example.com',
        'test@example.com',
        'Password123!',
        'Password123!'
      )

      expect(hasErrors(errors)).toBe(false)
      expect(Object.keys(errors).length).toBe(0)
    })

    it('should detect username errors', () => {
      const errors = validateRegistrationForm(
        'ab', // Too short
        'test@example.com',
        'test@example.com',
        'Password123!',
        'Password123!'
      )

      expect(errors.username).toBeDefined()
      expect(errors.username).toContain('at least 3 characters')
    })

    it('should detect email errors', () => {
      const errors = validateRegistrationForm(
        'testuser',
        'invalid-email',
        'invalid-email',
        'Password123!',
        'Password123!'
      )

      expect(errors.email).toBeDefined()
      expect(errors.email).toContain('valid email')
    })

    it('should detect email mismatch', () => {
      const errors = validateRegistrationForm(
        'testuser',
        'test@example.com',
        'different@example.com',
        'Password123!',
        'Password123!'
      )

      expect(errors.confirmEmail).toBeDefined()
      expect(errors.confirmEmail).toContain('do not match')
    })

    it('should detect missing email confirmation', () => {
      const errors = validateRegistrationForm(
        'testuser',
        'test@example.com',
        '',
        'Password123!',
        'Password123!'
      )

      expect(errors.confirmEmail).toBeDefined()
      expect(errors.confirmEmail).toContain('confirm your email')
    })

    it('should detect password errors', () => {
      const errors = validateRegistrationForm(
        'testuser',
        'test@example.com',
        'test@example.com',
        'short',
        'short'
      )

      expect(errors.password).toBeDefined()
      expect(errors.password).toContain('at least 8 characters')
    })

    it('should detect password mismatch', () => {
      const errors = validateRegistrationForm(
        'testuser',
        'test@example.com',
        'test@example.com',
        'Password123!',
        'DifferentPassword123!'
      )

      expect(errors.confirmPassword).toBeDefined()
      expect(errors.confirmPassword).toContain('do not match')
    })

    it('should detect missing password confirmation', () => {
      const errors = validateRegistrationForm(
        'testuser',
        'test@example.com',
        'test@example.com',
        'Password123!',
        ''
      )

      expect(errors.confirmPassword).toBeDefined()
      expect(errors.confirmPassword).toContain('confirm your password')
    })

    it('should detect multiple errors simultaneously', () => {
      const errors = validateRegistrationForm(
        'ab', // Invalid username
        'invalid', // Invalid email
        'different', // Email mismatch
        'short', // Invalid password
        'wrong' // Password mismatch
      )

      expect(errors.username).toBeDefined()
      expect(errors.email).toBeDefined()
      expect(errors.confirmEmail).toBeDefined()
      expect(errors.password).toBeDefined()
      expect(errors.confirmPassword).toBeDefined()
    })

    it('should handle all empty fields', () => {
      const errors = validateRegistrationForm('', '', '', '', '')

      expect(errors.username).toBe('Username is required')
      expect(errors.email).toBe('Email is required')
      expect(errors.confirmEmail).toBe('Please confirm your email')
      expect(errors.password).toBe('Password is required')
      expect(errors.confirmPassword).toBe('Please confirm your password')
    })
  })

  describe('Login Form Validation', () => {
    it('should validate complete login form successfully', () => {
      const errors = validateLoginForm('test@example.com', 'Password123!')

      expect(hasErrors(errors)).toBe(false)
      expect(Object.keys(errors).length).toBe(0)
    })

    it('should detect invalid email', () => {
      const errors = validateLoginForm('invalid-email', 'Password123!')

      expect(errors.email).toBeDefined()
      expect(errors.email).toContain('valid email')
    })

    it('should detect missing email', () => {
      const errors = validateLoginForm('', 'Password123!')

      expect(errors.email).toBe('Email is required')
    })

    it('should detect missing password', () => {
      const errors = validateLoginForm('test@example.com', '')

      expect(errors.password).toBe('Password is required')
    })

    it('should not validate password strength on login', () => {
      // Login should accept any password format
      const errors = validateLoginForm('test@example.com', 'short')

      expect(errors.password).toBeUndefined()
    })

    it('should detect both missing fields', () => {
      const errors = validateLoginForm('', '')

      expect(errors.email).toBe('Email is required')
      expect(errors.password).toBe('Password is required')
    })

    it('should accept any password length for login', () => {
      const errors = validateLoginForm('test@example.com', '123')

      expect(errors.password).toBeUndefined()
    })
  })

  describe('hasErrors Helper', () => {
    it('should return true when errors exist', () => {
      const errors = { email: 'Invalid email', password: 'Invalid password' }
      expect(hasErrors(errors)).toBe(true)
    })

    it('should return false when no errors exist', () => {
      const errors = {}
      expect(hasErrors(errors)).toBe(false)
    })

    it('should handle single error', () => {
      const errors = { email: 'Invalid email' }
      expect(hasErrors(errors)).toBe(true)
    })

    it('should handle undefined values in errors object', () => {
      const errors: Record<string, string | undefined> = { email: undefined, password: undefined }
      // hasErrors checks Object.keys().length, so even undefined values count as keys
      expect(hasErrors(errors)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters in email', () => {
      expect(validateEmail('user+tag@example.com')).toBeUndefined()
      expect(validateEmail('user.name@example.com')).toBeUndefined()
    })

    it('should handle international domain names', () => {
      expect(validateEmail('user@example.co.uk')).toBeUndefined()
      expect(validateEmail('user@sub.domain.example.com')).toBeUndefined()
    })

    it('should handle numeric usernames', () => {
      expect(validateUsername('123456')).toBeUndefined()
      expect(validateUsername('user123')).toBeUndefined()
    })

    it('should handle mixed case usernames', () => {
      expect(validateUsername('UserName')).toBeUndefined()
      expect(validateUsername('ALLCAPS')).toBeUndefined()
      expect(validateUsername('lowercase')).toBeUndefined()
    })

    it('should handle whitespace in inputs', () => {
      expect(validateEmail(' user@example.com ')).toBeDefined()
      expect(validatePassword(' password ')).toBeUndefined() // Whitespace allowed in password
      expect(validateUsername(' username ')).toBeDefined()
    })
  })

  describe('Security Considerations', () => {
    it('should not allow SQL injection patterns in username', () => {
      expect(validateUsername("user'; DROP TABLE users--")).toBeDefined()
    })

    it('should not allow XSS patterns in username', () => {
      expect(validateUsername('<script>alert("xss")</script>')).toBeDefined()
    })

    it('should handle very long inputs gracefully', () => {
      const veryLongString = 'a'.repeat(1000)
      expect(validateEmail(veryLongString)).toBeDefined()
      expect(validateUsername(veryLongString)).toBeDefined()
      expect(validatePassword(veryLongString)).toBeUndefined() // No max for password
    })
  })

  describe('Input Normalization', () => {
    it('should validate email with subdomain', () => {
      expect(validateEmail('user@mail.example.com')).toBeUndefined()
    })

    it('should validate username with underscores at boundaries', () => {
      expect(validateUsername('_user_')).toBeUndefined()
    })

    it('should handle consecutive underscores in username', () => {
      expect(validateUsername('user__name')).toBeUndefined()
    })
  })
})
