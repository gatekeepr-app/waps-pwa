import { describe, expect, it } from 'vitest'
import { buildSearchText } from '../convex/bookmarks'
import {
  isAllowedScreenshotUrl,
  isDeadLinkStatus,
  isSafeExternalUrl
} from '../convex/metadata'

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

  it('rejects private, link-local, and reserved address literals', () => {
    for (const url of [
      'http://10.1.2.3',
      'http://172.16.0.1',
      'http://192.168.1.1',
      'http://169.254.169.254/latest/meta-data',
      'http://100.64.0.1',
      'http://198.18.0.1',
      'http://224.0.0.1',
      'http://[::1]',
      'http://[fd00::1]',
      'http://[fe80::1]',
      'http://[::ffff:127.0.0.1]'
    ]) {
      expect(isSafeExternalUrl(url), url).toBe(false)
    }
    expect(isSafeExternalUrl('https://93.184.216.34')).toBe(true)
  })
})

describe('screenshot provider allowlist', () => {
  it('requires every URL to match configured origins', () => {
    const allowed = ['https://shots.example.com']
    expect(
      isAllowedScreenshotUrl('https://shots.example.com/render', allowed)
    ).toBe(true)
    expect(isAllowedScreenshotUrl('https://evil.example.com/x', allowed)).toBe(
      false
    )
    expect(isAllowedScreenshotUrl('http://127.0.0.1/x', allowed)).toBe(false)
  })

  it('stays permissive for self-hosted providers without an allowlist', () => {
    expect(isAllowedScreenshotUrl('https://shots.example.com/x', [])).toBe(true)
  })
})

describe('dead-link classification', () => {
  it('only flags definitive failures as broken', () => {
    expect(isDeadLinkStatus(404)).toBe(true)
    expect(isDeadLinkStatus(410)).toBe(true)
    expect(isDeadLinkStatus(503)).toBe(true)
    expect(isDeadLinkStatus(200)).toBe(false)
    expect(isDeadLinkStatus(301)).toBe(false)
    expect(isDeadLinkStatus(403)).toBe(false)
    expect(isDeadLinkStatus(405)).toBe(false)
    expect(isDeadLinkStatus(429)).toBe(false)
  })
})
