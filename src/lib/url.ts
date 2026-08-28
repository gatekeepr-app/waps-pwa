export function normalizeUrlInput(raw: string): string | null {
  let s = raw.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  let u: URL
  try {
    u = new URL(s)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  const host = u.hostname.toLowerCase().replace(/^www\./, '')
  const path = u.pathname.replace(/\/+$/, '')
  for (const key of Array.from(u.searchParams.keys())) {
    if (
      key.toLowerCase().startsWith('utm_') ||
      key === 'fbclid' ||
      key === 'gclid'
    ) {
      u.searchParams.delete(key)
    }
  }
  return `${u.protocol}//${host}${path}${u.search}`
}
