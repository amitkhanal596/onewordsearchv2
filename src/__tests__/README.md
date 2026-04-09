# Supabase Authentication Test Suite

Comprehensive test suite for the Supabase authentication system covering all critical authentication flows, JWT verification, and session management.

## Overview

This test suite ensures that the authentication system follows security best practices and maintains complete statelessness on the backend. All tests are written using Vitest and React Testing Library.

## Test Coverage

### 1. Signup Flow Tests (`auth/signup.test.ts`)

Tests for user registration functionality:

- **Successful Signup**: Creating new user accounts
- **Email Validation**: Handling existing emails and invalid formats
- **Password Strength**: Enforcing minimum password requirements
- **Username Uniqueness**: Preventing duplicate usernames
- **Profile Creation**: Ensuring profiles are created with user metadata
- **JWT Handling**: Verifying tokens are issued after signup
- **Error Handling**: Graceful handling of network and database errors

**Key Test Cases:**
- Valid user registration with all required fields
- Rejection of existing email addresses
- Password length validation (minimum 8 characters)
- Username format validation (3-20 characters, alphanumeric + underscores)
- Username uniqueness checks before account creation

### 2. Login Flow Tests (`auth/login.test.ts`)

Tests for user authentication:

- **Valid Credentials**: Successful login with correct email/password
- **Invalid Email**: Handling malformed email addresses
- **Wrong Password**: Security-conscious error messages
- **Non-existent Users**: Generic error messages for security
- **JWT Token Management**: Token issuance after login
- **Session Persistence**: Cookie-based session storage
- **Multiple Attempts**: Handling consecutive login attempts
- **Error Handling**: Network errors and rate limiting

**Key Test Cases:**
- Successful authentication and redirect to home page
- Generic "Invalid login credentials" for security
- No information leakage about user existence
- Proper JWT token storage in httpOnly cookies

### 3. JWT Verification Tests (`auth/jwt-verification.test.ts`)

Tests for token validation and middleware:

- **Valid JWT**: Acceptance of properly signed tokens
- **Expired JWT**: Rejection of expired tokens
- **Malformed JWT**: Handling invalid token formats
- **Missing JWT**: Proper handling of unauthenticated requests
- **User ID Extraction**: Extracting user identity from tokens
- **Middleware Protection**: Route protection via middleware
- **Claims Validation**: Verifying JWT claims (exp, iss, aud)
- **Token Refresh**: Automatic token refresh before expiration

**Key Test Cases:**
- Valid JWT allows access to protected resources
- Expired tokens are rejected with appropriate status codes
- Middleware redirects unauthenticated users to login
- User ID correctly extracted from JWT payload
- Token refresh maintains session continuity

### 4. Session Persistence Tests (`auth/session-persistence.test.ts`)

Tests for session management:

- **Page Refreshes**: Session maintained across page reloads
- **Cookie Storage**: httpOnly cookie implementation
- **Session Expiration**: Graceful handling of expired sessions
- **Logout**: Complete session cleanup
- **Token Refresh**: Automatic refresh before expiration
- **Concurrent Requests**: Session consistency across parallel requests
- **State Transitions**: Auth state changes (login/logout)

**Key Test Cases:**
- Session persists after page refresh
- Logout clears all session data and cookies
- Expired sessions redirect to login
- httpOnly cookies protect against XSS
- Concurrent requests maintain session consistency

### 5. Validation Utilities Tests (`utils/validation.test.ts`)

Tests for client-side validation:

- **Email Format**: RFC-compliant email validation
- **Password Strength**: Minimum length requirements
- **Username Format**: Character and length restrictions
- **Registration Form**: Complete form validation
- **Login Form**: Email and password validation
- **Edge Cases**: Special characters, whitespace, long inputs
- **Security**: Protection against injection attacks

**Key Test Cases:**
- Valid email formats accepted
- Invalid formats rejected with helpful messages
- Password minimum 8 characters enforced
- Username 3-20 characters with alphanumeric + underscores
- Multiple validation errors detected simultaneously

## Running the Tests

### Prerequisites

Ensure all dependencies are installed:

```bash
npm install
```

### Test Commands

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Running Specific Test Files

```bash
# Run only signup tests
npx vitest run src/__tests__/auth/signup.test.ts

# Run only login tests
npx vitest run src/__tests__/auth/login.test.ts

# Run only JWT verification tests
npx vitest run src/__tests__/auth/jwt-verification.test.ts

# Run only session persistence tests
npx vitest run src/__tests__/auth/session-persistence.test.ts

# Run only validation tests
npx vitest run src/__tests__/utils/validation.test.ts
```

