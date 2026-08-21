'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { normalizeUrlInput } from '@/lib/url'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '../../../convex/_generated/api'

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function AddPage() {
  const router = useRouter()
  const addBookmark = useMutation(api.bookmarks.add)
  const ensureCategories = useMutation(api.categories.ensureDefaults)

  const { sessionToken } = useSession()

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [makePublic, setMakePublic] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = useQuery(
    api.categories.list,
    sessionToken ? { sessionToken: sessionToken ?? undefined } : 'skip'
  )

  useEffect(() => {
    if (sessionToken)
      ensureCategories({ sessionToken: sessionToken ?? undefined })
  }, [sessionToken])

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

  const normalized = normalizeUrlInput(url)
  const debouncedUrl = useDebounced(normalized ?? '', 500)

  const duplicate = useQuery(
    api.bookmarks.checkDuplicate,
    sessionToken && debouncedUrl
      ? {
          sessionToken: sessionToken ?? undefined,
          url: debouncedUrl
        }
      : 'skip'
  )

  const popularity = useQuery(
    api.bookmarks.linkPopularity,
    !duplicate?.exists && debouncedUrl
      ? { url: debouncedUrl, sessionToken: sessionToken ?? undefined }
      : 'skip'
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const finalUrl = normalizeUrlInput(url)
    if (!finalUrl) {
      setError('Please enter a valid URL.')
      return
    }

    setBusy(true)
    try {
      await addBookmark({
        sessionToken: sessionToken ?? undefined,
        url: finalUrl,
        title: title.trim() || undefined,
        categoryId: (categoryId as any) || undefined,
        isPublic: makePublic || undefined
      })
      router.push('/bookmarks')
    } catch (err: any) {
      setError(err?.message || 'Failed to add bookmark.')
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

          {duplicate?.exists && (
            <Alert variant='destructive' role='alert'>
              <AlertTitle>Already saved</AlertTitle>
              <AlertDescription>
                You have this wap in your collection.{' '}
                {duplicate.bookmarkId && (
                  <Link
                    href={`/wap/${duplicate.bookmarkId}`}
                    className='font-bold underline underline-offset-2'
                  >
                    View it
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!duplicate?.exists &&
            popularity !== undefined &&
            popularity.users > (popularity.mine ? 0 : 0) && (
              <div className='flex items-start gap-3 rounded-md border border-primary/40 bg-primary/10 px-4 py-3'>
                <Heart
                  size={16}
                  className='mt-0.5 flex-shrink-0 text-primary'
                  fill='currentColor'
                />
                <div className='text-sm text-text-primary'>
                  <span className='font-bold text-primary'>
                    {popularity.users === 1
                      ? 'Someone already loves this link.'
                      : `${popularity.users} people are loving this link.`}
                  </span>{' '}
                  Make it public so others can discover it too.
                  <label className='mt-2 flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary'>
                    <input
                      type='checkbox'
                      checked={makePublic}
                      onChange={e => setMakePublic(e.target.checked)}
                      className='h-4 w-4 accent-[#f97316]'
                    />
                    Make public on save
                  </label>
                </div>
              </div>
            )}

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
              <Select
                value={categoryId || 'none'}
                onValueChange={v => setCategoryId(v === 'none' ? '' : v)}
              >
                <SelectTrigger aria-label='Category'>
                  <SelectValue placeholder='Pick a category' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>No category</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <Alert variant='destructive' role='alert'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <button
            type='submit'
            disabled={busy || !!duplicate?.exists}
            className='waps-btn flex w-full items-center justify-center gap-2 active:scale-[0.98]'
          >
            {busy
              ? 'Saving...'
              : duplicate?.exists
                ? 'Already saved'
                : 'Save Wap'}
          </button>
        </form>
      </div>
    </div>
  )
}
