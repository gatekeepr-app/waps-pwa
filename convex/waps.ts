// File: convex/waps.ts

import { v } from 'convex/values'
import { Doc, Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

async function ensureDefaultBoard(
  ctx: any,
  ownerKey: string
): Promise<Doc<'boards'>> {
  const boards = await ctx.db
    .query('boards')
    .withIndex('by_ownerKey', (q: any) => q.eq('ownerKey', ownerKey))
    .collect()
  let def = boards.find((b: any) => b.slug === 'default')
  if (!def) {
    const now = Date.now()
    const _id = await ctx.db.insert('boards', {
      ownerKey,
      name: 'My Waps',
      slug: 'default',
      isPublic: false,
      createdAt: now,
      updatedAt: now
    })
    def = await ctx.db.get(_id)
  }
  return def
}

export const listUserWaps = query({
  args: {
    ownerKey: v.string(),
    search: v.optional(v.string()),
    tag: v.optional(v.string()),
    boardSlug: v.optional(v.string()),
    sort: v.optional(
      v.union(v.literal('recent'), v.literal('az'), v.literal('popular'))
    ),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()) // may be undefined from client
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 24, 100)

    let boardFilterId: Id<'boards'> | null = null
    if (args.boardSlug) {
      const board = await ctx.db
        .query('boards')
        .withIndex('by_slug', q => q.eq('slug', args.boardSlug!))
        .filter(q => q.eq(q.field('ownerKey'), args.ownerKey))
        .first()
      boardFilterId = board?._id ?? null
    }

    let q = ctx.db
      .query('boardItems')
      .withIndex('by_ownerKey', q => q.eq('ownerKey', args.ownerKey))

    if (boardFilterId) {
      q = q.filter(q => q.eq(q.field('boardId'), boardFilterId!))
    }

    // ⬅️ normalize undefined → null here
    const page = await q.order('desc').paginate({
      cursor: args.cursor ?? null, // normalize undefined -> null for Convex paginate()
      numItems: limit
    })

    const items = await Promise.all(
      page.page.map(async bi => {
        const site = await ctx.db.get(bi.websiteId)
        return site
          ? {
              _id: bi._id,
              createdAt: bi.createdAt,
              boardId: bi.boardId,
              websiteId: bi.websiteId,
              notes: bi.notes,
              website: {
                _id: site._id,
                title: site.title,
                slug: site.slug,
                canonicalUrl: site.canonicalUrl,
                origin: site.origin,
                faviconUrl: site.faviconUrl,
                ogImageUrl: site.ogImageUrl,
                categories: site.categories,
                saveCount: site.saveCount
              }
            }
          : null
      })
    )

    const search = (args.search ?? '').trim().toLowerCase()
    const tag = (args.tag ?? '').trim().toLowerCase()

    let filtered = items.filter((x): x is NonNullable<typeof x> => !!x)

    if (search) {
      filtered = filtered.filter(x => {
        const hay =
          `${x.website.title} ${x.website.canonicalUrl} ${x.website.origin}`.toLowerCase()
        return hay.includes(search)
      })
    }

    if (tag) {
      filtered = filtered.filter(x =>
        (x.website.categories ?? []).some(c => c.toLowerCase() === tag)
      )
    }

    const sort = args.sort ?? 'recent'
    if (sort === 'az') {
      filtered = filtered.sort((a, b) =>
        a.website.title.localeCompare(b.website.title)
      )
    } else if (sort === 'popular') {
      filtered = filtered.sort(
        (a, b) => (b.website.saveCount ?? 0) - (a.website.saveCount ?? 0)
      )
    }

    return {
      items: filtered,
      // keep the server return type as string | null (Convex-native)
      pageInfo: {
        cursor: page.continueCursor,
        hasMore: page.isDone ? false : true
      }
    }
  }
})

export const removeFromBoard = mutation({
  args: { ownerKey: v.string(), boardItemId: v.id('boardItems') },
  handler: async (ctx, { ownerKey, boardItemId }) => {
    const bi = await ctx.db.get(boardItemId)
    if (!bi || bi.ownerKey !== ownerKey)
      throw new Error('Not found or not yours')
    await ctx.db.delete(boardItemId)
    return { ok: true }
  }
})

