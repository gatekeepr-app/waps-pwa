'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

function EditSkeleton() {
  return (
    <div className='mx-auto max-w-lg px-4 pt-4'>
      <div className='mb-4 h-4 w-16 animate-pulse rounded bg-surface' />
      <div className='waps-card overflow-hidden'>
        <div className='h-24 animate-pulse bg-surface' />
        <div className='space-y-5 p-6'>
          <div className='h-3 w-20 animate-pulse rounded bg-surface' />
          <div className='h-10 animate-pulse rounded-md bg-surface' />
          <div className='h-3 w-24 animate-pulse rounded bg-surface' />
          <div className='h-24 animate-pulse rounded-md bg-surface' />
          <div className='h-3 w-16 animate-pulse rounded bg-surface' />
          <div className='h-10 animate-pulse rounded-md bg-surface' />
          <div className='h-11 animate-pulse rounded-md bg-surface' />
        </div>
      </div>
    </div>
  )
}

export default function EditWapPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { sessionToken, loading: sessionLoading } = useSession()
  const bookmark = useQuery(
    api.bookmarks.getById,
    sessionToken
      ? { id: id as Id<'bookmarks'>, sessionToken: sessionToken ?? undefined }
      : 'skip'
  )
  const update = useMutation(api.bookmarks.update)

  const categories = useQuery(
    api.categories.list,
    sessionToken ? { sessionToken: sessionToken ?? undefined } : 'skip'
  )

  const [loaded, setLoaded] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (bookmark && !loaded) {
      setTitle((bookmark as any).title ?? '')
      setDescription((bookmark as any).description ?? '')
      setCategoryId((bookmark as any).categoryId ?? '')
      setLoaded(true)
    }
  }, [bookmark, loaded])

  const initial = useMemo(
    () => ({
      title: (bookmark as any)?.title ?? '',
      description: (bookmark as any)?.description ?? '',
      categoryId: (bookmark as any)?.categoryId ?? ''
    }),
    [bookmark]
  )

  const dirty =
    loaded &&
    (title !== initial.title ||
      description !== initial.description ||
      categoryId !== initial.categoryId)

  if (sessionLoading || !bookmark || !loaded) {
    return <EditSkeleton />
  }

  const b = bookmark as any
  let host = b.url
  try {
    host = new URL(b.url).hostname
  } catch {}

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dirty) {
      router.push(`/wap/${id}`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await update({
        sessionToken: sessionToken ?? undefined,
        id: id as Id<'bookmarks'>,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        categoryId: (categoryId as any) || undefined
      })
      router.push(`/wap/${id}`)
    } catch {
      setError("Couldn't save your changes. Please try again.")
      setBusy(false)
    }
  }

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <Link
        href={`/wap/${id}`}
        className='mb-4 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary'
      >
        <BackIcon size={14} />
        Back
      </Link>

      <div className='waps-card overflow-hidden'>
        {b.image && (
          <img
            src={b.image}
            alt=''
            className='h-28 w-full object-cover'
            onError={e => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}

        <div className='p-6 pt-5'>
          <div className='mb-6 flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <h1 className='text-heading font-bold leading-tight text-text-primary'>
                Edit wap
              </h1>
              <a
                href={b.url}
                target='_blank'
                rel='noopener noreferrer'
                className='mt-0.5 inline-flex max-w-full items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-primary'
              >
                {b.favicon && (
                  <img
                    src={b.favicon}
                    alt=''
                    className='h-3.5 w-3.5 flex-shrink-0'
                    onError={e => {
                      ;(e.target as HTMLImageElement).style.visibility =
                        'hidden'
                    }}
                  />
                )}
                <span className='truncate'>{host}</span>
              </a>
            </div>
            {dirty && (
              <span className='flex-shrink-0 rounded-sm border border-border px-2 py-0.5 text-tag font-bold uppercase tracking-wider text-text-secondary'>
                Unsaved
              </span>
            )}
          </div>

          <form onSubmit={onSubmit} className='space-y-5'>
            <div>
              <label htmlFor='edit-title' className='waps-label mb-1.5 block'>
                Title
              </label>
              <input
                id='edit-title'
                type='text'
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='Give it a name'
                className='waps-input w-full transition-colors focus:border-primary focus:outline-none'
              />
            </div>

            <div>
              <div className='mb-1.5 flex items-baseline justify-between'>
                <label htmlFor='edit-description' className='waps-label block'>
                  Description
                </label>
                <span className='text-tag tabular-nums text-text-secondary'>
                  {description.length}/300
                </span>
              </div>
              <textarea
                id='edit-description'
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 300))}
                rows={4}
                placeholder='What is this wap about?'
                className='waps-input w-full resize-none transition-colors focus:border-primary focus:outline-none'
              />
            </div>

            {categories && categories.length > 0 && (
              <div>
                <label
                  htmlFor='edit-category'
                  className='waps-label mb-1.5 block'
                >
                  Category
                </label>
                <Select
                  value={categoryId || 'none'}
                  onValueChange={v => setCategoryId(v === 'none' ? '' : v)}
                >
                  <SelectTrigger id='edit-category' aria-label='Category'>
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

            <div className='pt-1'>
              <button
                type='submit'
                disabled={busy}
                className='waps-btn flex w-full items-center justify-center gap-2 active:scale-[0.98]'
              >
                {busy ? 'Saving...' : dirty ? 'Save changes' : 'Done'}
              </button>
              <button
                type='button'
                onClick={() => router.push(`/wap/${id}`)}
                className='mt-2 w-full py-2 text-center text-sm text-text-secondary transition-colors hover:text-text-primary'
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
