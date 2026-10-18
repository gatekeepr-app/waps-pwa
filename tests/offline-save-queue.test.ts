import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearOfflineSaveQueue,
  enqueueOfflineSave,
  flushOfflineSaveQueue,
  getOfflineSaveQueue,
  type OfflineSaveInput
} from '../src/lib/offline-save-queue'

const input: OfflineSaveInput = {
  clientRequestId: 'request-1',
  url: 'https://example.com/article',
  title: 'Article',
  description: 'Saved while offline',
  categoryId: 'category-1',
  tags: ['reading'],
  isPublic: false
}

beforeEach(() => {
  clearOfflineSaveQueue('user-1')
  clearOfflineSaveQueue('user-2')
})

describe('offline save queue', () => {
  it('stores a user-scoped save once and avoids duplicate request ids', () => {
    enqueueOfflineSave('user-1', input)
    enqueueOfflineSave('user-1', input)

    expect(getOfflineSaveQueue('user-1')).toHaveLength(1)
    expect(getOfflineSaveQueue('user-2')).toHaveLength(0)
  })

  it('flushes the bookmark and tags, then removes the item', async () => {
    enqueueOfflineSave('user-1', input)
    const calls: string[] = []

    const result = await flushOfflineSaveQueue('user-1', 'session-token', {
      saveBookmark: async queued => {
        calls.push(`bookmark:${queued.clientRequestId}`)
        return 'bookmark-1'
      },
      saveTags: async bookmarkId => {
        calls.push(`tags:${bookmarkId}`)
      }
    })

    expect(result).toEqual({ synced: 1, remaining: 0 })
    expect(calls).toEqual(['bookmark:request-1', 'tags:bookmark-1'])
    expect(getOfflineSaveQueue('user-1')).toHaveLength(0)
  })

  it('keeps a failed item for a later retry', async () => {
    enqueueOfflineSave('user-1', input)

    const result = await flushOfflineSaveQueue('user-1', 'session-token', {
      saveBookmark: async () => {
        throw new Error('Network request failed')
      },
      saveTags: async () => undefined
    })

    const queued = getOfflineSaveQueue('user-1')
    expect(result).toEqual({ synced: 0, remaining: 1 })
    expect(queued).toHaveLength(1)
    expect(queued[0].attempts).toBe(1)
    expect(queued[0].lastError).toBe('Network request failed')
  })
})
