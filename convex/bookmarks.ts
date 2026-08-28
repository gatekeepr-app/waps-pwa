import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation, mutation, query } from './_generated/server'

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

export const list = query({
  args: {
    collectionId: v.optional(v.id('collections')),
    categoryId: v.optional(v.id('categories')),
    tag: v.optional(v.string()),
    read: v.optional(v.boolean()),
    search: v.optional(v.string()),
    sessionToken: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) return []

    let q
    if (args.categoryId) {
      q = ctx.db
        .query('bookmarks')
        .withIndex('by_user_category', (q: any) =>
          q.eq('userId', userId).eq('categoryId', args.categoryId)
        )
    } else {
      q = ctx.db
        .query('bookmarks')
        .withIndex('by_user', (q: any) => q.eq('userId', userId))
    }
    if (args.collectionId)
      q = q.filter((doc: any) =>
        doc.eq(doc.field('collectionId'), args.collectionId)
      )
    const all = await q.order('desc').collect()

    const categories = await ctx.db
      .query('categories')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect()
    const categoryNames = new Map(
      categories.map((c: any) => [c._id, c.name as string])
    )

    let filtered = all.map((b: any) => ({
      ...b,
      categoryName: b.categoryId ? categoryNames.get(b.categoryId) : undefined
    }))
    if (args.tag)
      filtered = filtered.filter((b: any) => b.tags?.includes(args.tag))
    if (args.read !== undefined)
      filtered = filtered.filter((b: any) => b.isRead === args.read)
    if (args.search) {
      const s = args.search.toLowerCase()
      filtered = filtered.filter(
        (b: any) =>
          (b.title ?? '').toLowerCase().includes(s) ||
          b.url.toLowerCase().includes(s) ||
          (b.description ?? '').toLowerCase().includes(s) ||
          (b.textContent ?? '').toLowerCase().includes(s)
      )
    }
    filtered = filtered.filter((b: any) => !b.isTrashed)
    return filtered.sort(
      (a: any, b: any) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
    )
  }
})

export const getById = query({
  args: { id: v.id('bookmarks'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) return null
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) return null
    return b
  }
})

/** Normalize a URL: default scheme, lowercase host, drop www and
 *  trailing slashes, keep path/query, drop hash. Returns null if invalid. */
