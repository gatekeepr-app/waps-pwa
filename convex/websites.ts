import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'

export const exploreFeed = query({
  args: {
    q: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { q, limit }) => {
    const LIM = Math.min(Math.max(limit ?? 120, 10), 300)
    const search = q?.trim().toLowerCase()

    const candidates = await ctx.db
      .query('websites')
      .withIndex('by_saveCount')
      .collect()

    const results: Array<{
      _id: string
      slug: string
      title: string
      description: string
      origin: string
      categories: string[]
      faviconUrl?: string
      canonicalUrl?: string
      publicSaveCount: number
    }> = []

    for (let i = candidates.length - 1; i >= 0; i--) {
      const w = candidates[i]

      if (search) {
        const hay = `${w.title} ${w.description} ${w.origin}`.toLowerCase()
        if (!hay.includes(search)) continue
      }

      const items = await ctx.db
        .query('boardItems')
        .withIndex('by_websiteId', q => q.eq('websiteId', w._id))
        .collect()

      if (!items.length) continue

      const boardIds = Array.from(new Set(items.map(bi => bi.boardId)))
      const boards = await Promise.all(boardIds.map(id => ctx.db.get(id)))
      const boardMap = new Map(boards.filter(Boolean).map(b => [b!._id, b!]))

      const uniqueOwners = new Set<string>()
      for (const bi of items) {
        const board = boardMap.get(bi.boardId)
        if (board?.isPublic) uniqueOwners.add(board.ownerKey)
      }

      const publicSaveCount = uniqueOwners.size
      if (publicSaveCount === 0) continue

      results.push({
        _id: w._id,
        slug: w.slug,
        title: w.title,
        description: w.description,
        origin: w.origin,
        categories: w.categories ?? [],
        faviconUrl: w.faviconUrl,
        canonicalUrl: w.canonicalUrl,
        publicSaveCount
      })

      if (results.length >= LIM) break
    }

    results.sort((a, b) => b.publicSaveCount - a.publicSaveCount)
    return results
  }
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) =>
    (await ctx.db
      .query('websites')
      .withIndex('by_slug', q => q.eq('slug', slug))
      .unique()) ?? null
})

export const listIds = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const LIM = Math.min(Math.max(limit ?? 10000, 1), 10000)
    const rows = await ctx.db
      .query('websites')
      .withIndex('by_createdAt')
      .collect()
    return rows.slice(0, LIM).map(w => w._id)
  }
})

export const listAll = query({
  args: {
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
    sort: v.optional(v.union(v.literal('popular'), v.literal('recent'))),
    minSaveCount: v.optional(v.number())
  },
  handler: async (ctx, { q, limit, sort, minSaveCount }) => {
    const LIM = Math.min(Math.max(limit ?? 120, 10), 500)
    const search = q?.trim().toLowerCase()
    const min = minSaveCount ?? 0

    let rows =
      sort === 'recent'
        ? await ctx.db.query('websites').withIndex('by_createdAt').collect()
        : await ctx.db.query('websites').withIndex('by_saveCount').collect()

    if (min > 0) rows = rows.filter(w => (w.saveCount ?? 0) >= min)

    if (search) {
      rows = rows.filter(w =>
        `${w.title} ${w.description} ${w.origin}`.toLowerCase().includes(search)
      )
    }

    if (sort === 'recent') {
      rows.sort(
        (a, b) => b.createdAt - a.createdAt || a.title.localeCompare(b.title)
      )
    } else {
      rows.sort(
        (a, b) =>
          (b.saveCount ?? 0) - (a.saveCount ?? 0) ||
          b.createdAt - a.createdAt ||
          a.title.localeCompare(b.title)
      )
    }

    return rows.slice(0, LIM).map(w => ({
      _id: w._id,
      slug: w.slug,
      title: w.title,
      description: w.description,
      origin: w.origin,
      categories: w.categories ?? [],
      faviconUrl: w.faviconUrl,
      canonicalUrl: w.canonicalUrl,
      saveCount: w.saveCount ?? 0,
      publicSaveCount: w.publicSaveCount ?? 0,
      createdAt: w.createdAt
    }))
  }
})

export const getByCanonicalUrl = query({
  args: { canonicalUrl: v.string() },
  handler: async (ctx, { canonicalUrl }) => {
    const doc = await ctx.db
      .query('websites')
      .withIndex('by_canonicalUrl', q => q.eq('canonicalUrl', canonicalUrl))
      .unique()
    return doc ?? null
  }
})

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export const upsert = mutation({
  args: {
    canonicalUrl: v.string(),
    origin: v.string(),
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    categories: v.array(v.string()),
    faviconUrl: v.optional(v.string()),
    ogImageUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const existing = await ctx.db
      .query('websites')
      .withIndex('by_canonicalUrl', q =>
        q.eq('canonicalUrl', args.canonicalUrl)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        slug: args.slug || existing.slug,
        description: args.description,
        categories: args.categories,
        faviconUrl: args.faviconUrl ?? existing.faviconUrl,
        ogImageUrl: args.ogImageUrl ?? existing.ogImageUrl,
        origin: args.origin,
        updatedAt: now
      })
      return existing._id
    }

    let finalSlug = slugify(args.slug || args.title)
    const collide = await ctx.db
      .query('websites')
      .withIndex('by_slug', q => q.eq('slug', finalSlug))
      .unique()

    if (collide) {
      finalSlug = `${finalSlug}-${Math.random().toString(36).slice(2, 6)}`
    }

    const _id: Id<'websites'> = await ctx.db.insert('websites', {
      canonicalUrl: args.canonicalUrl,
      origin: args.origin,
      title: args.title,
      slug: finalSlug,
      description: args.description,
      categories: args.categories,
      faviconUrl: args.faviconUrl,
      ogImageUrl: args.ogImageUrl,
      saveCount: 0,
      publicSaveCount: 0,
      createdAt: now,
      updatedAt: now
    })

    return _id
  }
})
