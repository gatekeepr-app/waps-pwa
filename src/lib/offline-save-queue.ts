export type OfflineSaveInput = {
  clientRequestId: string
  url: string
  title?: string
  description?: string
  categoryId?: string
  tags: string[]
  isPublic: boolean
}

export type OfflineSaveQueueItem = OfflineSaveInput & {
  queuedAt: number
  attempts: number
  lastError?: string
}

export type OfflineSaveHandlers = {
  saveBookmark: (
    input: OfflineSaveInput & { sessionToken: string }
  ) => Promise<string>
  saveTags: (
    bookmarkId: string,
    tags: string[],
    sessionToken: string
  ) => Promise<void>
}

const STORAGE_PREFIX = 'waps:offline-save-queue:'
const memoryStorage = new Map<string, string>()

export function createOfflineSaveRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function isRetryableOfflineError(error: unknown) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const message = error instanceof Error ? error.message : String(error)
  return /network|fetch|offline|timeout|connection|transport/i.test(message)
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

function readRaw(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage)
      return window.localStorage.getItem(key)
  } catch {
    // Fall back to memory when storage is unavailable or blocked.
  }
  return memoryStorage.get(key) ?? null
}

function writeRaw(key: string, value: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value)
      return
    }
  } catch {
    // Fall back to memory when storage is unavailable or blocked.
  }
  memoryStorage.set(key, value)
}

function readQueue(userId: string): OfflineSaveQueueItem[] {
  const raw = readRaw(storageKey(userId))
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isQueueItem)
  } catch {
    return []
  }
}

function writeQueue(userId: string, queue: OfflineSaveQueueItem[]) {
  writeRaw(storageKey(userId), JSON.stringify(queue))
}

function isQueueItem(value: unknown): value is OfflineSaveQueueItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<OfflineSaveQueueItem>
  return (
    typeof item.clientRequestId === 'string' &&
    typeof item.url === 'string' &&
    typeof item.queuedAt === 'number' &&
    typeof item.attempts === 'number' &&
    Array.isArray(item.tags) &&
    item.tags.every(tag => typeof tag === 'string') &&
    typeof item.isPublic === 'boolean'
  )
}

export function getOfflineSaveQueue(userId: string): OfflineSaveQueueItem[] {
  return readQueue(userId)
}

export function enqueueOfflineSave(
  userId: string,
  input: OfflineSaveInput
): OfflineSaveQueueItem {
  const queue = readQueue(userId)
  const existing = queue.find(
    item => item.clientRequestId === input.clientRequestId
  )
  if (existing) return existing

  const item: OfflineSaveQueueItem = {
    ...input,
    tags: [...input.tags],
    queuedAt: Date.now(),
    attempts: 0
  }
  writeQueue(userId, [...queue, item])
  return item
}

export function clearOfflineSaveQueue(userId: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage)
      window.localStorage.removeItem(storageKey(userId))
  } catch {
    // Fall back to memory when storage is unavailable or blocked.
  }
  memoryStorage.delete(storageKey(userId))
}

export async function flushOfflineSaveQueue(
  userId: string,
  sessionToken: string,
  handlers: OfflineSaveHandlers
) {
  const queue = readQueue(userId)
  let synced = 0

  for (const item of queue) {
    try {
      const bookmarkId = await handlers.saveBookmark({
        ...item,
        sessionToken
      })
      if (item.tags.length > 0)
        await handlers.saveTags(bookmarkId, item.tags, sessionToken)

      const next = readQueue(userId).filter(
        queued => queued.clientRequestId !== item.clientRequestId
      )
      writeQueue(userId, next)
      synced += 1
    } catch (error) {
      const current = readQueue(userId)
      writeQueue(
        userId,
        current.map(queued =>
          queued.clientRequestId === item.clientRequestId
            ? {
                ...queued,
                attempts: queued.attempts + 1,
                lastError:
                  error instanceof Error ? error.message : 'Save failed'
              }
            : queued
        )
      )
    }
  }

  return { synced, remaining: readQueue(userId).length }
}