export function normalizeUrlInput(raw: string): string | null {
  let s = raw.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  let u: URL
  try {
    u = new URL(s)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  const host = u.hostname.toLowerCase().replace(/^www\./, '')
  const path = u.pathname.replace(/\/+$/, '')
  for (const key of Array.from(u.searchParams.keys())) {
    if (
      key.toLowerCase().startsWith('utm_') ||
      key === 'fbclid' ||
      key === 'gclid'
    ) {
      u.searchParams.delete(key)
    }
  }
  return `${u.protocol}//${host}${path}${u.search}`
}

/** Candidate stored forms that normalize to the same URL as `raw`
 *  (covers rows saved before normalization existed). */
function urlVariants(raw: string): string[] {
  const normalized = normalizeUrlInput(raw)
  if (!normalized) return []
  let u: URL
  try {
    u = new URL(normalized)
  } catch {
    return [normalized]
  }
  const hosts = [u.hostname]
  if (!u.hostname.startsWith('www.')) hosts.push('www.' + u.hostname)
  const paths = [u.pathname]
  if (u.pathname.endsWith('/')) paths.push(u.pathname.slice(0, -1))
  else if (u.pathname !== '/') paths.push(u.pathname + '/')
  const out = new Set<string>()
  for (const proto of ['https:', 'http:']) {
    for (const h of hosts) {
      for (const p of paths) {
        out.add(`${proto}//${h}${p}${u.search}`)
      }
    }
  }
  return Array.from(out)
}

async function findExisting(
  ctx: any,
  userId: any,
  rawUrl: string
): Promise<any | null> {
  for (const candidate of urlVariants(rawUrl)) {
    const hit = await ctx.db
      .query('bookmarks')
      .withIndex('by_user_url', (q: any) =>
        q.eq('userId', userId).eq('url', candidate)
      )
      .first()
    if (hit && !hit.isTrashed) return hit
  }
  return null
}

async function findAnyExisting(ctx: any, rawUrl: string): Promise<any | null> {
  for (const candidate of urlVariants(rawUrl)) {
    const hit = await ctx.db
      .query('bookmarks')
      .withIndex('by_url', (q: any) => q.eq('url', candidate))
      .first()
    if (hit && !hit.isTrashed) return hit
  }
  return null
}

async function hasOtherConnection(ctx: any, bookmark: any): Promise<boolean> {
  const sameUrl = await ctx.db
    .query('bookmarks')
    .withIndex('by_url', (q: any) => q.eq('url', bookmark.url))
    .filter((q: any) =>
      q.and(
        q.neq(q.field('_id'), bookmark._id),
        q.neq(q.field('isTrashed'), true)
      )
    )
    .first()
  if (sameUrl) return true
  const all = await ctx.db
    .query('bookmarks')
    .filter((q: any) => q.neq(q.field('isTrashed'), true))
    .collect()
  return all.some((b: any) => b.sourceBookmarkId === bookmark._id)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

/** Maintain the global per-URL saver counter used by trending/explore. */
async function bumpUrlStat(ctx: any, url: string, delta: number) {
  const doc = await ctx.db
    .query('urlStats')
    .withIndex('by_url', (q: any) => q.eq('url', url))
    .first()
  if (!doc) {
    if (delta > 0)
      await ctx.db.insert('urlStats', {
        url,
        savers: delta,
        lastSavedAt: Date.now()
      })
    return
  }
  const savers = (doc.savers ?? 0) + delta
  if (savers <= 0) {
    await ctx.db.delete(doc._id)
    return
  }
  await ctx.db.patch(doc._id, {
    savers,
    lastSavedAt: delta > 0 ? Date.now() : doc.lastSavedAt
  })
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'you',
  'your',
  'how',
  'why',
  'what',
  'when',
  'where',
  'this',
  'that',
  'from',
  'into',
  'about',
  'https',
  'http',
  'www',
  'com',
  'org',
  'net',
  'app',
  'get',
  'all',
  'are',
  'was',
  'has',
  'have',
  'can',
  'not',
  'but',
  'our',
  'one',
  'two',
  'use',
  'using',
  'new',
  'best',
  'top',
  'guide',
  'tutorial',
  'free',
  'online',
  'official',
  'home',
  'page',
  'site',
  'docs',
  'blog'
])

export const add = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    collectionId: v.optional(v.id('collections')),
    categoryId: v.optional(v.id('categories')),
    isPublic: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const url = normalizeUrlInput(args.url)
    if (!url) throw new Error('Invalid URL')
    const existing = await findExisting(ctx, userId, url)
    if (existing) throw new Error('Bookmark already exists')
    const source = await findAnyExisting(ctx, url)
    await bumpUrlStat(ctx, url, 1)
    const bookmarkId = await ctx.db.insert('bookmarks', {
      userId,
      url,
      sourceBookmarkId: source?._id,
      title: args.title ?? source?.title,
      description: args.description,
      collectionId: args.collectionId,
      categoryId: args.categoryId,
      isPublic: args.isPublic,
      favicon: source?.favicon,
      image: source?.image,
      isBroken: source?.isBroken
    })
    if (!source) {
      await ctx.scheduler.runAfter(
        0,
        (internal as any).metadata.fetchMetadata,
        {
          bookmarkId,
          url
        }
      )
    }
    return bookmarkId
  }
})

export const shareQuickAdd = mutation({
  args: { sessionToken: v.optional(v.string()), url: v.string() },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const url = normalizeUrlInput(args.url)
    if (!url) throw new Error('Invalid URL')
    const existing = await findExisting(ctx, userId, url)
    if (existing) return existing._id
    await bumpUrlStat(ctx, url, 1)
    const bookmarkId = await ctx.db.insert('bookmarks', {
      userId,
      url
    })
    await ctx.scheduler.runAfter(0, (internal as any).metadata.fetchMetadata, {
      bookmarkId,
      url
    })
    return bookmarkId
  }
})

