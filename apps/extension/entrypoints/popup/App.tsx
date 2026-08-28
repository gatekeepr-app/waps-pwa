import { useEffect, useState } from 'react'

const DEFAULT_CONVEX_SITE = 'https://aromatic-puffin-900.convex.site'
const DEFAULT_APP_URL = 'https://waps.app'

type TabName = 'save' | 'connect' | 'settings'
type SaveStatus =
  | 'Idle'
  | 'Extracting page...'
  | 'Saving...'
  | 'Saved'
  | 'Saved · AI analysis running'
  | 'Error saving'
  | 'Saved · AI analysis unavailable'

interface StoredSettings {
  wapsApiKey?: string
  wapsConvexUrl?: string
  wapsAppUrl?: string
  analyzeWithAI?: boolean
}

export default function App() {
  const [tab, setTab] = useState<TabName>('save')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [convexUrl, setConvexUrl] = useState(DEFAULT_CONVEX_SITE)
  const [appUrl, setAppUrl] = useState(DEFAULT_APP_URL)
  const [pairCode, setPairCode] = useState('')
  const [analyzeWithAI, setAnalyzeWithAI] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<SaveStatus>('Idle')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<
    'default' | 'success' | 'error'
  >('default')

  useEffect(() => {
    chrome.storage.local
      .get(['wapsApiKey', 'wapsConvexUrl', 'wapsAppUrl', 'analyzeWithAI'])
      .then((data: StoredSettings) => {
        setApiKey(data.wapsApiKey || '')
        setConvexUrl(data.wapsConvexUrl || DEFAULT_CONVEX_SITE)
        setAppUrl(data.wapsAppUrl || DEFAULT_APP_URL)
        setAnalyzeWithAI(!!data.analyzeWithAI)
      })

    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      setUrl(activeTab?.url || '')
      setTitle(activeTab?.title || '')
    })
  }, [])

  async function saveAnalyzePreference(checked: boolean) {
    setAnalyzeWithAI(checked)
    await chrome.storage.local.set({ analyzeWithAI: checked })
  }

  function show(
    msg: string,
    tone: 'default' | 'success' | 'error' = 'default'
  ) {
    setMessage(msg)
    setMessageTone(tone)
  }

  async function saveBookmark() {
    if (!url.trim()) {
      show('No URL to save', 'error')
      setStatus('Error saving')
      return
    }
    if (!apiKey.trim()) {
      show('Set your API key first in Settings', 'error')
      setStatus('Error saving')
      return
    }

    setBusy(true)
    setMessage('')
    setStatus(analyzeWithAI ? 'Extracting page...' : 'Saving...')

    // Step 3 adds real page extraction. Until then AI ON degrades gracefully.
    if (analyzeWithAI) setStatus('Saving...')

    try {
      const res = await fetch(`${convexUrl}/api/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, url: url.trim(), title: title.trim() })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.id) {
          setStatus('Error saving')
          show(`Already saved. Wap ${data.id}`, 'error')
          setBusy(false)
          return
        }
        throw new Error(data?.error || 'Failed to save')
      }

      setStatus(analyzeWithAI ? 'Saved · AI analysis unavailable' : 'Saved')
      show(
        analyzeWithAI
          ? 'Saved. AI analysis will be enabled in the next backend step.'
          : data?.id
            ? `Saved! Wap ${data.id}`
            : 'Saved!',
        'success'
      )
      setTimeout(() => window.close(), 1200)
    } catch (err) {
      setStatus('Error saving')
      show(err instanceof Error ? err.message : 'Network error', 'error')
      setBusy(false)
    }
  }

  async function connect() {
    const code = pairCode.trim().toUpperCase()
    if (code.length < 4) {
      show('Enter a valid pairing code', 'error')
      return
    }

    setBusy(true)
    show('Connecting...')
    const sitesToTry = [convexUrl, DEFAULT_CONVEX_SITE].filter(Boolean)
    const errors: string[] = []

    for (const site of sitesToTry) {
      try {
        const res = await fetch(`${site}/api/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })
        const data = await res.json().catch(() => ({}))
        if (data?.apiKey) {
          const finalUrl = data.convexUrl || site
          await chrome.storage.local.set({
            wapsApiKey: data.apiKey,
            wapsConvexUrl: finalUrl
          })
          setApiKey(data.apiKey)
          setConvexUrl(finalUrl)
          show('Connected! Extension ready', 'success')
          setBusy(false)
          setTimeout(() => setTab('save'), 1000)
          return
        }
        errors.push(`${site} → ${res.status}: ${data?.error || res.statusText}`)
      } catch (err) {
        errors.push(
          `${site} → ${err instanceof Error ? err.message : 'Network error'}`
        )
      }
    }

    show(errors.join(' | '), 'error')
    setBusy(false)
  }

  async function saveSettings() {
    if (!apiKey.trim()) {
      show('Enter an API key', 'error')
      return
    }
    await chrome.storage.local.set({
      wapsApiKey: apiKey.trim(),
      wapsConvexUrl: convexUrl.trim() || DEFAULT_CONVEX_SITE,
      wapsAppUrl: appUrl.trim() || DEFAULT_APP_URL
    })
    show('Saved', 'success')
    setTimeout(() => setTab('save'), 800)
  }

  async function disconnect() {
    await chrome.storage.local.remove(['wapsApiKey'])
    setApiKey('')
    show('Disconnected', 'success')
  }

  return (
    <main>
      <nav className='tabs' aria-label='Extension tabs'>
        {(['save', 'connect', 'settings'] as const).map(name => (
          <button
            key={name}
            type='button'
            className={`tab ${tab === name ? 'active' : ''}`}
            onClick={() => {
              setTab(name)
              setMessage('')
            }}
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === 'save' && (
        <section>
          <h1>Save to Waps</h1>
          <Field label='URL'>
            <input type='url' value={url} readOnly />
          </Field>
          <Field label='Title (optional)'>
            <input
              type='text'
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='Page title'
            />
          </Field>
          <label className='toggle'>
            <span>
              <strong>Analyze with AI</strong>
              <small>Capture readable page content after you click Save.</small>
            </span>
            <input
              type='checkbox'
              checked={analyzeWithAI}
              onChange={e => saveAnalyzePreference(e.target.checked)}
            />
          </label>
          <button type='button' disabled={busy} onClick={saveBookmark}>
            Save Wap
          </button>
          <Status status={status} message={message} tone={messageTone} />
        </section>
      )}

      {tab === 'connect' && (
        <section>
          <h1>Pair with App</h1>
          <p className='hint'>
            Open Waps Profile, generate a pairing code, then paste it here.
          </p>
          <a
            className='linkButton'
            href={`${appUrl}/profile`}
            target='_blank'
            rel='noreferrer'
          >
            Open Waps Profile
          </a>
          <Field label='Pairing Code'>
            <input
              type='text'
              value={pairCode}
              onChange={e => setPairCode(e.target.value.toUpperCase())}
              placeholder='ABC123'
              maxLength={6}
              className='code'
            />
          </Field>
          <button type='button' disabled={busy} onClick={connect}>
            Connect
          </button>
          <Status message={message} tone={messageTone} />
        </section>
      )}

      {tab === 'settings' && (
        <section>
          <h1>Settings</h1>
          <Field label='API Key'>
            <input
              type='text'
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder='Paste your Waps API key'
            />
          </Field>
          <Field label='Server URL'>
            <input
              type='url'
              value={convexUrl}
              onChange={e => setConvexUrl(e.target.value)}
              placeholder='https://your-project.convex.site'
            />
          </Field>
          <Field label='App URL'>
            <input
              type='url'
              value={appUrl}
              onChange={e => setAppUrl(e.target.value)}
              placeholder='https://waps.app'
            />
          </Field>
          <button type='button' disabled={busy} onClick={saveSettings}>
            Save Settings
          </button>
          <button type='button' className='secondary' onClick={disconnect}>
            Disconnect
          </button>
          <Status message={message} tone={messageTone} />
        </section>
      )}
    </main>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className='field'>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Status({
  status,
  message,
  tone = 'default'
}: {
  status?: SaveStatus
  message: string
  tone?: 'default' | 'success' | 'error'
}) {
  if (!status && !message) return null
  return (
    <div className={`status ${tone}`}>
      {status && <div>{status}</div>}
      {message && <p>{message}</p>}
    </div>
  )
}
