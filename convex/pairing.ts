import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

function randomKey(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export const generatePairingCode = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let userId = await getAuthUserId(ctx)
    if (!userId && args.sessionToken) {
      const sess = await ctx.db
        .query('sessions')
        .withIndex('by_token', q => q.eq('token', args.sessionToken!))
        .first()
      if (sess && sess.expiresAt > Date.now()) {
        userId = sess.userId
      }
    }
    if (!userId) throw new Error('Not authenticated')

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++)
      code += chars[Math.floor(Math.random() * chars.length)]

    const existing = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .first()
    const apiKey = existing ? existing.key : randomKey()
    if (!existing)
      await ctx.db.insert('apiKeys', {
        userId,
        key: apiKey,
        createdAt: Date.now()
      })

    const deployment = process.env.CONVEX_DEPLOYMENT ?? 'aromatic-puffin-900'
    const siteUrl = `https://${deployment}.convex.site`
    await ctx.db.insert('pairingCodes', {
      code,
      apiKey,
      convexUrl: siteUrl,
      createdAt: Date.now()
    })
    return { code, apiKey, convexUrl: siteUrl }
  }
})

export const resolvePairingCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('pairingCodes')
      .withIndex('by_code', (q: any) => q.eq('code', args.code.toUpperCase()))
      .first()
    if (!doc) return null
    const age = Date.now() - doc.createdAt
    if (age > 600000) return null
    return { apiKey: doc.apiKey, convexUrl: doc.convexUrl }
  }
})