/** Live check while typing: has THIS user already saved this URL? */
export const checkDuplicate = query({
  args: { sessionToken: v.optional(v.string()), url: v.string() },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId || !normalizeUrlInput(args.url)) return { exists: false }
    const existing = await findExisting(ctx, userId, args.url)
    return { exists: !!existing, bookmarkId: existing?._id ?? null }
  }
})

/** Cross-user signal: how many distinct users have saved this URL?
 *  Powers the "people are loving this link" nudge. */
export const linkPopularity = query({
  args: { url: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!normalizeUrlInput(args.url)) return { users: 0, mine: false }
    const me = await resolveUserId(ctx, args.sessionToken)
    const users = new Set<string>()
    let mine = false
    for (const candidate of urlVariants(args.url)) {
      const hits = await ctx.db
        .query('bookmarks')
        .withIndex('by_url', (q: any) => q.eq('url', candidate))
        .collect()
      for (const h of hits) {
        users.add(h.userId)
        if (h.userId === me) mine = true
      }
    }
    return { users: users.size, mine }
  }
})

export const togglePin = mutation({
  args: { id: v.id('bookmarks'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    await ctx.db.patch(args.id, { isPinned: !b.isPinned })
  }
})

export const toggleRead = mutation({
  args: { id: v.id('bookmarks'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    await ctx.db.patch(args.id, { isRead: !b.isRead })
  }
})

export const togglePublic = mutation({
  args: { id: v.id('bookmarks'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    await ctx.db.patch(args.id, { isPublic: !b.isPublic })
  }
})

function publicView(b: any) {
  return {
    _id: b._id,
    _creationTime: b._creationTime,
    url: b.url,
    title: b.title,
    description: b.description,
    favicon: b.favicon,
    image: b.image,
    tags: b.tags,
    isPinned: b.isPinned,
    publicId: b.publicId
  }
}

export const listPublic = query({
  args: {},
  handler: async ctx => {
    const all = await ctx.db
      .query('bookmarks')
      .withIndex('by_public', (q: any) => q.eq('isPublic', true))
      .order('desc')
      .collect()
    return all.map(publicView)
  }
})

export const addTag = mutation({
  args: {
    id: v.id('bookmarks'),
    tag: v.string(),
    sessionToken: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    const tags = [...(b.tags ?? []), args.tag]
    await ctx.db.patch(args.id, { tags })
  }
})

export const removeTag = mutation({
  args: {
    id: v.id('bookmarks'),
    tag: v.string(),
    sessionToken: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    const tags = (b.tags ?? []).filter((t: string) => t !== args.tag)
    await ctx.db.patch(args.id, { tags })
  }
})

export const setTags = mutation({
  args: {
    bookmarkId: v.id('bookmarks'),
    tags: v.array(v.string()),
    sessionToken: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.bookmarkId)
    if (!b || b.userId !== userId) throw new Error('Not found')
    await ctx.db.patch(args.bookmarkId, { tags: args.tags })
  }
})

export const updateCollection = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    bookmarkId: v.id('bookmarks'),
    collectionId: v.optional(v.id('collections'))
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.bookmarkId)
    if (!b || b.userId !== userId) throw new Error('Not found')
    await ctx.db.patch(args.bookmarkId, { collectionId: args.collectionId })
  }
})

export const batchDelete = mutation({
  args: {
    ids: v.array(v.id('bookmarks')),
    sessionToken: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    for (const id of args.ids) {
      const b = await ctx.db.get(id)
      if (b && b.userId === userId) {
        await bumpUrlStat(ctx, b.url, -1)
        await ctx.db.delete(id)
      }
    }
  }
})

export const batchMoveCollection = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    ids: v.array(v.id('bookmarks')),
    collectionId: v.optional(v.id('collections'))
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    for (const id of args.ids) {
      const b = await ctx.db.get(id)
      if (b && b.userId === userId)
        await ctx.db.patch(id, { collectionId: args.collectionId })
    }
  }
})

