import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { sha256Hex } from './hash'

function randomKey(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

const CODE_TTL_MS = 600_000
const RATE_WINDOW_MS = 900_000
const RATE_MAX_ATTEMPTS = 10

/** Generate a pairing code. Rotates the user's API key on every call
 *  (previously paired extensions must re-pair); only the key hash is stored. */
export const generatePairingCode = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let userId: any = null
    const sess = args.sessionToken
      ? await ctx.db
          .query('sessions')
          .withIndex('by_token', q => q.eq('token', args.sessionToken!))
          .first()
      : null
    if (sess && sess.expiresAt > Date.now()) {
      userId = sess.userId
    }
    if (!userId) throw new Error('Not authenticated')

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++)
      code += chars[Math.floor(Math.random() * chars.length)]

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

    const deployment = process.env.CONVEX_DEPLOYMENT ?? 'aromatic-puffin-900'
    const siteUrl = `https://${deployment}.convex.site`
    await ctx.db.insert('pairingCodes', {
      code,
      apiKey: rawKey,
      convexUrl: siteUrl,
      createdAt: Date.now()
    })
    return { code, apiKey: rawKey, convexUrl: siteUrl }
  }
})

/** Redeem a pairing code: single-use, expiry-checked, and rate-limited
 *  per client IP (max RATE_MAX_ATTEMPTS failures per RATE_WINDOW_MS). */
export const redeemPairingCode = mutation({
  args: { code: v.string(), ip: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const ip = args.ip ?? 'unknown'

    if (args.ip) {
      const limitDoc = await ctx.db
        .query('pairingAttempts')
        .withIndex('by_identifier', q => q.eq('identifier', ip))
        .first()
      if (
        limitDoc &&
        Date.now() - limitDoc.windowStart < RATE_WINDOW_MS &&
        limitDoc.attempts >= RATE_MAX_ATTEMPTS
      ) {
        return { error: 'rate_limited' as const }
      }
    }

    const fail = async () => {
      const limitDoc = await ctx.db
        .query('pairingAttempts')
        .withIndex('by_identifier', q => q.eq('identifier', ip))
        .first()
      if (limitDoc && Date.now() - limitDoc.windowStart < RATE_WINDOW_MS) {
        await ctx.db.patch(limitDoc._id, { attempts: limitDoc.attempts + 1 })
      } else if (limitDoc) {
        await ctx.db.patch(limitDoc._id, {
          attempts: 1,
          windowStart: Date.now()
        })
      } else {
        await ctx.db.insert('pairingAttempts', {
          identifier: ip,
          attempts: 1,
          windowStart: Date.now()
        })
      }
      return { error: 'not_found' as const }
    }

    const doc = await ctx.db
      .query('pairingCodes')
      .withIndex('by_code', q => q.eq('code', args.code.toUpperCase()))
      .first()
    if (!doc) return await fail()
    if (Date.now() - doc.createdAt > CODE_TTL_MS) {
      await ctx.db.delete(doc._id)
      return await fail()
    }

    // Single use: consume the code and clear the failure counter
    await ctx.db.delete(doc._id)
    const limitDoc = await ctx.db
      .query('pairingAttempts')
      .withIndex('by_identifier', q => q.eq('identifier', ip))
      .first()
    if (limitDoc) await ctx.db.delete(limitDoc._id)

    return {
      apiKey: doc.apiKey,
      convexUrl: doc.convexUrl
    }
  }
})
