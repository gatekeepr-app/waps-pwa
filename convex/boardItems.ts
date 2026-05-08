// convex/boardItems.ts
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx } from './_generated/server'

/** ---------- helpers ---------- */

async function ensureDefaultBoard(ctx: MutationCtx, ownerKey: string) {
  const now = Date.now()
  const boards = await ctx.db
    .query('boards')
    .withIndex('by_ownerKey', q => q.eq('ownerKey', ownerKey))
    .collect()

  let def = boards.find(b => b.slug === 'default')
  if (!def) {
    const _id = await ctx.db.insert('boards', {
      ownerKey,
      name: 'My Waps',
      slug: 'default',
      isPublic: false,
      createdAt: now,
      updatedAt: now
    })
    def = (await ctx.db.get(_id))!
  }
  return def
}

/** Dedup rule: one website per owner across all boards (no duplicates). */
async function ownerAlreadyHasWebsite(
  ctx: MutationCtx,
  ownerKey: string,
  websiteId: Id<'websites'>
) {
  const byWebsite = await ctx.db
    .query('boardItems')
    .withIndex('by_websiteId', q => q.eq('websiteId', websiteId))
    .collect()

  for (const bi of byWebsite) {
    if (bi.ownerKey !== ownerKey) continue
    // quick check: any item belongs to owner -> duplicate from owner's perspective
    return bi
  }
  return null
}

/** Is this board public? */
async function boardIsPublic(ctx: MutationCtx, boardId: Id<'boards'>) {
  const b = await ctx.db.get(boardId)
  return !!b?.isPublic
}

/** Assert the board belongs to the ownerKey. */
async function assertBoardOwnership(
  ctx: MutationCtx,
  boardId: Id<'boards'>,
  ownerKey: string
) {
  const b = await ctx.db.get(boardId)
  if (!b) throw new Error('Board not found')
  if (b.ownerKey !== ownerKey) throw new Error('Forbidden')
  return b
}

/** ---------- mutations ---------- */

/** Add a website to the owner's default board (create the board if needed). */
export const addToDefault = mutation({
  args: {
    ownerKey: v.string(),
    websiteId: v.id('websites')
  },
  handler: async (ctx, { ownerKey, websiteId }) => {
    // Dedup per owner across all boards
    const existingAnyBoard = await ownerAlreadyHasWebsite(
      ctx,
      ownerKey,
      websiteId
    )
    if (existingAnyBoard) {
      return { boardItemId: existingAnyBoard._id, deduped: true }
    }

    // Ensure default board
    const board = await ensureDefaultBoard(ctx, ownerKey)

    const now = Date.now()
    const boardItemId = await ctx.db.insert('boardItems', {
      ownerKey,
      boardId: board._id,
      websiteId,
      createdAt: now
    })

    // bump counters (public only if board is public)
    const isPublic = board.isPublic === true
    await bumpWebsiteCounters(ctx, websiteId, +1, isPublic ? +1 : 0)

    return { boardItemId, deduped: false }
  }
})

/** Remove a saved website (by boardItemId). */
export const remove = mutation({
  args: {
    ownerKey: v.string(),
    boardItemId: v.id('boardItems')
  },
  handler: async (ctx, { ownerKey, boardItemId }) => {
    const item = await ctx.db.get(boardItemId)
    if (!item) throw new Error('Not found')

    const board = await ctx.db.get(item.boardId)
    if (!board) throw new Error('Board not found')
    if (board.ownerKey !== ownerKey) throw new Error('Forbidden')

    const isPublic = board.isPublic === true

    await ctx.db.delete(boardItemId)
    await bumpWebsiteCounters(ctx, item.websiteId, -1, isPublic ? -1 : 0)

    return { ok: true }
  }
})

/** Update notes on a boardItem (user's personal note for a saved website). */
export const updateNotes = mutation({
  args: {
    ownerKey: v.string(),
    boardItemId: v.id('boardItems'),
    notes: v.optional(v.string())
  },
  handler: async (ctx, { ownerKey, boardItemId, notes }) => {
    const item = await ctx.db.get(boardItemId)
    if (!item) throw new Error('Not found')
    if (item.ownerKey !== ownerKey) throw new Error('Forbidden')

    await ctx.db.patch(boardItemId, { notes: notes || undefined })
    return { ok: true }
  }
})