export const importAll = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    bookmarks: v.array(
      v.object({
        url: v.string(),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string()))
      })
    )
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const seen = new Set<string>()
    const summary = { added: 0, duplicates: 0, invalid: 0 }
    for (const b of args.bookmarks) {
      const url = normalizeUrlInput(b.url)
      if (!url) {
        summary.invalid++
        continue
      }
      if (seen.has(url)) {
        summary.duplicates++
        continue
      }
      seen.add(url)
      const existing = await findExisting(ctx, userId, url)
      if (!existing) {
        const id = await ctx.db.insert('bookmarks', {
          userId,
          url,
          title: b.title,
          description: b.description,
          tags: b.tags
        })
        await ctx.scheduler.runAfter(
          0,
          (internal as any).metadata.fetchMetadata,
          { bookmarkId: id, url }
        )
        summary.added++
      } else {
        summary.duplicates++
      }
    }
    return summary
  }
})

export const updateMetadata = internalMutation({
  args: {
    bookmarkId: v.id('bookmarks'),
    title: v.optional(v.string()),
    image: v.optional(v.string()),
    favicon: v.optional(v.string()),
    textContent: v.optional(v.string()),
    isBroken: v.optional(v.boolean()),
    screenshotUrl: v.optional(v.string()),
    description: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const patch: Record<string, any> = {}
    if (args.title !== undefined) patch.title = args.title
    if (args.image !== undefined) patch.image = args.image
    if (args.favicon !== undefined) patch.favicon = args.favicon
    if (args.textContent !== undefined) patch.textContent = args.textContent
    if (args.isBroken !== undefined) patch.isBroken = args.isBroken
    if (args.screenshotUrl !== undefined)
      patch.screenshotUrl = args.screenshotUrl
    if (args.description !== undefined) patch.description = args.description
    await ctx.db.patch(args.bookmarkId, patch)
  }
})

export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id('bookmarks'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    categoryId: v.optional(v.union(v.id('categories'), v.null()))
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    const patch: Record<string, any> = {}
    if (args.title !== undefined) patch.title = args.title
    if (args.description !== undefined) patch.description = args.description
    if (args.url !== undefined) patch.url = args.url
    if (args.categoryId !== undefined && args.categoryId !== null) {
      const cat = await ctx.db.get(args.categoryId)
      if (!cat || cat.userId !== userId) throw new Error('Invalid category')
    }
    if (args.categoryId !== undefined)
      patch.categoryId = args.categoryId ?? undefined
    await ctx.db.patch(args.id, patch)
  }
})

export const setReminder = mutation({
  args: {
    id: v.id('bookmarks'),
    remindAt: v.optional(v.number()),
    sessionToken: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    await ctx.db.patch(args.id, { remindAt: args.remindAt })
  }
})

export const remove = mutation({
  args: {
    id: v.id('bookmarks'),
    sessionToken: v.optional(v.string()),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const bookmark = await ctx.db.get(args.id)
    if (!bookmark || bookmark.userId !== userId) throw new Error('Not found')
    if (await hasOtherConnection(ctx, bookmark)) {
      await ctx.db.patch(args.id, {
        isTrashed: true,
        trashedAt: Date.now(),
        removalReason: args.reason
      })
      return { deleted: false }
    }
    await bumpUrlStat(ctx, bookmark.url, -1)
    await ctx.db.delete(args.id)
    return { deleted: true }
  }
})

export const restore = mutation({
  args: { id: v.id('bookmarks'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    await ctx.db.patch(args.id, { isTrashed: undefined, trashedAt: undefined })
  }
})

export const permanentDelete = mutation({
  args: { id: v.id('bookmarks'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    if (await hasOtherConnection(ctx, b)) {
      await ctx.db.patch(args.id, { isTrashed: true, trashedAt: Date.now() })
      return { deleted: false }
    }
    await bumpUrlStat(ctx, b.url, -1)
    await ctx.db.delete(args.id)
    return { deleted: true }
  }
})

export const batchMoveCategory = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    ids: v.array(v.id('bookmarks')),
    categoryId: v.union(v.id('categories'), v.null())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    if (args.categoryId !== null) {
      const cat = await ctx.db.get(args.categoryId)
      if (!cat || cat.userId !== userId) throw new Error('Invalid category')
    }
    for (const id of args.ids) {
      const b = await ctx.db.get(id)
      if (b && b.userId === userId) {
        await ctx.db.patch(id, { categoryId: args.categoryId ?? undefined })
      }
    }
  }
})