/**
 * getWebsiteDetails
 * Returns website by slug + whether the current owner saved it, and (optionally) the boardItemId.
 */
export const getWebsiteDetails = query({
  args: {
    slug: v.string(),
    ownerKey: v.optional(v.string())
  },
  handler: async (ctx, { slug, ownerKey }) => {
    const website = await ctx.db
      .query('websites')
      .withIndex('by_slug', q => q.eq('slug', slug))
      .first()
    if (!website) return null

    let isSaved = false
    let boardItemId: Id<'boardItems'> | null = null

    if (ownerKey) {
      const bi = await ctx.db
        .query('boardItems')
        .withIndex('by_ownerKey', q => q.eq('ownerKey', ownerKey))
        .filter(q => q.eq(q.field('websiteId'), website._id))
        .first()
      if (bi) {
        isSaved = true
        boardItemId = bi._id
      }
    }

    let notes: string | undefined
    if (boardItemId) {
      const bi = await ctx.db.get(boardItemId)
      notes = bi?.notes
    }

    return {
      website: {
        _id: website._id,
        title: website.title,
        slug: website.slug,
        description: website.description,
        canonicalUrl: website.canonicalUrl,
        origin: website.origin,
        faviconUrl: website.faviconUrl,
        ogImageUrl: website.ogImageUrl,
        categories: website.categories,
        saveCount: website.saveCount,
        publicSaveCount: website.publicSaveCount ?? 0,
        createdAt: website.createdAt,
        updatedAt: website.updatedAt
      },
      isSaved,
      boardItemId,
      notes
    }
  }
})

export const listBoardsByOwner = query({
  args: { ownerKey: v.string() },
  handler: async (ctx, { ownerKey }) => {
    const boards = await ctx.db
      .query('boards')
      .withIndex('by_ownerKey', q => q.eq('ownerKey', ownerKey))
      .order('desc')
      .collect()

    return boards.map(b => ({
      _id: b._id,
      name: b.name,
      slug: b.slug,
      isPublic: b.isPublic
    }))
  }
})

export const getSimilarWebsites = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const seed = await ctx.db
      .query('websites')
      .withIndex('by_slug', q => q.eq('slug', slug))
      .first()
    if (!seed) return []

    const cats = seed.categories ?? []
    if (cats.length === 0) return []

    const popular = await ctx.db
      .query('websites')
      .withIndex('by_publicSaveCount')
      .order('desc')
      .collect()

    const filtered = popular
      .filter(w => w._id !== seed._id)
      .filter(w => (w.categories ?? []).some(c => cats.includes(c)))
      .sort((a, b) => {
        const psA = a.publicSaveCount ?? 0
        const psB = b.publicSaveCount ?? 0
        if (psB !== psA) return psB - psA
        return (b.saveCount ?? 0) - (a.saveCount ?? 0)
      })
      .slice(0, Math.min(limit ?? 8, 24))

    return filtered.map(w => ({
      _id: w._id,
      title: w.title,
      slug: w.slug,
      canonicalUrl: w.canonicalUrl,
      origin: w.origin,
      faviconUrl: w.faviconUrl,
      ogImageUrl: w.ogImageUrl,
      categories: w.categories,
      saveCount: w.saveCount,
      publicSaveCount: w.publicSaveCount ?? 0
    }))
  }
})