/** ---------- queries ---------- */

export const listMine = query({
  args: {
    ownerKey: v.string(),
    boardId: v.optional(v.id('boards')),
    q: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { ownerKey, boardId, q, limit }) => {
    const LIM = Math.min(Math.max(limit ?? 500, 10), 2000)
    const search = q?.trim().toLowerCase()

    // 1) All items belonging to this owner (optionally filtered by board)
    let items = await ctx.db
      .query('boardItems')
      .withIndex('by_ownerKey', idx => idx.eq('ownerKey', ownerKey))
      .collect()

    if (boardId) {
      items = items.filter(bi => bi.boardId === boardId)
    }

    // 2) De-dupe websiteIds WITHOUT iterating a Set (avoids downlevel issues)
    const seen = new Set<string>()
    const uniqueWebsiteIds: Id<'websites'>[] = []
    for (const bi of items) {
      const key = bi.websiteId as unknown as string // Convex Id<T> is a branded string
      if (!seen.has(key)) {
        seen.add(key)
        uniqueWebsiteIds.push(bi.websiteId)
      }
    }

    // 3) Limit and load websites
    const limitedWebsiteIds = uniqueWebsiteIds.slice(0, LIM)
    const websites = await Promise.all(
      limitedWebsiteIds.map(id => ctx.db.get(id))
    )

    // 4) Filter (search) and sort (stable)
    const filtered = websites
      .filter((w): w is NonNullable<typeof w> => !!w)
      .filter(w => {
        if (!search) return true
        const hay = `${w.title} ${w.description} ${w.origin}`.toLowerCase()
        return hay.includes(search)
      })
      .sort(
        (a, b) =>
          (b.updatedAt ?? 0) - (a.updatedAt ?? 0) ||
          a.title.localeCompare(b.title)
      )

    // 5) Map to compact shape for UI
    return filtered.map(w => ({
      _id: w._id,
      slug: w.slug,
      title: w.title,
      description: w.description,
      origin: w.origin,
      categories: w.categories ?? [],
      faviconUrl: w.faviconUrl,
      canonicalUrl: w.canonicalUrl,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt
    }))
  }
})

async function bumpWebsiteCounters(
  ctx: MutationCtx,
  websiteId: Id<'websites'>,
  delta: number,
  publicDelta: number
): Promise<void> {
  const w = await ctx.db.get(websiteId)
  if (!w) return
  const saveCount = Math.max(0, (w.saveCount ?? 0) + delta)
  const publicSaveCount = Math.max(0, (w.publicSaveCount ?? 0) + publicDelta)
  await ctx.db.patch(websiteId, {
    saveCount,
    publicSaveCount,
    updatedAt: Date.now()
  })
}

/** Add a website to a specific board (dedup per owner across boards). */
export const addToBoard = mutation({
  args: {
    ownerKey: v.string(),
    boardId: v.id('boards'),
    websiteId: v.id('websites')
  },
  handler: async (ctx, { ownerKey, boardId, websiteId }) => {
    const board = await ctx.db.get(boardId)
    if (!board) throw new Error('Board not found')
    if (board.ownerKey !== ownerKey) throw new Error('Forbidden')

    // Dedup: does this owner already have this website in ANY of their boards?
    const anyItem = await ctx.db
      .query('boardItems')
      .withIndex('by_websiteId', q => q.eq('websiteId', websiteId))
      .collect()
      .then(rows => rows.find(bi => bi.ownerKey === ownerKey))

    if (anyItem) {
      return { boardItemId: anyItem._id, deduped: true }
    }

    const now = Date.now()
    const boardItemId = await ctx.db.insert('boardItems', {
      ownerKey,
      boardId,
      websiteId,
      createdAt: now
    })

    const isPublic = board.isPublic === true
    await bumpWebsiteCounters(ctx, websiteId, +1, isPublic ? +1 : 0)

    return { boardItemId, deduped: false }
  }
})