export const refreshMetadata = mutation({
  args: { id: v.id('bookmarks'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    await ctx.scheduler.runAfter(0, (internal as any).metadata.fetchMetadata, {
      bookmarkId: args.id,
      url: b.url
    })
    return { ok: true }
  }
})

export const emptyTrash = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const trashed = await ctx.db
      .query('bookmarks')
      .withIndex('by_user_trashed', (q: any) =>
        q.eq('userId', userId).eq('isTrashed', true)
      )
      .collect()
    for (const b of trashed) {
      if (await hasOtherConnection(ctx, b)) continue
      await bumpUrlStat(ctx, b.url, -1)
      await ctx.db.delete(b._id)
    }
  }
})

export const listTrash = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) return []
    return await ctx.db
      .query('bookmarks')
      .withIndex('by_user_trashed', (q: any) =>
        q.eq('userId', userId).eq('isTrashed', true)
      )
      .order('desc')
      .collect()
  }
})

export const listAllTags = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) return []
    const all = await ctx.db
      .query('bookmarks')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect()
    const tagMap = new Map<string, number>()
    for (const b of all) {
      if (!b.isTrashed && b.tags) {
        for (const tag of b.tags) {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
        }
      }
    }
    return Array.from(tagMap.entries()).map(([tag, count]) => ({ tag, count }))
  }
})

export const renameTag = mutation({
  args: {
    oldTag: v.string(),
    newTag: v.string(),
    sessionToken: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const all = await ctx.db
      .query('bookmarks')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect()
    for (const b of all) {
      if (b.tags?.includes(args.oldTag)) {
        const updated = b.tags.map((t: string) =>
          t === args.oldTag ? args.newTag : t
        )
        await ctx.db.patch(b._id, { tags: updated })
      }
    }
  }
})

export const purgeOldTrash = mutation({
  args: {},
  handler: async ctx => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const trashed = await ctx.db
      .query('bookmarks')
      .withIndex('by_trashed', (q: any) => q.eq('isTrashed', true))
      .collect()
    for (const b of trashed) {
      if (b.trashedAt && b.trashedAt < thirtyDaysAgo) {
        if (await hasOtherConnection(ctx, b)) continue
        await bumpUrlStat(ctx, b.url, -1)
        await ctx.db.delete(b._id)
      }
    }
  }
})

export const removeTagFromAll = mutation({
  args: { tag: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const all = await ctx.db
      .query('bookmarks')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect()
    for (const b of all) {
      if (b.tags?.includes(args.tag)) {
        await ctx.db.patch(b._id, {
          tags: b.tags.filter((t: string) => t !== args.tag)
        })
      }
    }
  }
})

export const getRemindersDue = query({
  args: { now: v.number(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) return []
    const due = await ctx.db
      .query('bookmarks')
      .withIndex('by_remindAt', (q: any) => q.lte('remindAt', args.now))
      .filter((doc: any) => doc.neq(doc.field('remindAt'), undefined))
      .collect()
    return due.filter((b: any) => b.userId === userId)
  }
})

export const listByUser = query({
  args: {
    sessionToken: v.optional(v.string()),
    apiKey: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId && args.apiKey) {
      const keyDoc = await ctx.db
        .query('apiKeys')
        .withIndex('by_key', (q: any) => q.eq('key', args.apiKey))
        .first()
      if (keyDoc) userId = keyDoc.userId
    }
    if (!userId) return []
    return await ctx.db
      .query('bookmarks')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .order('desc')
      .take(10)
  }
})

export const getAll = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) return []
    return await ctx.db
      .query('bookmarks')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect()
  }
})

