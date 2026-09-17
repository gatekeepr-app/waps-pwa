const DEFAULT_CONVEX_SITE = 'https://aromatic-puffin-900.convex.site'
const DEFAULT_APP_URL = 'https://waps.darvizlabs.online'

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'save-to-waps',
      title: 'Save to Waps',
      contexts: ['page', 'link']
    })
  })

  chrome.contextMenus.onClicked.addListener(async info => {
    if (info.menuItemId !== 'save-to-waps') return
    const targetUrl = info.linkUrl || info.pageUrl
    if (!targetUrl) return
    const data = await chrome.storage.local.get([
      'wapsApiKey',
      'wapsConvexUrl',
      'makePublic'
    ])
    if (!data.wapsApiKey) return
    await fetch(`${data.wapsConvexUrl || DEFAULT_CONVEX_SITE}/api/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: data.wapsApiKey,
        url: targetUrl,
        title: info.selectionText || undefined,
        isPublic: data.makePublic === true
      })
    }).catch(() => {})
  })

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'waps:startPairing') return

    startPairing()
      .then(sendResponse)
      .catch(error => {
        sendResponse({
          error: error instanceof Error ? error.message : 'Pairing failed'
        })
      })

    return true
  })
})

async function startPairing() {
  const tab = await chrome.tabs.create({
    url: `${DEFAULT_APP_URL}/profile?pairExtension=1`,
    active: true
  })
  if (!tab.id) throw new Error('Could not open Waps Profile')

  for (let i = 0; i < 240; i++) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const current = await chrome.tabs.get(tab.id).catch(() => null)
    if (!current) throw new Error('Pairing tab was closed')
    if (!current.url) continue

    let params: URLSearchParams
    try {
      params = new URLSearchParams(new URL(current.url).hash.slice(1))
    } catch {
      continue
    }

    const code = params.get('wapsPairCode')
    if (!code) continue

    const username = params.get('username') || ''
    await chrome.tabs.remove(tab.id).catch(() => {})
    return await redeemPairingCode(code, username)
  }

  throw new Error('Timed out waiting for pairing code')
}

async function redeemPairingCode(code: string, fallbackUsername: string) {
  const res = await fetch(`${DEFAULT_CONVEX_SITE}/api/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
  const data = await res.json().catch(() => ({}))
  if (!data?.apiKey) throw new Error(data?.error || 'Pairing failed')

  const username = data.username || fallbackUsername
  await chrome.storage.local.set({
    wapsApiKey: data.apiKey,
    wapsConvexUrl: data.convexUrl || DEFAULT_CONVEX_SITE,
    wapsUsername: username
  })

  return {
    ok: true,
    apiKey: data.apiKey,
    convexUrl: data.convexUrl || DEFAULT_CONVEX_SITE,
    username
  }
}
