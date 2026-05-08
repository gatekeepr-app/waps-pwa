/// <reference lib="WebWorker" />
export {} // keep TS happy about top-level 'self'

import { clientsClaim } from 'workbox-core'
import { matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

// Tell TS about Serwist's injected manifest
declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{
    url: string
    revision: string | null
  }>
}

self.skipWaiting()
clientsClaim()

// Use Serwist's placeholder (NOT __WB_MANIFEST)
const manifest = self.__SW_MANIFEST || []

// Precache build assets + your offline + icons (add your own as needed)
precacheAndRoute([
  ...manifest,
  { url: '/~offline', revision: '1' },
  { url: '/manifest.json', revision: '1' },
  { url: '/favicon/icon-192.png', revision: '1' },
  { url: '/favicon/icon-512.png', revision: '1' }
])

// HTML navigations: network-first, fallback to offline
const offlineFallbackHandler = async (params: any) => {
  try {
    return await new NetworkFirst({ cacheName: 'html' }).handle(params)
  } catch {
    const cached = await matchPrecache('/~offline')
    return cached || Response.error()
  }
}
registerRoute(new NavigationRoute(offlineFallbackHandler))

// Static assets: stale-while-revalidate
registerRoute(
  ({ request }) =>
    ['style', 'script', 'worker'].includes(request.destination) ||
    ['image', 'font'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'assets' })
)
