import { describe, expect, it } from 'vitest'
import {
  parseBookmarkFile,
  parseCsvBookmarks,
  parseJsonBookmarks
} from '../src/lib/import-parsers'

describe('bookmark import parsers', () => {
  it('reads Netscape HTML exports', () => {
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><A HREF="https://example.com/a" ADD_DATE="1">Example &amp; Co</A>
  <DT><A HREF="https://example.com/b">Second</A>
</DL>`
    expect(parseBookmarkFile('bookmarks.html', html)).toEqual([
      { url: 'https://example.com/a', title: 'Example & Co' },
      { url: 'https://example.com/b', title: 'Second' }
    ])
  })

  it('reads Pocket CSV including quoted commas and tags', () => {
    const csv = `title,url,time_added,tags,status
"Hello, world",https://example.com/pocket,1700000000,"news, ai",unread
No tags,https://example.com/plain,1700000001,,unread`
    const rows = parseCsvBookmarks(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      url: 'https://example.com/pocket',
      title: 'Hello, world',
      description: undefined,
      tags: ['news', 'ai']
    })
    expect(rows[1].tags).toBeUndefined()
  })

  it('reads Raindrop JSON exports', () => {
    const json = JSON.stringify({
      items: [
        {
          title: 'Design notes',
          link: 'https://example.com/design',
          excerpt: 'A short note',
          tags: ['design', 'ui']
        },
        { title: 'Missing link' }
      ]
    })
    expect(parseJsonBookmarks(json)).toEqual([
      {
        url: 'https://example.com/design',
        title: 'Design notes',
        description: 'A short note',
        tags: ['design', 'ui']
      }
    ])
  })

  it('detects the format when the extension is wrong', () => {
    const csv = 'url,title\nhttps://example.com/c,From CSV'
    expect(parseBookmarkFile('export.txt', csv)).toHaveLength(1)
    expect(
      parseBookmarkFile('export.txt', '[{"url":"https://example.com/j"}]')
    ).toHaveLength(1)
  })

  it('drops rows without a URL', () => {
    expect(
      parseCsvBookmarks('title,url\nNo url,\nOk,https://example.com')
    ).toEqual([
      {
        url: 'https://example.com',
        title: 'Ok',
        description: undefined,
        tags: undefined
      }
    ])
  })
})