export const addByHttp = mutation({
  args: {
    userId: v.id('users'),
    url: v.string(),
    title: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const url = normalizeUrlInput(args.url)
    if (!url) throw new Error('Invalid URL')
    const existing = await findExisting(ctx, args.userId, url)
    if (existing) throw new Error(`Bookmark already exists:${existing._id}`)
    const source = await findAnyExisting(ctx, url)
    await bumpUrlStat(ctx, url, 1)
    const id = await ctx.db.insert('bookmarks', {
      userId: args.userId,
      url,
      sourceBookmarkId: source?._id,
      title: args.title ?? source?.title,
      favicon: source?.favicon,
      image: source?.image,
      isBroken: source?.isBroken
    })
    if (!source) {
      await ctx.scheduler.runAfter(
        0,
        (internal as any).metadata.fetchMetadata,
        {
          bookmarkId: id,
          url
        }
      )
    }
    return id
  }
})

export const getByPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const b = await ctx.db
      .query('bookmarks')
      .withIndex('by_publicId', (q: any) => q.eq('publicId', args.publicId))
      .first()
    return b ? publicView(b) : null
  }
})

/** #1+#7: Explore feed with engagement-weighted ranking.
 *  score = log-scaled saver count, share-link boost, HN-style time decay. */
export const exploreFeed = query({
  args: { sort: v.optional(v.union(v.literal('trending'), v.literal('new'))) },
  handler: async (ctx, args) => {
    const sort = args.sort ?? 'trending'
    const pubs = await ctx.db
      .query('bookmarks')
      .withIndex('by_public', (q: any) => q.eq('isPublic', true))
      .collect()
    const now = Date.now()
    const out = []
    for (const b of pubs) {
      const stat = await ctx.db
        .query('urlStats')
        .withIndex('by_url', (q: any) => q.eq('url', b.url))
        .first()
      const savers = stat?.savers ?? 1
      let score = 0
      if (sort === 'trending') {
        const ageHours = Math.max(
          1,
          (now - (stat?.lastSavedAt ?? b._creationTime)) / 3_600_000
        )
        const shareBoost = b.publicId ? 1.25 : 1
        score =
          ((Math.log10(savers * 9 + 1) * 4 + (b.publicId ? 1 : 0)) /
            Math.pow(ageHours + 2, 1.2)) *
          shareBoost
      }
      out.push({ ...publicView(b), savers, score })
    }
    if (sort === 'trending') out.sort((a: any, b: any) => b.score - a.score)
    else out.sort((a: any, b: any) => b._creationTime - a._creationTime)
    return out.slice(0, 60)
  }
})

/** #2: Collaborative filtering - users who saved this URL also saved...
 *  Only surfaces PUBLIC waps the viewer hasn't saved themselves. */
export const relatedWaps = query({
  args: { url: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const savers = new Set<string>()
    for (const candidate of urlVariants(args.url)) {
      const hits = await ctx.db
        .query('bookmarks')
        .withIndex('by_url', (q: any) => q.eq('url', candidate))
        .collect()
      for (const h of hits) savers.add(h.userId)
    }
    savers.delete(
      args.sessionToken
        ? ((await resolveUserId(ctx, args.sessionToken)) ?? '')
        : ''
    )

    const tally = new Map<string, number>()
    let scanned = 0
    for (const uid of Array.from(savers)) {
      if (++scanned > 15) break
      const theirs = await ctx.db
        .query('bookmarks')
        .withIndex('by_user', (q: any) => q.eq('userId', uid))
        .take(300)
      for (const t of theirs) {
        if (t.url === args.url || t.isTrashed) continue
        tally.set(t.url, (tally.get(t.url) ?? 0) + 1)
      }
    }

    const mineSet = new Set<string>()
    const me = await resolveUserId(ctx, args.sessionToken)
    if (me) {
      const mine = await ctx.db
        .query('bookmarks')
        .withIndex('by_user', (q: any) => q.eq('userId', me))
        .collect()
      for (const m of mine) mineSet.add(m.url)
    }

    const results = []
    const sorted = Array.from(tally.entries()).sort((a, b) => b[1] - a[1])
    for (const [u, count] of sorted) {
      if (results.length >= 6) break
      if (mineSet.has(u)) continue
      const pub = await ctx.db
        .query('bookmarks')
        .withIndex('by_url', (q: any) => q.eq('url', u))
        .filter((q: any) => q.eq(q.field('isPublic'), true))
        .first()
      if (pub) results.push({ ...publicView(pub), coSaves: count })
    }
    return results
  }
})

