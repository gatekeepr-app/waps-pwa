'use client'

import { LogOutIcon } from '@/components/GeometricIcons'
import { signOut } from '@/lib/auth-api'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import { Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'

export default function ProfilePage() {
  const router = useRouter()
  const { user, sessionToken, loading: sessionLoading } = useSession()
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingBusy, setPairingBusy] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [categoryBusy, setCategoryBusy] = useState(false)

  const generateCode = useMutation(api.pairing.generatePairingCode)
  const addCategory = useMutation(api.categories.add)
  const removeCategory = useMutation(api.categories.remove)

  const bookmarks = useQuery(
    api.bookmarks.list,
    sessionToken ? { sessionToken } : 'skip'
  )
  const categories = useQuery(
    api.categories.list,
    sessionToken ? { sessionToken } : 'skip'
  )

  async function handleSignOut() {
    try {
      await signOut()
    } catch {}
    localStorage.removeItem('waps:user')
    router.push('/login')
  }

  async function handleGeneratePairing() {
    if (!sessionToken) return
    setPairingBusy(true)
    try {
      const result = await generateCode({ sessionToken })
      setPairingCode(result.code)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate code')
    } finally {
      setPairingBusy(false)
    }
  }

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
      </div>

      <div className='waps-card mb-4 p-6'>
        <h2 className='mb-1 text-sm font-bold uppercase tracking-widest text-text-secondary'>
          Categories
        </h2>
        <p className='mb-4 text-sm text-text-secondary'>
          Organize your waps. Default categories can&apos;t be removed.
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
                <span className='truncate text-sm text-text-primary'>
                  {cat.name}
                </span>
                {!cat.isDefault && (
                  <button
                    onClick={() => handleRemoveCategory(cat._id, cat.name)}
                    aria-label={`Remove ${cat.name}`}
                    className='text-text-secondary opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100'
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                {cat.isDefault && (
                  <span className='text-tag font-bold uppercase tracking-wider text-text-secondary'>
                    default
                  </span>
                )}
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
            onClick={handleGeneratePairing}
            disabled={pairingBusy}
            className='waps-btn w-full'
          >
            {pairingBusy ? 'Generating...' : 'Generate Pairing Code'}
          </button>
        )}
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
