import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { sha256Hex } from './hash'

function randomKey(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

/** Validate a raw API key. Keys are stored as SHA-256 hashes;
 *  legacy plaintext rows still validate until rotated via re-pairing. */
export const validateApiKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
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

/** Create or rotate the API key for the authenticated user.
 *  Returns the raw key once; only its hash is persisted. */
export const createApiKey = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const rawKey = randomKey()
    const keyHash = await sha256Hex(rawKey)

    const existing = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { key: keyHash })
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
