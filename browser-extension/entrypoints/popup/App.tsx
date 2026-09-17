import { useEffect, useState } from 'react'

const DEFAULT_CONVEX_SITE = 'https://aromatic-puffin-900.convex.site'
const DEFAULT_APP_URL = 'https://waps.darvizlabs.online'

type TabName = 'save' | 'connect'
type SaveStatus = 'Idle' | 'Saving...' | 'Saved' | 'Error saving'

interface CategoryOption {
  _id: string
  name: string
}

interface StoredSettings {
  wapsApiKey?: string
  wapsConvexUrl?: string
  wapsUsername?: string
  makePublic?: boolean
}

export default function App() {
  const [tab, setTab] = useState<TabName>('save')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [convexUrl, setConvexUrl] = useState(DEFAULT_CONVEX_SITE)
  const [username, setUsername] = useState('')
  const [pairCode, setPairCode] = useState('')
  const [makePublic, setMakePublic] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState('')
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [existingId, setExistingId] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<SaveStatus>('Idle')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<
    'default' | 'success' | 'error'
  >('default')

  useEffect(() => {
    chrome.storage.local
      .get(['wapsApiKey', 'wapsConvexUrl', 'wapsUsername', 'makePublic'])
      .then((data: StoredSettings) => {
        setApiKey(data.wapsApiKey || '')
        setConvexUrl(data.wapsConvexUrl || DEFAULT_CONVEX_SITE)
        setUsername(data.wapsUsername || '')
        setMakePublic(!!data.makePublic)
        if (data.wapsApiKey) {
          fetch(
            `${data.wapsConvexUrl || DEFAULT_CONVEX_SITE}/api/extension/options?key=${encodeURIComponent(data.wapsApiKey)}`
          )
            .then(res => res.json())
            .then(options => setCategories(options.categories || []))
            .catch(() => {})
        }
      })

    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      setUrl(activeTab?.url || '')
      setTitle(activeTab?.title || '')
    })
  }, [])

  async function saveMakePublicPreference(checked: boolean) {
    setMakePublic(checked)
    await chrome.storage.local.set({ makePublic: checked })
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
      show('Pair with the Waps app first', 'error')
      setStatus('Error saving')
      return
    }

    setBusy(true)
    setMessage('')
    setExistingId('')
    setStatus('Saving...')

    try {
      const res = await fetch(`${convexUrl}/api/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          url: url.trim(),
          title: title.trim(),
          categoryId: categoryId || undefined,
          tags: tags
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(Boolean),
          isPublic: makePublic
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.id) {
          setStatus('Error saving')
          setExistingId(data.id)
          show('Already saved', 'error')
          setBusy(false)
          return
        }
        throw new Error(data?.error || 'Failed to save')
      }

      setStatus('Saved')
      show(data?.id ? `Saved! Wap ${data.id}` : 'Saved!', 'success')
      setTimeout(() => window.close(), 1200)
    } catch (err) {
      setStatus('Error saving')
      show(err instanceof Error ? err.message : 'Network error', 'error')
      setBusy(false)
    }
  }

  async function redeemPairingCode(rawCode: string, fallbackUsername = '') {
    const code = rawCode.trim().toUpperCase()
    if (code.length < 4) {
      show('Enter a valid pairing code', 'error')
      return
    }

    setBusy(true)
    show('Connecting...')
    try {
      const res = await fetch(`${DEFAULT_CONVEX_SITE}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const data = await res.json().catch(() => ({}))
      if (data?.apiKey) {
        const finalUrl = data.convexUrl || DEFAULT_CONVEX_SITE
        const pairedUsername = data.username || fallbackUsername
        await chrome.storage.local.set({
          wapsApiKey: data.apiKey,
          wapsConvexUrl: finalUrl,
          wapsUsername: pairedUsername
        })
        setApiKey(data.apiKey)
        setConvexUrl(finalUrl)
        setUsername(pairedUsername)
        show('Connected! Extension ready', 'success')
        setBusy(false)
        setTimeout(() => setTab('save'), 1000)
        return
      }
      show(data?.error || 'Pairing failed', 'error')
    } catch (err) {
      show(err instanceof Error ? err.message : 'Network error', 'error')
    }
    setBusy(false)
  }

  async function connect() {
    await redeemPairingCode(pairCode)
  }

  async function pairFromProfile() {
    setBusy(true)
    show('Opening Waps Profile...')
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'waps:startPairing'
      })
      if (result?.ok) {
        setApiKey(result.apiKey)
        setConvexUrl(result.convexUrl || DEFAULT_CONVEX_SITE)
        setUsername(result.username || '')
        show('Connected! Extension ready', 'success')
        setTimeout(() => setTab('save'), 1000)
        return
      }
      show(result?.error || 'Pairing failed', 'error')
    } catch (err) {
      show(err instanceof Error ? err.message : 'Pairing failed', 'error')
    }
    setBusy(false)
  }

  async function disconnect() {
    await chrome.storage.local.remove(['wapsApiKey', 'wapsUsername'])
    setApiKey('')
    setUsername('')
    show('Disconnected', 'success')
  }

  return (
    <main>
      <nav className='tabs' aria-label='Extension tabs'>
        {(['save', 'connect'] as const).map(name => (
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
          <div className='saveHeader'>
            <h1>Save to Waps</h1>
            <label className='inlineToggle'>
              <span>Public</span>
              <Switch
                checked={makePublic}
                onChange={saveMakePublicPreference}
                label='Make Wap public'
              />
            </label>
          </div>
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
          {categories.length > 0 && (
            <Field label='Category'>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
              >
                <option value=''>No category</option>
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label='Tags (comma-separated)'>
            <input
              type='text'
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder='research, work'
            />
          </Field>
          <button
            type='button'
            className='saveButton'
            disabled={busy}
            onClick={saveBookmark}
          >
            Save Wap
          </button>
          {existingId && (
            <a
              className='openExisting'
              href={`${DEFAULT_APP_URL}/wap/${existingId}`}
              target='_blank'
              rel='noreferrer'
            >
              Open existing wap
            </a>
          )}
          <Status status={status} message={message} tone={messageTone} />
        </section>
      )}

      {tab === 'connect' && (
        <section>
          <h1>Pair with App</h1>
          {apiKey ? (
            <div className='connected'>
              <strong>Done</strong>
              <span>Connected to @{username || 'account'}</span>
            </div>
          ) : (
            <>
              <p className='hint'>
                Paste a pairing code or connect from profile.
              </p>
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
              <button
                type='button'
                className='profileLink'
                disabled={busy}
                onClick={pairFromProfile}
              >
                Pair from Profile
              </button>
            </>
          )}
          {apiKey && (
            <button type='button' className='secondary' onClick={disconnect}>
              Disconnect
            </button>
          )}
          <Status message={message} tone={messageTone} />
        </section>
      )}
    </main>
  )
}

function Switch({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <span className='switch'>
      <input
        type='checkbox'
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        aria-label={label}
      />
      <span aria-hidden='true' />
    </span>
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
