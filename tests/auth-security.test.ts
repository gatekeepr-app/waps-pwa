import { describe, expect, it } from 'vitest'
import {
  AUTH_RATE_MAX_ATTEMPTS,
  AUTH_RATE_WINDOW_MS,
  ipIdentifier,
  isAuthAttemptLimited,
  normalizeEmail
} from '../convex/authSecurity'
import { trustedClientIp } from '../src/lib/client-ip'

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

  it('separates the IP bucket from account buckets', () => {
    expect(ipIdentifier('203.0.113.7')).toBe('ip:203.0.113.7')
    expect(ipIdentifier('203.0.113.7')).not.toBe(normalizeEmail('a@b.co'))
  })
})

describe('trusted proxy client IP', () => {
  it('ignores unconfigured or malformed headers', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.7',
      'x-real-ip': 'not-an-ip'
    })
    expect(trustedClientIp(headers, undefined)).toBeNull()
    expect(trustedClientIp(headers, 'x-real-ip')).toBeNull()
  })

  it('returns only the first hop of the configured header', () => {
    const headers = new Headers({
      'x-vercel-forwarded-for': '203.0.113.7, 10.0.0.1'
    })
    expect(trustedClientIp(headers, 'x-vercel-forwarded-for')).toBe(
      '203.0.113.7'
    )
  })
})
