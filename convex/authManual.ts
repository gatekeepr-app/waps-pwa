import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

const ITERATIONS = 100_000
const KEY_LENGTH = 32
const ALGORITHM = 'PBKDF2'
const HASH_ALGORITHM = 'SHA-256'

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
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
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

/** Look up user by email */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', email))
      .first()
  }
})

/** Verify email + password against authAccounts (Password provider) */
export const verifyCredentials = query({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', email))
      .first()
    if (!user) throw new Error('Invalid email or password')

    const account = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', q =>
        q.eq('userId', user._id).eq('provider', 'password')
      )
      .first()
    if (!account || !(account as any).secret || !(account as any).salt)
      throw new Error('Invalid email or password')

    const valid = await verifyPassword(
      password,
      (account as any).secret,
      (account as any).salt
    )
    if (!valid) throw new Error('Invalid email or password')

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
    const existing = await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', email))
      .first()
    if (existing) throw new Error('Email already in use')

    const { hash, salt } = await hashPassword(password)

    const userId = await ctx.db.insert('users', {
      email,
      name: name ?? undefined
    })

    await ctx.db.insert('authAccounts', {
      userId,
      provider: 'password',
      providerAccountId: email,
      secret: hash,
      salt
    } as any)

    return { userId }
  }
})

/** Create a session */
export const createSession = mutation({
  args: {
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number()
  },
  handler: async (ctx, { userId, token, expiresAt }) => {
    await ctx.db.insert('sessions', {
      userId,
      token,
      createdAt: Date.now(),
      expiresAt
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
    return await ctx.db.get(sess.userId)
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
  args: { email: v.string(), token: v.string(), expiresAt: v.number() },
  handler: async (ctx, { email, token, expiresAt }) => {
    await ctx.db.insert('resetTokens', { email, token, expiresAt })
    return { ok: true }
  }
})

/** Reset password using a token */
export const resetPassword = mutation({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (ctx, { token, newPassword }) => {
    const doc = await ctx.db
      .query('resetTokens')
      .withIndex('by_token', q => q.eq('token', token))
      .first()
    if (!doc) throw new Error('Invalid or expired reset token')
    if (doc.consumed) throw new Error('Token already used')
    if (doc.expiresAt < Date.now()) throw new Error('Token expired')

    const user = await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', doc.email))
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
    await ctx.db.patch(account._id, { secret: hash, salt } as any)
    await ctx.db.patch(doc._id, { consumed: true })

    return { ok: true }
  }
})
