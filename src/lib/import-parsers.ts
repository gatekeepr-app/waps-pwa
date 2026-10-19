export type ImportedBookmark = {
  url: string
  title?: string
  description?: string
  tags?: string[]
}

const URL_KEYS = ['url', 'link', 'href', 'uri']
const TITLE_KEYS = ['title', 'name']
const DESCRIPTION_KEYS = ['description', 'note', 'excerpt', 'summary']
const TAG_KEYS = ['tags', 'tag', 'folder', 'collection']

function pick(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function toTags(value: unknown): string[] | undefined {
  const list = Array.isArray(value)
    ? value.filter((t): t is string => typeof t === 'string')
    : typeof value === 'string'
      ? value.split(/[,;|]/)
      : []
  const tags = list.map(tag => tag.trim().toLowerCase()).filter(Boolean)
  return tags.length ? tags : undefined
}

function toBookmark(record: Record<string, unknown>): ImportedBookmark | null {
  const url = pick(record, URL_KEYS)
  if (!url) return null
  const title = pick(record, TITLE_KEYS)
  const description = pick(record, DESCRIPTION_KEYS)
  const tagsSource = TAG_KEYS.map(key => record[key]).find(
    value => value !== undefined && value !== ''
  )
  return {
    url,
    title: title || undefined,
    description: description || undefined,
    tags: toTags(tagsSource)
  }
}

function dedupe(rows: ImportedBookmark[]): ImportedBookmark[] {
  const seen = new Set<string>()
  return rows.filter(row => {
    if (seen.has(row.url)) return false
    seen.add(row.url)
    return true
  })
}

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF, newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some(cell => cell.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  row.push(field)
  if (row.some(cell => cell.trim() !== '')) rows.push(row)
  return rows
}

export function parseCsvBookmarks(text: string): ImportedBookmark[] {
  const [headerRow, ...dataRows] = parseCsv(text)
  if (!headerRow) return []
  const headers = headerRow.map(h => h.trim().toLowerCase())
  const rows = dataRows.map(cells =>
    Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
  )
  return dedupe(
    rows.map(toBookmark).filter((row): row is ImportedBookmark => row !== null)
  )
}

function findArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return null
  for (const key of ['items', 'bookmarks', 'data', 'links']) {
    const candidate = (value as Record<string, unknown>)[key]
    if (Array.isArray(candidate)) return candidate
  }
  return null
}

export function parseJsonBookmarks(text: string): ImportedBookmark[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }
  const rows = findArray(parsed)
  if (!rows) return []
  return dedupe(
    rows
      .filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === 'object'
      )
      .map(toBookmark)
      .filter((row): row is ImportedBookmark => row !== null)
  )
}

const ANCHOR = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

export function parseHtmlBookmarks(text: string): ImportedBookmark[] {
  const rows: ImportedBookmark[] = []
  const anchor = new RegExp(ANCHOR.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = anchor.exec(text))) {
    const url = match[1]
    if (!/^https?:\/\//i.test(url)) continue
    const title = match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
    rows.push({ url, title: title || undefined })
  }
  return dedupe(rows)
}

/** Parse a browser/Pocket/Raindrop/Notion export by extension first, then by
 *  content shape so mislabeled files still import. */
export function parseBookmarkFile(
  fileName: string,
  text: string
): ImportedBookmark[] {
  const name = fileName.toLowerCase()
  if (name.endsWith('.json')) return parseJsonBookmarks(text)
  if (name.endsWith('.csv')) return parseCsvBookmarks(text)
  if (name.endsWith('.html') || name.endsWith('.htm'))
    return parseHtmlBookmarks(text)

  const trimmed = text.trimStart()
  if (trimmed.startsWith('<')) return parseHtmlBookmarks(text)
  if (trimmed.startsWith('[') || trimmed.startsWith('{'))
    return parseJsonBookmarks(text)
  return parseCsvBookmarks(text)
}
