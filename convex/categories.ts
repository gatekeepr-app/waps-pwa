import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

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

/** Create default categories for a user */
export const ensureDefaults = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
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
  args: { userId: v.id('users'), name: v.string() },
  handler: async (ctx, { userId, name }) => {
    const existing = await ctx.db
      .query('categories')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q => q.eq(q.field('name'), name))
      .first()
    if (existing) throw new Error('Category already exists')

    return await ctx.db.insert('categories', {
      userId,
      name,
      isDefault: false,
      order: 999
    })
  }
})

/** Delete a custom category */
export const remove = mutation({
  args: { id: v.id('categories') },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id)
    if (!doc) throw new Error('Category not found')
    if (doc.isDefault) throw new Error('Cannot delete default category')
    await ctx.db.delete(id)
    return { ok: true }
  }
})
