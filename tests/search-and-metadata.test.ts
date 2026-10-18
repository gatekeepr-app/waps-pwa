import { describe, expect, it } from 'vitest'
import { buildSearchText } from '../convex/bookmarks'
import { isSafeExternalUrl } from '../convex/metadata'

describe('search indexing', () => {
  it('indexes tags and metadata fields together', () => {
    const text = buildSearchText({
      url: 'https://example.com/article',
      title: 'Useful article',
      description: 'A practical guide',
      textContent: 'full page text',
      tags: ['Research', 'Read Later']
    })

    expect(text).toContain('useful article')
    expect(text).toContain('full page text')
    expect(text).toContain('research read later')
  })
})

describe('metadata URL safety', () => {
  it('allows ordinary HTTP(S) URLs without credentials', () => {
    expect(isSafeExternalUrl('https://example.com/path')).toBe(true)
  })

  it('rejects local, credentialed, and non-HTTP URLs', () => {
    expect(isSafeExternalUrl('http://127.0.0.1:8080')).toBe(false)
    expect(isSafeExternalUrl('http://localhost/admin')).toBe(false)
    expect(isSafeExternalUrl('https://user:pass@example.com')).toBe(false)
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
  })
})