### Running Tests by Pattern

```bash
# Run all auth tests
npx vitest run auth

# Run all validation tests
npx vitest run validation
```

## Test Structure

```
src/__tests__/
├── README.md                          # This file
├── setup.ts                           # Global test setup
├── mocks/
│   └── supabase.ts                   # Supabase client mocks
├── auth/
│   ├── signup.test.ts                # Signup flow tests
│   ├── login.test.ts                 # Login flow tests
│   ├── jwt-verification.test.ts      # JWT verification tests
│   └── session-persistence.test.ts   # Session management tests
└── utils/
    └── validation.test.ts            # Validation utility tests
```

## Mock Utilities

### Supabase Mocks (`mocks/supabase.ts`)

Provides comprehensive mocking for Supabase client:

- **Mock User Data**: Pre-configured test user
- **Mock Session Data**: JWT tokens and refresh tokens
- **Mock Auth Methods**: signUp, signIn, signOut, getUser
- **Mock Database Methods**: from, select, insert, update
- **Helper Functions**:
  - `mockSuccessfulSignUp()`
  - `mockSuccessfulLogin()`
  - `mockAuthenticatedUser()`
  - `mockUnauthenticatedUser()`
  - `createMockJWT()`
  - `createExpiredMockJWT()`

## Test Configuration

### Vitest Config (`vitest.config.ts`)

- **Environment**: jsdom (browser-like environment)
- **Globals**: Enabled for describe/it/expect
- **Setup Files**: Runs `setup.ts` before tests
- **Coverage**: v8 provider with HTML/JSON reports
- **Path Aliases**: `@/` mapped to `./src/`

### Setup File (`setup.ts`)

Configures:
- Testing Library DOM matchers
- Automatic cleanup after each test
- Environment variables
- Next.js router mocks
- Next.js cache mocks
- Next.js headers mocks

## Writing New Tests

### Best Practices

1. **Use Descriptive Test Names**: Tests should clearly state what they verify
2. **Follow AAA Pattern**: Arrange, Act, Assert
3. **Mock External Dependencies**: Never hit real Supabase in tests
4. **Test Edge Cases**: Include error scenarios and boundary conditions
5. **Keep Tests Independent**: Each test should work in isolation
6. **Use Type Safety**: Leverage TypeScript for test code

### Example Test

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signUp } from '@/app/actions/auth'
import { createMockSupabaseClient, mockSuccessfulSignUp } from '../mocks/supabase'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/utils/supabase/server'

describe('My Feature', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
  })

  it('should do something specific', async () => {
    // Arrange
    mockSuccessfulSignUp(mockSupabase.auth)

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
```

## Coverage Goals

Target coverage metrics:

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## CI/CD Integration

The test suite is designed to run in CI environments:

```bash
# CI test command (exits with code on failure)
npm run test:run
```

Example GitHub Actions workflow:

```yaml
- name: Run tests
  run: npm run test:run

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Troubleshooting

### Common Issues

1. **Mock Not Working**: Ensure `vi.clearAllMocks()` is called in `beforeEach()`
2. **Async Tests Failing**: Use `async/await` properly, check for resolved/rejected promises
3. **Module Not Found**: Verify path aliases in `vitest.config.ts`
4. **Environment Variables**: Check they're set in `setup.ts`

### Debug Mode

Run tests with verbose output:

```bash
npx vitest --reporter=verbose
```

Run specific test with debug info:

```bash
npx vitest run signup.test.ts --reporter=verbose
```

## Security Testing Notes

The test suite validates several security requirements:

1. **No Custom Password Handling**: All auth uses Supabase
2. **JWT-Only Authentication**: No session state on backend
3. **httpOnly Cookies**: XSS protection
4. **Generic Error Messages**: No user enumeration
5. **Input Validation**: Protection against injection attacks
6. **Token Expiration**: Proper session timeout handling

## Maintenance

### Adding New Tests

1. Create test file in appropriate directory
2. Import necessary mocks from `mocks/supabase.ts`
3. Follow existing test structure and patterns
4. Update this README with new test coverage
5. Run tests to ensure they pass

### Updating Mocks

When Supabase client changes:

1. Update type definitions in `mocks/supabase.ts`
2. Add new mock methods as needed
3. Update existing tests to use new mocks
4. Verify all tests still pass

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)

## Contributing

When adding new authentication features:

1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add new test cases for the feature
4. Update documentation
5. Verify coverage doesn't decrease

## License

Same as the main project.
