/**
 * Test Setup Configuration
 *
 * This file runs before all tests to configure the testing environment.
 * It sets up custom matchers, mocks, and global test utilities.
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local for integration tests
const envPath = path.resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock environment variables for unit tests (will be overridden by .env.local for integration tests)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
}
if (!process.env.NEXT_PUBLIC_SITE_URL) {
  process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
}

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))

// Mock Next.js cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Next.js headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))
