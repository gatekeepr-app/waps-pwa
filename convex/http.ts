import { httpRouter } from 'convex/server'
import { api } from './_generated/api'
import { httpAction } from './_generated/server'
import { auth } from './auth'

const http = httpRouter()

auth.addHttpRoutes(http)

http.route({
  path: '/api/add',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.json()
    const apiKey = body?.apiKey
    const url = body?.url
    const title = body?.title

    if (!apiKey || !url) {
      return new Response(
        JSON.stringify({ error: 'apiKey and url required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const keyDoc = await ctx.runQuery(api.apiKeys.validateApiKey, {
      key: apiKey
    })
    if (!keyDoc) {
      return new Response(JSON.stringify({ error: 'Invalid api key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      const id = await ctx.runMutation(api.bookmarks.addByHttp, {
        userId: keyDoc.userId,
        url,
        title: title || undefined
      })
      return new Response(JSON.stringify({ id, url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  })
})

http.route({
  path: '/share/:publicId',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const publicId = url.pathname.split('/').pop()
    if (!publicId) {
      return new Response('Not found', { status: 404 })
    }

    const bookmark = await ctx.runQuery(api.bookmarks.getByPublicId, {
      publicId
    })
    if (!bookmark) {
      return new Response('Not found', { status: 404 })
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#000000">
  <title>${escapeHtml(bookmark.title || 'Shared Wap')}</title>
  ${bookmark.image ? `<meta property="og:image" content="${escapeHtml(bookmark.image)}">` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { max-width: 420px; width: 100%; }
    ${bookmark.image ? `.hero { width: 100%; height: 200px; background: #111; border-radius: 12px; overflow: hidden; margin-bottom: 24px; } .hero img { width: 100%; height: 100%; object-fit: cover; }` : ''}
    ${bookmark.favicon ? `.fav { width: 24px; height: 24px; margin-bottom: 12px; }` : ''}
    h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.3; margin-bottom: 8px; }
    .url { color: #555; font-size: 12px; margin-bottom: 16px; word-break: break-all; }
    .desc { color: #888; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; }
    .tag { color: #333; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .btn { display: inline-flex; align-items: center; justify-content: center; height: 46px; padding: 0 24px; background: #fff; color: #000; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; width: 100%; }
    .footer { margin-top: 12px; text-align: center; color: #333; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
  </style>
</head>
<body>
  <div class="card">
    ${bookmark.image ? `<div class="hero"><img src="${escapeHtml(bookmark.image)}" alt=""></div>` : ''}
    ${bookmark.favicon ? `<img class="fav" src="${escapeHtml(bookmark.favicon)}" alt="">` : ''}
    <h1>${escapeHtml(bookmark.title || 'Untitled')}</h1>
    <div class="url">${escapeHtml(bookmark.url)}</div>
    ${bookmark.description ? `<div class="desc">${escapeHtml(bookmark.description)}</div>` : ''}
    ${bookmark.tags?.length ? `<div class="tags">${bookmark.tags.map((t: string) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    <a class="btn" href="${escapeHtml(bookmark.url)}" target="_blank" rel="noopener">Visit Link</a>
    <div class="footer">Saved with Waps</div>
  </div>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })
  })
})

http.route({
  path: '/api/pair',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.json()
    const code = body?.code
    if (!code) {
      return new Response(JSON.stringify({ error: 'Code required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    const doc = await ctx.runQuery(api.pairing.resolvePairingCode, { code })
    if (!doc) {
      return new Response(
        JSON.stringify({ error: 'Code not found or expired' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    return new Response(JSON.stringify(doc), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  })
})

http.route({
  path: '/api/widget/bookmarks',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const apiKey = url.searchParams.get('key')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'key required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    const keyDoc = await ctx.runQuery(api.apiKeys.validateApiKey, {
      key: apiKey
    })
    if (!keyDoc) {
      return new Response(JSON.stringify({ error: 'Invalid api key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    const bookmarks = await ctx.runQuery(api.bookmarks.listByUser, {
      apiKey
    })
    return new Response(JSON.stringify(bookmarks), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  })
})

http.route({
  path: '/api/widget/add',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const apiKey = url.searchParams.get('key')
    const targetUrl = url.searchParams.get('url')
    const title = url.searchParams.get('title') || undefined
    if (!apiKey || !targetUrl) {
      return new Response(JSON.stringify({ error: 'key and url required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    const keyDoc = await ctx.runQuery(api.apiKeys.validateApiKey, {
      key: apiKey
    })
    if (!keyDoc) {
      return new Response(JSON.stringify({ error: 'Invalid api key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    try {
      const id = await ctx.runMutation(api.bookmarks.addByHttp, {
        userId: keyDoc.userId,
        url: targetUrl,
        title
      })
      return new Response(JSON.stringify({ id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  })
})

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default http
