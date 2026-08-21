import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

function randomKey(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export const validateApiKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('apiKeys')
      .withIndex('by_key', (q: any) => q.eq('key', args.key))
      .first()
  }
})

export const getOrCreateApiKey = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const existing = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .first()
    if (existing) return existing.key
    const key = randomKey()
    await ctx.db.insert('apiKeys', { userId, key, createdAt: Date.now() })
    return key
  }
})
