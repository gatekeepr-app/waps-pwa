import { v } from 'convex/values'
import { api, internal } from './_generated/api'
import { action } from './_generated/server'

function extractText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000)
}

export const fetchMetadata = action({
  args: { bookmarkId: v.id('bookmarks'), url: v.string() },
  handler: async (ctx, args) => {
    let favicon: string | undefined
    let image: string | undefined
    let fetchedTitle: string | undefined
    let textContent: string | undefined

    try {
      const domain = new URL(args.url).hostname
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`

      const response = await fetch(args.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      const html = await response.text()

      const ogImageMatch = html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/
      )
      if (ogImageMatch) image = ogImageMatch[1]

      const ogTitleMatch = html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/
      )
      if (ogTitleMatch) fetchedTitle = ogTitleMatch[1]

      const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
      if (!fetchedTitle && titleMatch) fetchedTitle = titleMatch[1]

      textContent = extractText(html)
    } catch {}

    const bookmark = await ctx.runQuery(api.bookmarks.getById, {
      id: args.bookmarkId
    })
    const hasManualTitle =
      bookmark && (bookmark as any).title && (bookmark as any).title !== ''

    await ctx.runMutation(api.bookmarks.updateMetadata, {
      bookmarkId: args.bookmarkId,
      title: hasManualTitle ? undefined : fetchedTitle,
      image,
      favicon,
      textContent
    })

    await ctx.runAction((internal as any).metadata.suggestTags, {
      bookmarkId: args.bookmarkId,
      title: fetchedTitle ?? '',
      textContent: textContent ?? '',
      url: args.url
    })
  }
})

export const suggestTags = action({
  args: {
    bookmarkId: v.id('bookmarks'),
    title: v.string(),
    textContent: v.string(),
    url: v.string()
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OLLAMA_API_KEY
    const model = process.env.OLLAMA_MODEL ?? 'gpt-oss:120b'
    if (!apiKey) return

    const domain =
      args.title || args.textContent
        ? `title "${args.title}" and content "${args.textContent.slice(0, 2000)}"`
        : `URL "${args.url}"`

    const prompt = `Given this page ${domain}, return a JSON object with "tags" (2-3 short category tags, single words, lowercase) and "description" (a 1-sentence summary max 140 chars). Format: {"tags":["tag1","tag2"],"description":"summary here"}. Return ONLY valid JSON, nothing else.`

    const res = await fetch('https://ollama.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0.3 }
      })
    })

    if (!res.ok) return

    const data = await res.json()
    const raw = data?.message?.content?.trim()
    if (!raw) return

    const result = JSON.parse(raw)
    if (result?.tags && Array.isArray(result.tags)) {
      await ctx.runMutation(api.bookmarks.setTags, {
        bookmarkId: args.bookmarkId,
        tags: result.tags
          .slice(0, 3)
          .map((t: any) => String(t).toLowerCase().replace(/\s+/g, '-'))
      })
    }
    if (result?.description) {
      const bookmark = await ctx.runQuery(api.bookmarks.getById, {
        id: args.bookmarkId
      })
      const hasManualDesc = bookmark && (bookmark as any).description
      if (!hasManualDesc) {
        await ctx.runMutation(api.bookmarks.updateMetadata, {
          bookmarkId: args.bookmarkId,
          description: result.description.slice(0, 280)
        })
      }
    }
  }
})

export const checkDeadLink = action({
  args: { bookmarkId: v.id('bookmarks'), url: v.string() },
  handler: async (ctx, args) => {
    try {
      const res = await fetch(args.url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      await ctx.runMutation(api.bookmarks.updateMetadata, {
        bookmarkId: args.bookmarkId,
        isBroken: res.status >= 400
      })
    } catch {
      await ctx.runMutation(api.bookmarks.updateMetadata, {
        bookmarkId: args.bookmarkId,
        isBroken: true
      })
    }
  }
})

export const checkAllDeadLinks = action({
  args: {},
  handler: async ctx => {
    const bookmarks = await ctx.runQuery(api.bookmarks.list, {})
    for (const b of bookmarks as any[]) {
      await ctx.scheduler.runAfter(
        0,
        (internal as any).metadata.checkDeadLink,
        {
          bookmarkId: b._id,
          url: b.url
        }
      )
    }
  }
})

export const captureScreenshot = action({
  args: { bookmarkId: v.id('bookmarks'), url: v.string() },
  handler: async (ctx, args) => {
    const apiUrl = process.env.SCREENSHOT_API_URL
    const apiKey = process.env.SCREENSHOT_API_KEY
    if (!apiUrl) return

    try {
      let screenshotUrl: string
      if (apiKey) {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: args.url, apiKey })
        })
        const data = await res.json()
        screenshotUrl = data?.screenshotUrl ?? data?.url ?? data?.image
      } else {
        screenshotUrl = `${apiUrl}${encodeURIComponent(args.url)}`
      }

      if (screenshotUrl) {
        await ctx.runMutation(api.bookmarks.updateMetadata, {
          bookmarkId: args.bookmarkId,
          screenshotUrl
        })
      }
    } catch {}
  }
})