export const addToBoard = mutation({
  args: {
    ownerKey: v.string(),
    websiteSlug: v.string(),
    boardSlug: v.optional(v.string())
  },
  handler: async (ctx, { ownerKey, websiteSlug, boardSlug }) => {
    const boardSlugFinal = (boardSlug && boardSlug.trim()) || 'default'

    // 1) Resolve website
    const website = await ctx.db
      .query('websites')
      .withIndex('by_slug', q => q.eq('slug', websiteSlug))
      .first()
    if (!website) throw new Error('Website not found')

    // 2) Resolve or create board (ownerKey + boardSlugFinal)
    let board = await ctx.db
      .query('boards')
      .withIndex('by_ownerKey', q => q.eq('ownerKey', ownerKey))
      .filter(q => q.eq(q.field('slug'), boardSlugFinal))
      .first()

    if (!board) {
      const now = Date.now()
      const id = await ctx.db.insert('boards', {
        ownerKey,
        name: boardSlugFinal === 'default' ? 'My Waps' : boardSlugFinal,
        slug: boardSlugFinal,
        isPublic: false,
        createdAt: now,
        updatedAt: now
      })
      board = await ctx.db.get(id)
    }

    // 3) Already saved?
    const existing = await ctx.db
      .query('boardItems')
      .withIndex('by_ownerKey', q => q.eq('ownerKey', ownerKey))
      .filter(q => q.eq(q.field('websiteId'), website._id))
      .first()

    if (existing) {
      return { ok: true, alreadySaved: true, boardItemId: existing._id }
    }

    // 4) Insert boardItem
    const boardItemId = await ctx.db.insert('boardItems', {
      ownerKey,
      boardId: board!._id,
      websiteId: website._id,
      createdAt: Date.now()
    })

    // 5) Increment website.saveCount (simple patch; acceptable for now)
    await ctx.db.patch(website._id, { saveCount: (website.saveCount ?? 0) + 1 })

    return { ok: true, alreadySaved: false, boardItemId }
  }
})

/** Move a boardItem to a different board. */
export const moveToBoard = mutation({
  args: {
    boardItemId: v.id('boardItems'),
    targetBoardId: v.id('boards'),
    ownerKey: v.string()
  },
  handler: async (ctx, { boardItemId, targetBoardId, ownerKey }) => {
    const item = await ctx.db.get(boardItemId)
    if (!item || item.ownerKey !== ownerKey) throw new Error('Forbidden')
    const board = await ctx.db.get(targetBoardId)
    if (!board || board.ownerKey !== ownerKey) throw new Error('Forbidden')

    await ctx.db.patch(boardItemId, { boardId: targetBoardId })
    return { ok: true }
  }
})

/** Bulk import bookmarks from a browser export. */
export const bulkImport = mutation({
  args: {
    ownerKey: v.string(),
    bookmarks: v.array(
      v.object({
        url: v.string(),
        title: v.string()
      })
    )
  },
  handler: async (ctx, { ownerKey, bookmarks }) => {
    const board = await ensureDefaultBoard(ctx, ownerKey)
    let added = 0
    let skipped = 0
    const existingWebsites = await ctx.db.query('websites').collect()
    const urlMap = new Map(existingWebsites.map(w => [w.canonicalUrl, w]))

    const existingItems = await ctx.db
      .query('boardItems')
      .withIndex('by_ownerKey', q => q.eq('ownerKey', ownerKey))
      .collect()
    const existingWebsiteIds = new Set(existingItems.map(i => i.websiteId))

    const now = Date.now()

    for (const bm of bookmarks) {
      const canonicalUrl = bm.url.replace(/\/$/, '') + '/'
      const origin = (() => {
        try {
          return new URL(bm.url).hostname.replace(/^www\./, '')
        } catch {
          return ''
        }
      })()
      if (!origin) continue

      const existingWebsite = urlMap.get(canonicalUrl)
      if (existingWebsite) {
        if (existingWebsiteIds.has(existingWebsite._id)) {
          skipped++
          continue
        }
        await ctx.db.insert('boardItems', {
          ownerKey,
          boardId: board._id,
          websiteId: existingWebsite._id,
          notes: undefined,
          createdAt: now
        })
        await ctx.db.patch(existingWebsite._id, {
          saveCount: (existingWebsite.saveCount ?? 0) + 1,
          updatedAt: now
        })
        added++
        continue
      }

      const id = await ctx.db.insert('websites', {
        slug: slugify(bm.title || origin),
        title: bm.title || origin,
        description: `${bm.title || origin} — imported from bookmarks`,
        origin,
        canonicalUrl,
        categories: [],
        saveCount: 1,
        publicSaveCount: 0,
        createdAt: now,
        updatedAt: now
      })
      urlMap.set(canonicalUrl, (await ctx.db.get(id))!)

      await ctx.db.insert('boardItems', {
        ownerKey,
        boardId: board._id,
        websiteId: id,
        notes: undefined,
        createdAt: now
      })

      added++
    }

    return { added, skipped }
  }
})
