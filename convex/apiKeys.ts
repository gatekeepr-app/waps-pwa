import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { internalQuery, mutation } from './_generated/server'
import { sha256Hex } from './hash'

async function resolveUserId(ctx: any, sessionToken?: string) {
  let userId = await getAuthUserId(ctx)
  if (!userId && sessionToken) {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q: any) => q.eq('token', sessionToken))
      .first()
    if (session && session.expiresAt > Date.now()) userId = session.userId
  }
  return userId
}

function randomKey(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

/** Validate a raw API key. Keys are stored as SHA-256 hashes;
 *  legacy plaintext rows still validate until rotated via re-pairing. */
/** Validate a bearer key inside trusted server code only.
 * Raw API keys must never be exposed through a public Convex query. */
export const validateApiKey = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    if (!args.key || args.key.length > 256) return null
    const keyHash = await sha256Hex(args.key)
    const doc = await ctx.db
      .query('apiKeys')
      .withIndex('by_key', (q: any) => q.eq('key', keyHash))
      .first()
    if (doc) return doc

    const legacy = await ctx.db
      .query('apiKeys')
      .withIndex('by_key', (q: any) => q.eq('key', args.key))
      .first()
    return legacy
  }
})

export async function findApiKey(ctx: any, rawKey: string) {
  if (!rawKey || rawKey.length > 256) return null
  const keyHash = await sha256Hex(rawKey)
  const hashed = await ctx.db
    .query('apiKeys')
    .withIndex('by_key', (q: any) => q.eq('key', keyHash))
    .first()
  if (hashed) return hashed

  return await ctx.db
    .query('apiKeys')
    .withIndex('by_key', (q: any) => q.eq('key', rawKey))
    .first()
}

/** Create or rotate the API key for the authenticated user.
 *  Returns the raw key once; only its hash is persisted. */
export const createApiKey = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) throw new Error('Not authenticated')

    const rawKey = randomKey()
    const keyHash = await sha256Hex(rawKey)

    const existing = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { key: keyHash, createdAt: Date.now() })
    } else {
      await ctx.db.insert('apiKeys', {
        userId,
        key: keyHash,
        createdAt: Date.now()
      })
    }
    return rawKey
  }
})

/** Revoke the current API key. A later pairing or rotation creates a new one. */
export const revokeApiKey = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .first()
    if (existing) await ctx.db.delete(existing._id)
    return { ok: true }
  }
})
