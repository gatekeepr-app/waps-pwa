import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

async function resolveUserId(ctx: any, sessionToken?: string) {
  let userId = await getAuthUserId(ctx)
  if (!userId && sessionToken) {
    const sess = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q: any) => q.eq('token', sessionToken))
      .first()
    if (sess && sess.expiresAt > Date.now()) {
      userId = sess.userId
    }
  }
  return userId
}

const DEFAULT_CATEGORIES = [
  'Work',
  'Personal',
  'Reading',
  'Shopping',
  'Learning',
  'Entertainment',
  'Health',
  'Finance',
  'Other'
]

/** Create default categories for the authenticated user */
export const ensureDefaults = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('categories')
      .withIndex('by_user', q => q.eq('userId', userId))
      .first()
    if (existing) return

    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      await ctx.db.insert('categories', {
        userId,
        name: DEFAULT_CATEGORIES[i],
        isDefault: true,
        order: i
      })
    }
  }
})

/** List categories for the authenticated user */
export const list = query({
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
    if (!userId) return []
    return await ctx.db
      .query('categories')
      .withIndex('by_user', q => q.eq('userId', userId))
      .order('asc')
      .collect()
  }
})

/** Add a custom category */
export const add = mutation({
  args: { sessionToken: v.optional(v.string()), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('categories')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q => q.eq(q.field('name'), args.name))
      .first()
    if (existing) throw new Error('Category already exists')

    return await ctx.db.insert('categories', {
      userId,
      name: args.name,
      isDefault: false,
      order: 999
    })
  }
})

/** Delete a custom category */
export const remove = mutation({
  args: { sessionToken: v.optional(v.string()), id: v.id('categories') },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const doc = await ctx.db.get(args.id)
    if (!doc) throw new Error('Category not found')
    if (doc.userId !== userId) throw new Error('Not found')
    if (doc.isDefault) throw new Error('Cannot delete default category')
    await ctx.db.delete(args.id)
    return { ok: true }
  }
})

export const rename = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id('categories'),
    name: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const name = args.name.trim()
    if (!name) throw new Error('Category name required')
    const doc = await ctx.db.get(args.id)
    if (!doc || doc.userId !== userId) throw new Error('Not found')
    const existing = await ctx.db
      .query('categories')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q => q.eq(q.field('name'), name))
      .first()
    if (existing && existing._id !== args.id)
      throw new Error('Category already exists')
    await ctx.db.patch(args.id, { name })
    return { ok: true }
  }
})
