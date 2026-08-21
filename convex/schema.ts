import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const schema = defineSchema({
  ...authTables,
  bookmarks: defineTable({
    userId: v.id('users'),
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    favicon: v.optional(v.string()),
    image: v.optional(v.string()),
    collectionId: v.optional(v.id('collections')),
    categoryId: v.optional(v.id('categories')),
    tags: v.optional(v.array(v.string())),
    isRead: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    textContent: v.optional(v.string()),
    isBroken: v.optional(v.boolean()),
    remindAt: v.optional(v.number()),
    publicId: v.optional(v.string()),
    screenshotUrl: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    isTrashed: v.optional(v.boolean()),
    trashedAt: v.optional(v.number())
  })
    .index('by_user', ['userId'])
    .index('by_user_url', ['userId', 'url'])
    .index('by_user_category', ['userId', 'categoryId'])
    .index('by_remindAt', ['remindAt'])
    .index('by_publicId', ['publicId'])
    .index('by_public', ['isPublic'])
    .index('by_trashed', ['isTrashed'])
    .index('by_user_trashed', ['userId', 'isTrashed']),
  collections: defineTable({
    userId: v.id('users'),
    name: v.string(),
    order: v.optional(v.float64()),
    parentId: v.optional(v.id('collections'))
  }).index('by_user', ['userId']),
  apiKeys: defineTable({
    userId: v.id('users'),
    key: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number()
  })
    .index('by_key', ['key'])
    .index('by_user', ['userId']),
  pairingCodes: defineTable({
    code: v.string(),
    apiKey: v.string(),
    convexUrl: v.string(),
    createdAt: v.number()
  }).index('by_code', ['code']),
  pairingAttempts: defineTable({
    identifier: v.string(),
    attempts: v.number(),
    windowStart: v.number()
  }).index('by_identifier', ['identifier']),
  resetTokens: defineTable({
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    consumed: v.optional(v.boolean())
  })
    .index('by_token', ['token'])
    .index('by_email', ['email']),
  sessions: defineTable({
    token: v.string(),
    userId: v.id('users'),
    createdAt: v.number(),
    expiresAt: v.number()
  }).index('by_token', ['token']),
  categories: defineTable({
    userId: v.id('users'),
    name: v.string(),
    isDefault: v.optional(v.boolean()),
    order: v.optional(v.number())
  }).index('by_user', ['userId'])
})

export default schema
