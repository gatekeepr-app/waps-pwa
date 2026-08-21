import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const list = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    return await ctx.db
      .query('collections')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .order('asc')
      .collect()
  }
})

export const add = mutation({
  args: { name: v.string(), parentId: v.optional(v.id('collections')) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const all = await ctx.db
      .query('collections')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect()
    const maxOrder = Math.max(0, ...all.map((c: any) => c.order ?? 0))
    return await ctx.db.insert('collections', {
      userId,
      name: args.name,
      order: maxOrder + 1,
      parentId: args.parentId
    })
  }
})

export const update = mutation({
  args: {
    id: v.id('collections'),
    name: v.optional(v.string()),
    parentId: v.optional(v.id('collections'))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const patch: Record<string, any> = {}
    if (args.name !== undefined) patch.name = args.name
    if (args.parentId !== undefined) patch.parentId = args.parentId
    await ctx.db.patch(args.id, patch)
  }
})

export const reorder = mutation({
  args: { id: v.id('collections'), order: v.float64() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    await ctx.db.patch(args.id, { order: args.order })
  }
})

export const remove = mutation({
  args: { id: v.id('collections') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const collection = await ctx.db.get(args.id)
    if (!collection || collection.userId !== userId)
      throw new Error('Not found')
    await ctx.db.delete(args.id)
  }
})
