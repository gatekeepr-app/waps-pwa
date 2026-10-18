import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  AUTH_RATE_WINDOW_MS,
  isAuthAttemptLimited,
  normalizeEmail
} from './authSecurity'

const ITERATIONS = 100_000
const KEY_LENGTH = 32
const ALGORITHM = 'PBKDF2'
const HASH_ALGORITHM = 'SHA-256'
const PREFIX = 'pbkdf2$'
function requireInternalSecret(secret: string): void {
  const expected = process.env.MANUAL_AUTH_INTERNAL_SECRET
  if (!expected || secret !== expected) {
    throw new Error('Unauthorized')
  }
}

function requireValidPassword(password: string): void {
  if (password.length < 8 || password.length > 128) {
    throw new Error('Password must be between 8 and 128 characters')
  }
}

function authIdentifier(email: string): string {
  return normalizeEmail(email)
}

async function isAuthRateLimited(ctx: any, email: string): Promise<boolean> {
  const record = await ctx.db
    .query('authAttempts')
    .withIndex('by_identifier', (q: any) =>
      q.eq('identifier', authIdentifier(email))
    )
    .first()
  return isAuthAttemptLimited(record)
}

async function recordAuthFailure(ctx: any, email: string): Promise<void> {
  const identifier = authIdentifier(email)
  const now = Date.now()
  const record = await ctx.db
    .query('authAttempts')
    .withIndex('by_identifier', (q: any) => q.eq('identifier', identifier))
    .first()
  if (record && now - record.windowStart < AUTH_RATE_WINDOW_MS) {
    await ctx.db.patch(record._id, { attempts: record.attempts + 1 })
  } else if (record) {
    await ctx.db.patch(record._id, { attempts: 1, windowStart: now })
  } else {
    await ctx.db.insert('authAttempts', {
      identifier,
      attempts: 1,
      windowStart: now
    })
  }
}

async function clearAuthFailures(ctx: any, email: string): Promise<void> {
  const record = await ctx.db
    .query('authAttempts')
    .withIndex('by_identifier', (q: any) =>
      q.eq('identifier', authIdentifier(email))
    )
    .first()
  if (record) await ctx.db.delete(record._id)
}

/** The authAccounts schema has no salt field, so the salt is embedded in
 *  the secret with a version prefix: "pbkdf2$<saltHex>$<hashHex>". */
function encodeSecret(salt: string, hash: string): string {
  return `${PREFIX}${salt}$${hash}`
}

function isCurrentSecret(secret: string): boolean {
  return secret.startsWith(PREFIX)
}

async function hashPassword(
  password: string,
  salt?: Uint8Array
): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder()
  const passwordKey = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    ALGORITHM,
    false,
    ['deriveBits']
  )
  const saltBytes =
    salt || globalThis.crypto.getRandomValues(new Uint8Array(16))
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: ALGORITHM,
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM
    },
    passwordKey,
    KEY_LENGTH * 8
  )
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  const saltHex = Array.from(saltBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return { hash: hashHex, salt: saltHex }
}

async function verifyPassword(
  password: string,
  secret: string
): Promise<boolean> {
  const parts = secret.slice(PREFIX.length).split('$')
  if (parts.length !== 2) return false
  const [storedSalt, storedHash] = parts
  const { hash } = await hashPassword(password, hexToBytes(storedSalt))
  return timingSafeEqual(hash, storedHash)
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input)
  )
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Verify pre-PBKDF2 credentials. Two legacy shapes exist in production:
 *  - "saltHex:hashHex" (salted SHA-256, salt concatenation order unknown)
 *  - bare hashHex (unsalted SHA-256 of the password)
 *  All derivations are compared timing-safely; success upgrades to PBKDF2. */
async function verifyLegacySecret(
  password: string,
  secret: string
): Promise<boolean> {
  const colonIdx = secret.indexOf(':')
  if (colonIdx > 0) {
    const s = secret.slice(0, colonIdx)
    const h = secret.slice(colonIdx + 1)
    const candidates = [
      await sha256Hex(s + password),
      await sha256Hex(password + s),
      await sha256Hex(`${s}:${password}`),
      await sha256Hex(`${password}:${s}`)
    ]
    return candidates.some(c => timingSafeEqual(c, h))
  }
  return timingSafeEqual(await sha256Hex(password), secret)
}

