import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  waitlist: defineTable({
    email: v.string(), // unique by code (we enforce in mutation)
    name: v.optional(v.string()),
    source: v.optional(v.string()), // e.g. "landing", "cta-footer"
    ref: v.optional(v.string()), // referral code that invited them
    referralCode: v.string(), // unique human-readable code for sharing
    createdAt: v.number(), // Date.now()
    updatedAt: v.number()
  })
    .index('by_email', ['email'])
    .index('by_referralCode', ['referralCode'])
    .index('by_createdAt', ['createdAt']),

  boards: defineTable({
    ownerKey: v.string(), // identifies the current owner (local key)
    name: v.string(), // "My Waps", etc
    slug: v.string(), // "default" for default board
    isPublic: v.boolean(), // public board content is used for Explore
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_ownerKey', ['ownerKey'])
    .index('by_slug', ['slug'])
    .index('by_createdAt', ['createdAt']),

  // --- the new boardItems table ---
  boardItems: defineTable({
    ownerKey: v.string(),
    boardId: v.id('boards'),
    websiteId: v.id('websites'),
    notes: v.optional(v.string()),
    createdAt: v.number()
  })
    .index('by_ownerKey', ['ownerKey'])
    .index('by_boardId', ['boardId'])
    .index('by_websiteId', ['websiteId'])
    .index('by_ownerKey_createdAt', ['ownerKey', 'createdAt']),

  websites: defineTable({
    slug: v.string(), // e.g. "notion"
    title: v.string(), // "Notion"
    description: v.string(), // long paragraph
    origin: v.string(), // host only, e.g. "notion.so"
    canonicalUrl: v.string(), // "https://notion.so/"

    // categorization
    categories: v.array(v.string()), // ["Productivity", "Notes"]

    // media
    faviconUrl: v.optional(v.string()),
    faviconFileId: v.optional(v.id('_storage')), // if you upload/host a copy
    ogImageUrl: v.optional(v.string()),

    // who first added it (optional, for attribution/analytics)
    firstAddedByOwnerKey: v.optional(v.string()),

    // denormalized counters (keep these in sync in your mutations)
    saveCount: v.number(), // total saves across all boards (private+public)
    publicSaveCount: v.optional(v.number()), // saves on public boards (for Explore)

    // housekeeping
    createdAt: v.number(), // Date.now()
    updatedAt: v.number(), // Date.now()

    // optional AI metadata (Gemini scan etc.)
    ai: v.optional(
      v.object({
        wasGenerated: v.boolean(), // true if description/title AI-written
        provider: v.optional(v.string()), // "gemini" | "openai" | etc
        status: v.optional(v.string()), // "ok" | "error"
        lastScanAt: v.optional(v.number()), // Date.now()
        error: v.optional(v.string()) // message if failed
      })
    )
  })
    // lookups / constraints you’ll enforce in mutations
    .index('by_slug', ['slug'])
    .index('by_canonicalUrl', ['canonicalUrl'])
    .index('by_origin', ['origin'])
    .index('by_saveCount', ['saveCount'])
    .index('by_publicSaveCount', ['publicSaveCount'])
    .index('by_createdAt', ['createdAt']),

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    passwordHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index('by_email', ['email']),

  sessions: defineTable({
    token: v.string(),
    userId: v.id('users'),
    createdAt: v.number(),
    expiresAt: v.number()
  }).index('by_token', ['token']),

  resetTokens: defineTable({
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    consumed: v.optional(v.boolean())
  })
    .index('by_token', ['token'])
    .index('by_email', ['email'])
})
