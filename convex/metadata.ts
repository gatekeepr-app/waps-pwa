'use node'

import { v } from 'convex/values'
import { lookup } from 'node:dns/promises'
import { internal } from './_generated/api'
import { internalAction } from './_generated/server'

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

const MAX_METADATA_BYTES = 1_000_000
const MAX_REDIRECTS = 3
const MAX_LLM_RESPONSE_BYTES = 64_000

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number)
  if (
    parts.length !== 4 ||
    parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false
  }
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && b >= 18 && b <= 19) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0) ||
    a >= 224
  )
}

function isPrivateIpv6(hostname: string): boolean {
  const value = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!value.includes(':')) return false
  if (value === '::' || value === '::1') return true
  if (
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('fe8') ||
    value.startsWith('fe9') ||
    value.startsWith('fea') ||
    value.startsWith('feb')
  )
    return true
  if (value.startsWith('ff')) return true
  const mappedIpv4 = value.match(/^(?:0*:){0,5}ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return !!mappedIpv4 && isPrivateIpv4(mappedIpv4[1])
}

export function isSafeExternalUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  if (url.username || url.password) return false

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'metadata.google.internal' ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  ) {
    return false
  }
  return true
}

async function assertSafeResolvedHost(raw: string): Promise<void> {
  const url = new URL(raw)
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    throw new Error('Unsafe resolved address')
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (
    addresses.length === 0 ||
    addresses.some(
      address =>
        isPrivateIpv4(address.address) || isPrivateIpv6(address.address)
    )
  ) {
    throw new Error('Unsafe resolved address')
  }
}

async function fetchExternal(
  rawUrl: string,
  init: RequestInit = {}
): Promise<Response> {
  let currentUrl = rawUrl
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    if (!isSafeExternalUrl(currentUrl)) throw new Error('Unsafe external URL')
    await assertSafeResolvedHost(currentUrl)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    let response: Response
    try {
      response = await fetch(currentUrl, {
        ...init,
        redirect: 'manual',
        signal: controller.signal
      })
    } finally {
      clearTimeout(timeout)
    }
    if (response.status < 300 || response.status >= 400) return response
    const location = response.headers.get('location')
    if (!location || redirect === MAX_REDIRECTS)
      throw new Error('Too many redirects')
    currentUrl = new URL(location, currentUrl).toString()
  }
  throw new Error('Too many redirects')
}

async function readLimitedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_METADATA_BYTES) throw new Error('Response too large')
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_METADATA_BYTES) throw new Error('Response too large')
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally {
    reader.releaseLock()
  }
}

function isHtmlResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    contentType === '' ||
    contentType.includes('text/html') ||
    contentType.includes('application/xhtml+xml')
  )
}

export const fetchMetadata = internalAction({
  args: { bookmarkId: v.id('bookmarks'), url: v.string() },
  handler: async (ctx, args) => {
    let favicon: string | undefined
    let image: string | undefined
    let fetchedTitle: string | undefined
    let textContent: string | undefined

    try {
      const domain = new URL(args.url).hostname
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`

      const response = await fetchExternal(args.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      if (!response.ok || !isHtmlResponse(response)) {
        throw new Error('Metadata response is not HTML')
      }
      const html = await readLimitedText(response)

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

    const bookmark = await ctx.runQuery(
      (internal as any).bookmarks.getByIdInternal,
      {
        id: args.bookmarkId
      }
    )
    const hasManualTitle =
      bookmark && (bookmark as any).title && (bookmark as any).title !== ''

    await ctx.runMutation(internal.bookmarks.updateMetadata, {
      bookmarkId: args.bookmarkId,
      title: hasManualTitle ? undefined : fetchedTitle,
      image,
      favicon,
      textContent
    })

    await ctx
      .runAction((internal as any).metadata.suggestTags, {
        bookmarkId: args.bookmarkId,
        title: fetchedTitle ?? '',
        textContent: textContent ?? '',
        url: args.url
      })
      .catch(() => {})
  }
})

export const suggestTags = internalAction({
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

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    let res: Response
    try {
      res = await fetch('https://ollama.com/api/chat', {
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
        }),
        signal: controller.signal
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) return

    const rawResponse = await res.text()
    if (rawResponse.length > MAX_LLM_RESPONSE_BYTES) return
    let data: any
    try {
      data = JSON.parse(rawResponse)
    } catch {
      return
    }
    const raw = data?.message?.content?.trim()
    if (!raw) return

    let result: any
    try {
      result = JSON.parse(raw)
    } catch {
      return
    }
    if (
      result?.tags &&
      Array.isArray(result.tags) &&
      result.tags.every((tag: unknown) => typeof tag === 'string')
    ) {
      await ctx.runMutation((internal as any).bookmarks.setTagsInternal, {
        bookmarkId: args.bookmarkId,
        tags: result.tags
          .slice(0, 3)
          .map((t: string) =>
            t
              .slice(0, 40)
              .toLowerCase()
              .replace(/[^a-z0-9_-]+/g, '-')
              .replace(/^-+|-+$/g, '')
          )
          .filter(Boolean)
      })
    }
    if (typeof result?.description === 'string' && result.description.trim()) {
      const bookmark = await ctx.runQuery(
        (internal as any).bookmarks.getByIdInternal,
        {
          id: args.bookmarkId
        }
      )
      const hasManualDesc = bookmark && (bookmark as any).description
      if (!hasManualDesc) {
        await ctx.runMutation(internal.bookmarks.updateMetadata, {
          bookmarkId: args.bookmarkId,
          description: result.description.trim().slice(0, 280)
        })
      }
    }
  }
})

export const checkDeadLink = internalAction({
  args: { bookmarkId: v.id('bookmarks'), url: v.string() },
  handler: async (ctx, args) => {
    try {
      const res = await fetchExternal(args.url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      await ctx.runMutation(internal.bookmarks.updateMetadata, {
        bookmarkId: args.bookmarkId,
        isBroken: res.status >= 400
      })
    } catch {
      await ctx.runMutation(internal.bookmarks.updateMetadata, {
        bookmarkId: args.bookmarkId,
        isBroken: true
      })
    }
  }
})

export const checkAllDeadLinks = internalAction({
  args: {},
  handler: async ctx => {
    const bookmarks = await ctx.runQuery(
      (internal as any).bookmarks.listAllInternal,
      {}
    )
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

export const captureScreenshot = internalAction({
  args: { bookmarkId: v.id('bookmarks'), url: v.string() },
  handler: async (ctx, args) => {
    const apiUrl = process.env.SCREENSHOT_API_URL
    const apiKey = process.env.SCREENSHOT_API_KEY
    if (!apiUrl) return
    if (!isSafeExternalUrl(args.url)) return
    if (!isSafeExternalUrl(apiUrl)) return

    try {
      let screenshotUrl: string
      if (apiKey) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10_000)
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: args.url, apiKey }),
          signal: controller.signal
        })
        clearTimeout(timeout)
        if (!res.ok) return
        const data = await res.json()
        screenshotUrl = data?.screenshotUrl ?? data?.url ?? data?.image
      } else {
        screenshotUrl = `${apiUrl}${encodeURIComponent(args.url)}`
      }

      if (screenshotUrl) {
        await ctx.runMutation(internal.bookmarks.updateMetadata, {
          bookmarkId: args.bookmarkId,
          screenshotUrl
        })
      }
    } catch {}
  }
})