/** Look up user by email */
export const getUserByEmail = query({
  args: { email: v.string(), internalSecret: v.string() },
  handler: async (ctx, { email, internalSecret }) => {
    requireInternalSecret(internalSecret)
    const identifier = authIdentifier(email)
    const user = await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', identifier))
      .first()
    return user ? { _id: user._id, email: user.email, name: user.name } : null
  }
})

/** Verify email + password against authAccounts (Password provider).
 *  Supports legacy credential formats and transparently upgrades them to PBKDF2:
 *  - "pbkdf2$<salt>$<hash>" secret -> PBKDF2 (current)
 *  - "salt:hash" or bare hash secret -> legacy SHA-256
 *  - no authAccounts row -> legacy bcrypt passwordHash on user doc
 */
export const verifyCredentials = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const identifier = authIdentifier(email)
    if (await isAuthRateLimited(ctx, email)) {
      throw new Error('Too many sign-in attempts. Try again later.')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', identifier))
      .first()
    if (!user) {
      await recordAuthFailure(ctx, identifier)
      throw new Error('Invalid email or password')
    }

    const account = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', q =>
        q.eq('userId', user._id).eq('provider', 'password')
      )
      .first()

    let valid = false

    if (account) {
      const secret = (account as any).secret as string | undefined
      if (!secret) {
        await recordAuthFailure(ctx, identifier)
        throw new Error('Invalid email or password')
      }
      if (isCurrentSecret(secret)) {
        valid = await verifyPassword(password, secret)
      } else {
        valid = await verifyLegacySecret(password, secret)
      }
    } else {
      const bcryptHash = (user as any).passwordHash as string | undefined
      if (!bcryptHash) {
        await recordAuthFailure(ctx, identifier)
        throw new Error('Invalid email or password')
      }
      const bcrypt = await import('bcryptjs')
      valid = await bcrypt.compare(password, bcryptHash)
    }

    if (!valid) {
      await recordAuthFailure(ctx, identifier)
      throw new Error('Invalid email or password')
    }

    await clearAuthFailures(ctx, identifier)

    // Upgrade legacy credentials to the current format
    const { hash, salt } = await hashPassword(password)
    const encoded = encodeSecret(salt, hash)
    if (account) {
      if (!isCurrentSecret((account as any).secret)) {
        await ctx.db.patch(account._id, { secret: encoded } as any)
      }
    } else {
      await ctx.db.insert('authAccounts', {
        userId: user._id,
        provider: 'password',
        providerAccountId: identifier,
        secret: encoded
      } as any)
    }

    return { userId: user._id }
  }
})

/** Create user + password account */
export const signup = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string())
  },
  handler: async (ctx, { email, password, name }) => {
    requireValidPassword(password)
    const identifier = authIdentifier(email)
    const existing = await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', identifier))
      .first()
    if (existing) throw new Error('Email already in use')

    const { hash, salt } = await hashPassword(password)

    const userId = await ctx.db.insert('users', {
      email: identifier,
      name: name ?? undefined
    })

    await ctx.db.insert('authAccounts', {
      userId,
      provider: 'password',
      providerAccountId: identifier,
      secret: encodeSecret(salt, hash)
    } as any)

    return { userId }
  }
})

/** Create a session */
export const createSession = mutation({
  args: {
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
    userAgent: v.optional(v.string()),
    internalSecret: v.string()
  },
  handler: async (
    ctx,
    { userId, token, expiresAt, userAgent, internalSecret }
  ) => {
    requireInternalSecret(internalSecret)
    if (!token || token.length < 32) throw new Error('Invalid session token')
    const maxLifetime = 30 * 24 * 60 * 60 * 1000
    if (expiresAt <= Date.now() || expiresAt > Date.now() + maxLifetime) {
      throw new Error('Invalid session expiry')
    }
    await ctx.db.insert('sessions', {
      userId,
      token,
      createdAt: Date.now(),
      expiresAt,
      userAgent: userAgent?.slice(0, 512)
    })
    return { ok: true }
  }
})

