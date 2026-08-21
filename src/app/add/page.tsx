'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

export default function AddPage() {
  const router = useRouter()
  const addBookmark = useMutation(api.bookmarks.add)
  const ensureCategories = useMutation(api.categories.ensureDefaults)

  const [userId, setUserId] = useState<Id<'users'> | null>(null)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('waps:user')
      if (stored) {
        const user = JSON.parse(stored)
        if (user?.id) setUserId(user.id as Id<'users'>)
      }
    } catch {}
  }, [])

  const categories = useQuery(api.categories.list, userId ? { userId } : 'skip')

  useEffect(() => {
    if (userId) ensureCategories({ userId })
  }, [userId])

  useEffect(() => {
    navigator.clipboard
      .readText()
      .then(text => {
        if (text && /^https?:\/\//i.test(text.trim())) {
          setUrl(text.trim())
        }
      })
      .catch(() => {})
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    let finalUrl = url.trim()
    if (!finalUrl) {
      setError('Please enter a URL.')
      return
    }
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl
    }
    try {
      new URL(finalUrl)
    } catch {
      setError('Please enter a valid URL.')
      return
    }

    setBusy(true)
    try {
      await addBookmark({
        url: finalUrl,
        title: title.trim() || undefined,
        categoryId: (categoryId as any) || undefined
      })
      router.push('/bookmarks')
    } catch (err: any) {
      setError(err?.message || 'Failed to add bookmark.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='mx-auto max-w-lg px-4 pt-4'>
      <Link
        href='/bookmarks'
        className='mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary'
      >
        <BackIcon size={14} />
        Back
      </Link>

      <div className='waps-card p-6'>
        <h1 className='mb-4 text-heading font-bold text-text-primary'>
          Add a Wap
        </h1>

        <form onSubmit={onSubmit} className='space-y-4'>
          <div>
            <label className='waps-label mb-1 block'>URL</label>
            <input
              type='text'
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder='https://example.com or paste a link'
              className='waps-input w-full'
              autoFocus
            />
          </div>

          <div>
            <label className='waps-label mb-1 block'>Title (optional)</label>
            <input
              type='text'
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='Give it a name'
              className='waps-input w-full'
            />
          </div>

          {categories && categories.length > 0 && (
            <div>
              <label className='waps-label mb-1 block'>Category</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className='waps-input w-full'
              >
                <option value=''>No category</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className='text-sm text-destructive' role='alert'>
              {error}
            </div>
          )}

          <button
            type='submit'
            disabled={busy}
            className='waps-btn flex w-full items-center justify-center gap-2'
          >
            {busy ? 'Saving...' : 'Save Wap'}
          </button>
        </form>
      </div>
    </div>
  )
}
