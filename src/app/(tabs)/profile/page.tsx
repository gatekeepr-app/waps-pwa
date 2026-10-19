'use client'

import { LogOutIcon } from '@/components/GeometricIcons'
import { toast } from '@/hooks/use-toast'
import { signOut } from '@/lib/auth-api'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { api } from '../../../../convex/_generated/api'

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, sessionToken, loading: sessionLoading } = useSession()
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingBusy, setPairingBusy] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [categoryBusy, setCategoryBusy] = useState(false)
  const [newCollection, setNewCollection] = useState('')
  const [collectionBusy, setCollectionBusy] = useState(false)

  const generateCode = useMutation(api.pairing.generatePairingCode)
  const addCategory = useMutation(api.categories.add)
  const renameCategory = useMutation(api.categories.rename)
  const removeCategory = useMutation(api.categories.remove)
  const revokeSession = useMutation(api.authManual.revokeSession)
  const revokeAllSessions = useMutation(api.authManual.revokeAllSessions)
  const createCollection = useMutation(api.bookmarks.createCollection)
  const toggleCollectionPublic = useMutation(
    api.bookmarks.toggleCollectionPublic
  )
  const removeCollection = useMutation(api.bookmarks.removeCollection)

  const bookmarks = useQuery(
    api.bookmarks.list,
    sessionToken ? { sessionToken } : 'skip'
  )
  const categories = useQuery(
    api.categories.list,
    sessionToken ? { sessionToken } : 'skip'
  )
  const collections = useQuery(
    api.bookmarks.listCollections,
    sessionToken ? { sessionToken } : 'skip'
  )
  const sessions = useQuery(
    api.authManual.listSessions,
    sessionToken ? { sessionToken } : 'skip'
  )
  const autoPairStarted = useRef(false)
  const username = user?.name || user?.email?.split('@')[0] || 'user'

  const insights = useMemo(() => {
    const all = (bookmarks ?? []) as any[]
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const recent = all.filter(b => b._creationTime >= cutoff).length
    const read = all.filter(b => b.isRead).length

    const domains = new Map<string, number>()
    for (const b of all) {
      try {
        const host = new URL(b.url).hostname.replace(/^www\./, '')
        domains.set(host, (domains.get(host) ?? 0) + 1)
      } catch {}
    }
    const topDomains = Array.from(domains.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    const counts = new Map<string, number>()
    for (const b of all) {
      if (b.categoryId)
        counts.set(b.categoryId, (counts.get(b.categoryId) ?? 0) + 1)
    }
    const names = new Map<string, string>(
      (categories ?? []).map(c => [c._id as string, c.name])
    )
    const topCategories = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ name: names.get(id) ?? 'Category', count }))

    return { total: all.length, recent, read, topDomains, topCategories }
  }, [bookmarks, categories])

  async function handleSignOut() {
    try {
      await signOut()
    } catch {}
    localStorage.removeItem('waps:user')
    router.push('/login')
  }

  const handleGeneratePairing = useCallback(
    async (writeToUrl = false) => {
      if (!sessionToken) return
      setPairingBusy(true)
      try {
        const result = await generateCode({ sessionToken })
        setPairingCode(result.code)
        if (writeToUrl) {
          const params = new URLSearchParams({
            wapsPairCode: result.code,
            username
          })
          window.history.replaceState(null, '', `/profile#${params}`)
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to generate code')
      } finally {
        setPairingBusy(false)
      }
    },
    [generateCode, sessionToken, username]
  )

  useEffect(() => {
    if (
      autoPairStarted.current ||
      searchParams.get('pairExtension') !== '1' ||
      !sessionToken
    ) {
      return
    }
    autoPairStarted.current = true
    handleGeneratePairing(true)
  }, [handleGeneratePairing, searchParams, sessionToken])

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    const name = newCategory.trim()
    if (!name || !sessionToken) return
    setCategoryBusy(true)
    try {
      await addCategory({ sessionToken, name })
      setNewCategory('')
      toast.success(`Category "${name}" added`)
    } catch (err: any) {
      toast.error(err?.message?.replace(/\[.*?\]\s*/, '') || 'Already exists')
    } finally {
      setCategoryBusy(false)
    }
  }

  async function handleRemoveCategory(id: string, name: string) {
    if (!sessionToken) return
    try {
      await removeCategory({ sessionToken, id: id as any })
      toast.success(`Category "${name}" removed`)
    } catch (err: any) {
      toast.error(err?.message?.replace(/\[.*?\]\s*/, '') || "Couldn't remove")
    }
  }

  async function handleRenameCategory(id: string) {
    if (!sessionToken) return
    try {
      await renameCategory({ sessionToken, id: id as any, name: editingName })
      setEditingCategory(null)
      toast.success('Category updated')
    } catch (err: any) {
      toast.error(err?.message?.replace(/\[.*?\]\s*/, '') || "Couldn't update")
    }
  }

  async function handleAddCollection(e: React.FormEvent) {
    e.preventDefault()
    const name = newCollection.trim()
    if (!name || !sessionToken) return
    setCollectionBusy(true)
    try {
      await createCollection({ sessionToken, name })
      setNewCollection('')
      toast.success(`Collection "${name}" created`)
    } catch (err: any) {
      toast.error(err?.message?.replace(/\[.*?\]\s*/, '') || 'Failed')
    } finally {
      setCollectionBusy(false)
    }
  }

  async function handleToggleCollection(id: string) {
    if (!sessionToken) return
    try {
      const result = await toggleCollectionPublic({
        sessionToken,
        id: id as any
      })
      if (result.publicId) {
        await navigator.clipboard
          .writeText(`${window.location.origin}/c/${result.publicId}`)
          .catch(() => {})
        toast.success('Collection is public — link copied')
      } else {
        toast.success('Collection is private again')
      }
    } catch (err: any) {
      toast.error(err?.message || "Couldn't update collection")
    }
  }

  async function handleRemoveCollection(id: string, name: string) {
    if (!sessionToken) return
    try {
      await removeCollection({ sessionToken, id: id as any })
      toast.success(`Collection "${name}" removed`)
    } catch (err: any) {
      toast.error(err?.message || "Couldn't remove collection")
    }
  }

  if (sessionLoading) {
    return (
      <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
        <div className='mb-6 h-7 w-24 animate-pulse rounded bg-surface' />
        <div className='waps-card mb-4 p-6'>
          <div className='mb-4 flex items-center gap-4'>
            <div className='h-14 w-14 animate-pulse rounded-full bg-surface' />
            <div className='flex-1 space-y-2'>
              <div className='h-4 w-28 animate-pulse rounded bg-surface' />
              <div className='h-3 w-40 animate-pulse rounded bg-surface' />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <h1 className='mb-6 text-heading font-bold text-text-primary'>Profile</h1>

      <div className='waps-card mb-4 p-6'>
        <div className='mb-4 flex items-center gap-4'>
          <div className='flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white'>
            {user?.name?.[0]?.toUpperCase() ||
              user?.email?.[0]?.toUpperCase() ||
              'U'}
          </div>
          <div className='min-w-0'>
            <div className='truncate text-base font-bold text-text-primary'>
              {user?.name || 'User'}
            </div>
            <div className='truncate text-sm text-text-secondary'>
              {user?.email}
            </div>
          </div>
        </div>
        <div className='flex gap-4 text-sm text-text-secondary'>
          <div>
            <span className='font-bold tabular-nums text-text-primary'>
              {bookmarks?.length ?? 0}
            </span>{' '}
            waps
          </div>
          <div>
            <span className='font-bold tabular-nums text-text-primary'>
              {categories?.length ?? 0}
            </span>{' '}
            categories
          </div>
        </div>
        {user?.id && (
          <Link
            href={`/u/${user.id}`}
            className='mt-4 block text-sm text-primary underline underline-offset-2'
          >
            View public profile
          </Link>
        )}
      </div>

      <div className='mb-4 grid grid-cols-2 gap-2'>
        <Link href='/import' className='waps-btn-outline text-center'>
          Import bookmarks
        </Link>
        <Link href='/trash' className='waps-btn-outline text-center'>
          Trash
        </Link>
        <Link href='/broken' className='waps-btn-outline text-center'>
          Broken links
        </Link>
        <Link href='/duplicates' className='waps-btn-outline text-center'>
          Duplicates
        </Link>
      </div>

      <div className='waps-card mb-4 p-6'>
        <h2 className='mb-4 text-sm font-bold uppercase tracking-widest text-text-secondary'>
          Insights
        </h2>
        <div className='mb-4 grid grid-cols-3 gap-3 text-center'>
          <div>
            <div className='text-xl font-bold tabular-nums text-text-primary'>
              {insights.total}
            </div>
            <div className='text-xs text-text-secondary'>saved</div>
          </div>
          <div>
            <div className='text-xl font-bold tabular-nums text-text-primary'>
              {insights.recent}
            </div>
            <div className='text-xs text-text-secondary'>last 30 days</div>
          </div>
          <div>
            <div className='text-xl font-bold tabular-nums text-text-primary'>
              {insights.total
                ? Math.round((insights.read / insights.total) * 100)
                : 0}
              %
            </div>
            <div className='text-xs text-text-secondary'>read</div>
          </div>
        </div>

        {insights.topDomains.length > 0 && (
          <div className='mb-3'>
            <div className='mb-1 text-xs font-bold uppercase tracking-wide text-text-secondary'>
              Top domains
            </div>
            <ul className='space-y-1 text-sm text-text-primary'>
              {insights.topDomains.map(([host, count]) => (
                <li key={host} className='flex justify-between gap-2'>
                  <span className='truncate'>{host}</span>
                  <span className='tabular-nums text-text-secondary'>
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.topCategories.length > 0 && (
          <div>
            <div className='mb-1 text-xs font-bold uppercase tracking-wide text-text-secondary'>
              Top categories
            </div>
            <ul className='space-y-1 text-sm text-text-primary'>
              {insights.topCategories.map(cat => (
                <li key={cat.name} className='flex justify-between gap-2'>
                  <span className='truncate'>{cat.name}</span>
                  <span className='tabular-nums text-text-secondary'>
                    {cat.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className='waps-card mb-4 p-6'>
        <h2 className='mb-1 text-sm font-bold uppercase tracking-widest text-text-secondary'>
          Categories
        </h2>
        <p className='mb-4 text-sm text-text-secondary'>
          Organize your waps. Default categories can be renamed but not removed.
        </p>

        <form onSubmit={handleAddCategory} className='mb-4 flex gap-2'>
          <input
            type='text'
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder='New category name'
            maxLength={40}
            className='waps-input min-w-0 flex-1 transition-colors focus:border-primary focus:outline-none'
          />
          <button
            type='submit'
            disabled={categoryBusy || !newCategory.trim()}
            className='waps-btn flex flex-shrink-0 items-center gap-1.5 active:scale-[0.98]'
            aria-label='Add category'
          >
            <Plus size={14} />
            Add
          </button>
        </form>

        {categories && categories.length > 0 ? (
          <ul className='-m-2 space-y-0.5'>
            {categories.map(cat => (
              <li
                key={cat._id}
                className='group flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-surface'
              >
                {editingCategory === cat._id ? (
                  <input
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameCategory(cat._id)
                      if (e.key === 'Escape') setEditingCategory(null)
                    }}
                    maxLength={40}
                    autoFocus
                    className='waps-input min-w-0 flex-1 py-1 text-sm'
                  />
                ) : (
                  <span className='truncate text-sm text-text-primary'>
                    {cat.name}
                  </span>
                )}
                <div className='ml-2 flex flex-shrink-0 items-center gap-2'>
                  {editingCategory === cat._id ? (
                    <>
                      <button
                        type='button'
                        onClick={() => handleRenameCategory(cat._id)}
                        aria-label={`Save ${cat.name}`}
                        className='text-text-secondary hover:text-primary'
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type='button'
                        onClick={() => setEditingCategory(null)}
                        aria-label='Cancel edit'
                        className='text-text-secondary hover:text-destructive'
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      type='button'
                      onClick={() => {
                        setEditingCategory(cat._id)
                        setEditingName(cat.name)
                      }}
                      aria-label={`Rename ${cat.name}`}
                      className='text-text-secondary opacity-0 transition-opacity hover:text-primary group-hover:opacity-100'
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {!cat.isDefault && editingCategory !== cat._id && (
                    <button
                      type='button'
                      onClick={() => handleRemoveCategory(cat._id, cat.name)}
                      aria-label={`Remove ${cat.name}`}
                      className='text-text-secondary opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100'
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {cat.isDefault && editingCategory !== cat._id && (
                    <span className='text-tag font-bold uppercase tracking-wider text-text-secondary'>
                      default
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className='py-4 text-center text-sm text-text-secondary'>
            Loading categories...
          </div>
        )}
      </div>

      <div className='waps-card mb-4 p-6'>
        <h2 className='mb-1 text-sm font-bold uppercase tracking-widest text-text-secondary'>
          Collections
        </h2>
        <p className='mb-4 text-sm text-text-secondary'>
          Group waps and share the whole group through one public link.
        </p>

        <form onSubmit={handleAddCollection} className='mb-4 flex gap-2'>
          <input
            type='text'
            value={newCollection}
            onChange={e => setNewCollection(e.target.value)}
            placeholder='New collection name'
            maxLength={60}
            className='waps-input min-w-0 flex-1 transition-colors focus:border-primary focus:outline-none'
          />
          <button
            type='submit'
            disabled={collectionBusy || !newCollection.trim()}
            className='waps-btn flex flex-shrink-0 items-center gap-1.5 active:scale-[0.98]'
            aria-label='Add collection'
          >
            <Plus size={14} />
            Add
          </button>
        </form>

        {collections && collections.length > 0 ? (
          <ul className='space-y-1'>
            {collections.map(collection => (
              <li
                key={collection._id}
                className='flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-surface'
              >
                <div className='min-w-0'>
                  <div className='truncate text-sm text-text-primary'>
                    {collection.name}
                  </div>
                  {collection.publicId && (
                    <Link
                      href={`/c/${collection.publicId}`}
                      className='truncate text-xs text-primary underline underline-offset-2'
                    >
                      /c/{collection.publicId}
                    </Link>
                  )}
                </div>
                <div className='flex flex-shrink-0 items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => handleToggleCollection(collection._id)}
                    className='text-xs font-bold text-text-secondary underline underline-offset-2 hover:text-primary'
                  >
                    {collection.publicId ? 'Unshare' : 'Share'}
                  </button>
                  <button
                    type='button'
                    onClick={() =>
                      handleRemoveCollection(collection._id, collection.name)
                    }
                    aria-label={`Remove ${collection.name}`}
                    className='text-text-secondary hover:text-destructive'
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-text-secondary'>No collections yet.</p>
        )}
      </div>

      <div className='waps-card mb-4 p-6'>
        <h2 className='mb-2 text-sm font-bold uppercase tracking-widest text-text-secondary'>
          Browser Extension
        </h2>
        <p className='mb-4 text-sm text-text-secondary'>
          Pair your browser extension to save bookmarks directly from any
          website.
        </p>

        {pairingCode ? (
          <div className='rounded-md border border-primary bg-surface p-4 text-center'>
            <div className='mb-1 text-xs text-text-secondary'>
              Your pairing code
            </div>
            <div className='text-2xl font-bold tracking-[0.3em] text-primary'>
              {pairingCode}
            </div>
            <div className='mt-2 text-xs text-text-secondary'>
              Enter this code in the Waps browser extension. Code expires in 10
              minutes.
            </div>
          </div>
        ) : (
          <button
            onClick={() => handleGeneratePairing()}
            disabled={pairingBusy}
            className='waps-btn w-full'
          >
            {pairingBusy ? 'Generating...' : 'Generate Pairing Code'}
          </button>
        )}
      </div>

      <div className='waps-card mb-4 p-6'>
        <div className='mb-1 flex items-center justify-between gap-3'>
          <h2 className='text-sm font-bold uppercase tracking-widest text-text-secondary'>
            Active sessions
          </h2>
          <button
            type='button'
            className='text-xs font-bold text-destructive underline underline-offset-2'
            onClick={async () => {
              if (!sessionToken) return
              try {
                await revokeAllSessions({ sessionToken })
                await signOut()
                router.push('/login')
              } catch (err: any) {
                toast.error(err?.message || 'Could not revoke sessions')
              }
            }}
          >
            Sign out everywhere
          </button>
        </div>
        <p className='mb-4 text-sm text-text-secondary'>
          Review where your account is signed in and revoke devices you do not
          recognize.
        </p>
        <div className='space-y-2'>
          {sessions?.map(session => (
            <div
              key={session.id}
              className='flex items-center justify-between gap-3 rounded-md border border-border p-3'
            >
              <div className='min-w-0'>
                <div className='text-sm font-medium text-text-primary'>
                  {session.current ? 'This device' : 'Signed-in device'}
                </div>
                <div className='truncate text-xs text-text-secondary'>
                  {session.userAgent || 'Browser session'}
                </div>
                <div className='text-xs text-text-secondary'>
                  Signed in {new Date(session.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                type='button'
                className='shrink-0 text-xs font-bold text-destructive underline underline-offset-2'
                onClick={async () => {
                  if (!sessionToken) return
                  try {
                    await revokeSession({
                      sessionToken,
                      sessionId: session.id
                    })
                    if (session.current) {
                      await signOut()
                      router.push('/login')
                    }
                  } catch (err: any) {
                    toast.error(err?.message || 'Could not revoke session')
                  }
                }}
              >
                Revoke
              </button>
            </div>
          ))}
          {sessions?.length === 0 && (
            <p className='text-sm text-text-secondary'>No active sessions.</p>
          )}
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className='waps-btn-outline flex w-full items-center justify-center gap-2'
      >
        <LogOutIcon size={16} />
        Sign out
      </button>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageContent />
    </Suspense>
  )
}