/** Look up user from session token */
export const sessionUser = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const sess = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', token))
      .first()
    if (!sess || sess.expiresAt < Date.now()) return null
    const user = await ctx.db.get(sess.userId)
    return user ? { _id: user._id, email: user.email, name: user.name } : null
  }
})

/** List the current user's active sessions without returning bearer tokens. */
export const listSessions = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const current = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', sessionToken))
      .first()
    if (!current || current.expiresAt <= Date.now()) return []

    const sessions = await ctx.db
      .query('sessions')
      .filter(q => q.eq(q.field('userId'), current.userId))
      .collect()
    return sessions
      .filter(session => session.expiresAt > Date.now())
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(session => ({
        id: session._id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent ?? null,
        current: session._id === current._id
      }))
  }
})

/** Revoke one session owned by the currently authenticated user. */
export const revokeSession = mutation({
  args: { sessionToken: v.string(), sessionId: v.id('sessions') },
  handler: async (ctx, { sessionToken, sessionId }) => {
    const current = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', sessionToken))
      .first()
    const target = await ctx.db.get(sessionId)
    if (!current || current.expiresAt <= Date.now() || !target) {
      throw new Error('Session not found')
    }
    if (target.userId !== current.userId) throw new Error('Session not found')
    await ctx.db.delete(sessionId)
    return { ok: true }
  }
})

/** Revoke every session for the current user, including the current session. */
export const revokeAllSessions = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const current = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', sessionToken))
      .first()
    if (!current || current.expiresAt <= Date.now()) {
      throw new Error('Session not found')
    }
    const sessions = await ctx.db
      .query('sessions')
      .filter(q => q.eq(q.field('userId'), current.userId))
      .collect()
    for (const session of sessions) await ctx.db.delete(session._id)
    return { ok: true }
  }
})

/** Delete session */
export const deleteSessionByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const sess = await ctx.db
      .query('sessions')
      .withIndex('by_token', q => q.eq('token', token))
      .first()
    if (sess) await ctx.db.delete(sess._id)
    return { ok: true }
  }
})

/** Create a password reset token */
export const createResetToken = mutation({
  args: {
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    internalSecret: v.string()
  },
  handler: async (ctx, { email, token, expiresAt, internalSecret }) => {
    requireInternalSecret(internalSecret)
    const identifier = authIdentifier(email)
    if (!token || token.length < 32) throw new Error('Invalid reset token')
    if (expiresAt <= Date.now() || expiresAt > Date.now() + 60 * 60 * 1000) {
      throw new Error('Invalid reset-token expiry')
    }
    await ctx.db.insert('resetTokens', {
      email: identifier,
      token: await sha256Hex(token),
      expiresAt
    })
    return { ok: true }
  }
})

/** Reset password using a token */
export const resetPassword = mutation({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (ctx, { token, newPassword }) => {
    requireValidPassword(newPassword)
    const tokenHash = await sha256Hex(token)
    const doc = await ctx.db
      .query('resetTokens')
      .withIndex('by_token', q => q.eq('token', tokenHash))
      .first()
    const legacyDoc = doc
      ? null
      : await ctx.db
          .query('resetTokens')
          .withIndex('by_token', q => q.eq('token', token))
          .first()
    const resetToken = doc ?? legacyDoc
    if (!resetToken) throw new Error('Invalid or expired reset token')
    if (resetToken.consumed) throw new Error('Token already used')
    if (resetToken.expiresAt < Date.now()) throw new Error('Token expired')

    const user = await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', authIdentifier(resetToken.email)))
      .first()
    if (!user) throw new Error('User not found')

    const account = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', q =>
        q.eq('userId', user._id).eq('provider', 'password')
      )
      .first()
    if (!account) throw new Error('No password account found')

    const { hash, salt } = await hashPassword(newPassword)
    await ctx.db.patch(account._id, { secret: encodeSecret(salt, hash) } as any)
    await ctx.db.patch(resetToken._id, { consumed: true })

    const sessions = await ctx.db
      .query('sessions')
      .filter(q => q.eq(q.field('userId'), user._id))
      .collect()
    for (const session of sessions) {
      await ctx.db.delete(session._id)
    }

    return { ok: true }
  }
})