/** #3: Similar waps from the owner's own library.
 *  same domain +3, shared tags +1 each, same category +2. */
export const similarTo = query({
  args: { id: v.id('bookmarks'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) return []
    const base = await ctx.db.get(args.id)
    if (!base || base.userId !== userId) return []
    const all = await ctx.db
      .query('bookmarks')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect()
    const baseHost = hostOf(base.url)
    const baseTags = new Set(base.tags ?? [])
    return all
      .filter((x: any) => x._id !== base._id && !x.isTrashed && !x.isBroken)
      .map((x: any) => {
        let score = 0
        if (x.categoryId && x.categoryId === base.categoryId) score += 2
        if (baseHost && hostOf(x.url) === baseHost) score += 3
        for (const t of x.tags ?? []) if (baseTags.has(t)) score += 1
        return { ...publicView(x), matchScore: score }
      })
      .filter((x: any) => x.matchScore > 0)
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 6)
  }
})

/** #4: Auto-categorization. Builds keyword/domain profiles per category
 *  from the user's existing library and scores the incoming URL/title. */
export const suggestCategory = query({
  args: {
    sessionToken: v.optional(v.string()),
    url: v.string(),
    title: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.sessionToken)
    if (!userId) return null
    const cats = await ctx.db
      .query('categories')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect()
    if (!cats.length) return null
    const books = await ctx.db
      .query('bookmarks')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect()

    const profile = new Map<
      string,
      { domains: Map<string, number>; tokens: Map<string, number> }
    >()
    for (const c of cats)
      profile.set(c._id, { domains: new Map(), tokens: new Map() })
    for (const b of books) {
      if (!b.categoryId || !profile.has(b.categoryId)) continue
      const p = profile.get(b.categoryId)!
      const h = hostOf(b.url)
      if (h) p.domains.set(h, (p.domains.get(h) ?? 0) + 1)
      const words = `${b.title ?? ''}`.toLowerCase().match(/[a-z]{3,}/g) ?? []
      for (const w of words) {
        if (!STOP_WORDS.has(w)) p.tokens.set(w, (p.tokens.get(w) ?? 0) + 1)
      }
    }

    const host = hostOf(normalizeUrlInput(args.url) ?? args.url)
    const words = `${args.title ?? ''}`.toLowerCase().match(/[a-z]{3,}/g) ?? []

    let best: { categoryId: string; score: number } | null = null
    for (const [cid, p] of Array.from(profile.entries())) {
      let score = 0
      if (host && p.domains.has(host)) score += 5 * (p.domains.get(host) ?? 0)
      // sibling subdomains on the same app host (e.g. *.vercel.app)
      const baseDomain = host.split('.').slice(-2).join('.')
      for (const [d, n] of Array.from(p.domains.entries())) {
        if (d !== host && d.endsWith(baseDomain) && host.endsWith(baseDomain))
          score += 2 * n
      }
      for (const w of words) score += p.tokens.get(w) ?? 0
      if (!best || score > best.score) best = { categoryId: cid, score }
    }

    if (!best || best.score < 3) return null
    const cat = cats.find(c => c._id === best!.categoryId)
    return cat ? { categoryId: cat._id, name: cat.name } : null
  }
})

export const generateShareLink = mutation({
  args: { id: v.id('bookmarks'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, (args as any).sessionToken)
    if (!userId) throw new Error('Not authenticated')
    const b = await ctx.db.get(args.id)
    if (!b || b.userId !== userId) throw new Error('Not found')
    let publicId = b.publicId
    if (!publicId) {
      publicId = crypto.randomUUID().slice(0, 12)
      await ctx.db.patch(args.id, { publicId })
    }
    return publicId
  }
})
