import { describe, expect, it } from 'vitest'
import {
  AUTH_RATE_MAX_ATTEMPTS,
  AUTH_RATE_WINDOW_MS,
  isAuthAttemptLimited,
  normalizeEmail
} from '../convex/authSecurity'

describe('authentication security helpers', () => {
  it('normalizes email identifiers consistently', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com')
  })

  it('limits only attempts inside the active window', () => {
    const now = 1_000_000
    expect(
      isAuthAttemptLimited(
        { attempts: AUTH_RATE_MAX_ATTEMPTS, windowStart: now - 1 },
        now
      )
    ).toBe(true)
    expect(
      isAuthAttemptLimited(
        {
          attempts: AUTH_RATE_MAX_ATTEMPTS,
          windowStart: now - AUTH_RATE_WINDOW_MS
        },
        now
      )
    ).toBe(false)
    expect(
      isAuthAttemptLimited(
        { attempts: AUTH_RATE_MAX_ATTEMPTS - 1, windowStart: now - 1 },
        now
      )
    ).toBe(false)
  })
})
