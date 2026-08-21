const DEFAULT_CONVEX_SITE = 'https://aromatic-puffin-900.convex.site'

let apiKey = ''

chrome.storage.sync.get(['wapsApiKey', 'wapsConvexUrl'], data => {
  apiKey = data.wapsApiKey || ''
  document.getElementById('apiKeyInput').value = apiKey
  document.getElementById('convexUrlInput').value =
    data.wapsConvexUrl || DEFAULT_CONVEX_SITE
})

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.getElementById('saveView').style.display = 'none'
  document.getElementById('connectView').style.display = 'none'
  document.getElementById('settingsView').style.display = 'none'
  if (name === 'save') {
    document.getElementById('tabSave').classList.add('active')
    document.getElementById('saveView').style.display = 'block'
  } else if (name === 'connect') {
    document.getElementById('tabConnect').classList.add('active')
    document.getElementById('connectView').style.display = 'block'
  } else if (name === 'settings') {
    document.getElementById('tabSettings').classList.add('active')
    document.getElementById('settingsView').style.display = 'block'
  }
}

document
  .getElementById('tabSave')
  .addEventListener('click', () => switchTab('save'))
document
  .getElementById('tabConnect')
  .addEventListener('click', () => switchTab('connect'))
document
  .getElementById('tabSettings')
  .addEventListener('click', () => switchTab('settings'))

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab?.url) {
    document.getElementById('urlInput').value = tab.url
    document.getElementById('titleInput').value = tab.title || ''
  }
})

document.getElementById('saveBtn').addEventListener('click', async () => {
  const url = document.getElementById('urlInput').value.trim()
  const title = document.getElementById('titleInput').value.trim()
  if (!url) {
    setStatus('status', 'No URL to save', 'error')
    return
  }

  const { wapsApiKey, wapsConvexUrl } = await chrome.storage.sync.get([
    'wapsApiKey',
    'wapsConvexUrl'
  ])
  const key = wapsApiKey || apiKey
  if (!key) {
    setStatus('status', 'Set your API key first in Settings', 'error')
    return
  }

  const siteUrl = wapsConvexUrl || DEFAULT_CONVEX_SITE
  document.getElementById('saveBtn').disabled = true
  setStatus('status', 'Saving...', '')

  try {
    const res = await fetch(`${siteUrl}/api/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key, url, title })
    })
    const data = await res.json()
    if (res.ok) {
      setStatus('status', 'Saved!', 'success')
      setTimeout(() => window.close(), 1200)
    } else {
      setStatus('status', data.error || 'Failed to save', 'error')
      document.getElementById('saveBtn').disabled = false
    }
  } catch {
    setStatus('status', 'Network error — check Server URL', 'error')
    document.getElementById('saveBtn').disabled = false
  }
})

document.getElementById('pairBtn').addEventListener('click', async () => {
  const code = document
    .getElementById('pairCodeInput')
    .value.trim()
    .toUpperCase()
  if (!code || code.length < 4) {
    setStatus('pairStatus', 'Enter a valid pairing code', 'error')
    return
  }

  document.getElementById('pairBtn').disabled = true
  setStatus('pairStatus', 'Connecting...', '')

  const { wapsConvexUrl } = await chrome.storage.sync.get(['wapsConvexUrl'])
  const sitesToTry = [wapsConvexUrl, DEFAULT_CONVEX_SITE].filter(Boolean)
  const errors = []

  for (const site of sitesToTry) {
    try {
      const res = await fetch(`${site}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      if (data?.apiKey) {
        const finalUrl = data.convexUrl || site
        await chrome.storage.sync.set({
          wapsApiKey: data.apiKey,
          wapsConvexUrl: finalUrl
        })
        apiKey = data.apiKey
        document.getElementById('apiKeyInput').value = data.apiKey
        document.getElementById('convexUrlInput').value = finalUrl
        setStatus('pairStatus', 'Connected! Extension ready', 'success')
        document.getElementById('pairBtn').disabled = false
        setTimeout(() => switchTab('save'), 1500)
        return
      }
      errors.push(`${site} → ${res.status}: ${data?.error || res.statusText}`)
    } catch (e) {
      errors.push(`${site} → Network error: ${e.message}`)
    }
  }

  setStatus('pairStatus', errors.join(' | '), 'error')
  document.getElementById('pairBtn').disabled = false
})

document.getElementById('saveKeyBtn').addEventListener('click', () => {
  const key = document.getElementById('apiKeyInput').value.trim()
  const url =
    document.getElementById('convexUrlInput').value.trim() ||
    DEFAULT_CONVEX_SITE
  if (!key) {
    setStatus('settingsStatus', 'Enter an API key', 'error')
    return
  }
  chrome.storage.sync.set({ wapsApiKey: key, wapsConvexUrl: url }, () => {
    apiKey = key
    setStatus('settingsStatus', 'Saved', 'success')
    setTimeout(() => switchTab('save'), 1000)
  })
})

function setStatus(elId, msg, cls) {
  const el = document.getElementById(elId)
  el.textContent = msg
  el.className = 'status' + (cls ? ' ' + cls : '')
}
