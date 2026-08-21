import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const runMigration = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('categories')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    const catMap = new Map<string, any>()
    for (const c of existing) {
      catMap.set(c.name, c)
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
    let order = existing.length
    for (const name of DEFAULT_CATEGORIES) {
      if (!catMap.has(name)) {
        const id = await ctx.db.insert('categories', {
          userId: args.userId,
          name,
          isDefault: true,
          order: order++
        })
        catMap.set(name, { _id: id, name })
      }
    }

    const workId = catMap.get('Work')?._id
    const learningId = catMap.get('Learning')?._id
    const readingId = catMap.get('Reading')?._id
    const entertainmentId = catMap.get('Entertainment')?._id
    const personalId = catMap.get('Personal')?._id

    const bookmarks = await ctx.db
      .query('bookmarks')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    let assigned = 0
    for (const b of bookmarks) {
      if (b.categoryId) continue
      const tags = (b.tags || []).map(t => t.toLowerCase())
      let catId = personalId

      if (
        tags.some(t =>
          [
            'ai',
            'ai-agent',
            'agents',
            'coding',
            'vibe-coding',
            'opencode',
            'automation',
            'opensource',
            'low-code',
            'enterprise',
            'javascript',
            'json',
            'cli',
            'desktop',
            'web',
            'cloud',
            'development',
            'tools',
            'utilities',
            'engineering'
          ].includes(t)
        )
      ) {
        catId = workId
      } else if (
        tags.some(t =>
          [
            'design',
            'mockup',
            'mockups',
            'brand',
            'branding',
            'assets',
            'generator',
            'logo',
            'logos',
            'svg',
            'templates',
            'motion',
            'annotation',
            'ui',
            'dashboard',
            'halftone',
            'stippling',
            'studio'
          ].includes(t)
        )
      ) {
        catId = workId
      } else if (
        tags.some(t =>
          ['course', 'learning', 'guide', 'setup', 'tutorial'].includes(t)
        )
      ) {
        catId = learningId
      } else if (
        tags.some(t =>
          ['email', 'whatsapp', 'telegram', 'messaging', 'api'].includes(t)
        )
      ) {
        catId = workId
      } else if (
        tags.some(t =>
          ['video', 'lightroom', 'elevenlabs', 'image-generation'].includes(t)
        )
      ) {
        catId = entertainmentId
      } else if (
        tags.some(t => ['privacy', 'torrent', 'downloader'].includes(t))
      ) {
        catId = readingId
      }

      if (catId && !b.categoryId) {
        await ctx.db.patch(b._id, { categoryId: catId })
        assigned++
      }
    }

    return { categoriesTotal: catMap.size, bookmarksAssigned: assigned }
  }
})
