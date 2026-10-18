import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { internalQuery, mutation, query } from './_generated/server'
import { findApiKey } from './apiKeys'

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

/** Persist the onboarding category selection while preserving default semantics. */
export const configureOnboarding = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    defaultNames: v.array(v.string()),
    customNames: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) throw new Error('Not authenticated')

    const defaultLookup = new Map(
      DEFAULT_CATEGORIES.map(name => [name.toLowerCase(), name])
    )
    const defaultNames: string[] = []
    const seenDefaults = new Set<string>()
    for (const rawName of args.defaultNames) {
      const canonical = defaultLookup.get(rawName.trim().toLowerCase())
      if (!canonical) throw new Error('Invalid default category')
      if (!seenDefaults.has(canonical)) {
        seenDefaults.add(canonical)
        defaultNames.push(canonical)
      }
    }

    const customNames: string[] = []
    const seenCustom = new Set<string>()
    for (const rawName of args.customNames) {
      const name = rawName.trim()
      const key = name.toLowerCase()
      if (!name || name.length > 40) throw new Error('Invalid category name')
      if (defaultLookup.has(key))
        throw new Error('Default category is not custom')
      if (!seenCustom.has(key)) {
        seenCustom.add(key)
        customNames.push(name)
      }
    }
    if (customNames.length > 20) throw new Error('Too many custom categories')

    const existing = await ctx.db
      .query('categories')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()
    const byName = new Map(
      existing.map(category => [category.name.toLowerCase(), category])
    )

    for (let i = 0; i < defaultNames.length; i++) {
      const name = defaultNames[i]
      const category = byName.get(name.toLowerCase())
      if (category) {
        await ctx.db.patch(category._id, { isDefault: true, order: i })
      } else {
        await ctx.db.insert('categories', {
          userId,
          name,
          isDefault: true,
          order: i
        })
      }
    }

    for (const name of customNames) {
      if (byName.has(name.toLowerCase())) continue
      await ctx.db.insert('categories', {
        userId,
        name,
        isDefault: false,
        order: 999
      })
    }

    return { ok: true }
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

export const listByApiKey = internalQuery({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const keyDoc = await findApiKey(ctx, args.apiKey)
    if (!keyDoc) return []
    return await ctx.db
      .query('categories')
      .withIndex('by_user', q => q.eq('userId', keyDoc.userId))
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
