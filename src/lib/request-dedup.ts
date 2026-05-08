import { LRUCache } from 'lru-cache'

type CacheEntry<T> = { promise: Promise<T>; timestamp: number }

const inflight = new LRUCache<string, CacheEntry<any>>({
  max: 500,
  ttl: 30_000
})

export function dedup<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 30_000
): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing.promise

  const promise = fetcher().finally(() => {
    inflight.delete(key)
  })

  inflight.set(key, { promise, timestamp: Date.now() }, { ttl })
  return promise
}

export function clearCache(): void {
  inflight.clear()
}

const rateLimitMap = new LRUCache<string, { count: number; resetAt: number }>({
  max: 1000,
  ttl: 60_000
})

export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  rateLimitMap.set(key, entry)
  return { allowed: true, remaining: maxRequests - entry.count }
}
