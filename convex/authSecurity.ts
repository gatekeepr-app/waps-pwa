export const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000
export const AUTH_RATE_MAX_ATTEMPTS = 10

export type AuthAttemptRecord = {
  attempts: number
  windowStart: number
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Rate-limit bucket for a client IP supplied by a trusted proxy header. */
export function ipIdentifier(ip: string): string {
  return `ip:${ip}`
}

export function isAuthAttemptLimited(
  record: AuthAttemptRecord | null | undefined,
  now = Date.now()
): boolean {
  return !!(
    record &&
    now - record.windowStart < AUTH_RATE_WINDOW_MS &&
    record.attempts >= AUTH_RATE_MAX_ATTEMPTS
  )
}
