// convex/authManual.ts
import bcrypt from 'bcryptjs'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/** Read: user by email */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', email))
      .first()
  }
})

/** ✅ Action: verify credentials (note: actions use ctx.runQuery, not ctx.db) */
export const verifyCredentials = query({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', email))
      .first()
    if (!user) throw new Error('Invalid email or password')
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new Error('Invalid email or password')
    return { userId: user._id }
  }
})

export const signup = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string())
  },
  handler: async (ctx, { email, password, name }) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', email))
      .first()
    if (existing) throw new Error('Email already in use')

    const passwordHash = await bcrypt.hash(password, 10)
    const now = Date.now()

    const userId = await ctx.db.insert('users', {
      email,
      name: name ?? undefined,
      passwordHash,
      createdAt: now,
      updatedAt: now
    })

    return { userId }
  }
})

/** Sessions */
export const createSession = mutation({
  args: { userId: v.id('users'), token: v.string(), expiresAt: v.number() },
  handler: async (ctx, { userId, token, expiresAt }) => {
    const now = Date.now()
    await ctx.db.insert('sessions', {
      userId,
      token,
      createdAt: now,
      expiresAt
    })
    return { ok: true }
  }
})

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

/** Password reset tokens */
export const createResetToken = mutation({
  args: { email: v.string(), token: v.string(), expiresAt: v.number() },
  handler: async (ctx, { email, token, expiresAt }) => {
    await ctx.db.insert('resetTokens', { email, token, expiresAt })
    return { ok: true }
  }
})

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
      .withIndex('by_email', q => q.eq('email', doc.email))
      .first()
    if (!user) throw new Error('User not found')

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await ctx.db.patch(user._id, { passwordHash, updatedAt: Date.now() })
    await ctx.db.patch(doc._id, { consumed: true })

    return { ok: true }
  }
})
