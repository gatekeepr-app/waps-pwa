import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, RuntimeCaching } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const authNetworkOnly: RuntimeCaching = {
  matcher: ({ sameOrigin, url: { pathname } }) =>
    sameOrigin &&
    (pathname === '/login' || pathname.startsWith('/api/manual-auth/')),
  handler: async ({ request }) => {
    try {
      return await fetch(request)
    } catch {
      if (request.mode === 'navigate') {
        const cached =
          (await caches.match(request)) ||
          (await caches.match(new URL('/login', request.url).toString()))
        if (cached) return cached
        return new Response(
          '<!doctype html><title>Waps is offline</title><p>Reconnect to sign in.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html' } }
        )
      }
      return new Response(JSON.stringify({ error: 'Network unavailable.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [authNetworkOnly, ...defaultCache]
})

serwist.addEventListeners()
