'use client'

import {
  BackIcon,
  ExternalLinkIcon,
  PinIcon
} from '@/components/GeometricIcons'
import { TagEditor } from '@/components/TagEditor'
import { ToggleSwitch } from '@/components/ToggleSwitch'
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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

const DESCRIPTION_LIMIT = 300

function EditSkeleton() {
  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <div className='sticky top-0 z-40 border-b border-border bg-background/90'>
        <div className='mx-auto flex h-14 w-full max-w-2xl items-center gap-3 px-4'>
          <div className='h-9 w-9 animate-pulse rounded-md bg-surface' />
          <div className='h-5 w-32 animate-pulse rounded bg-surface' />
        </div>
      </div>
      <main className='mx-auto w-full max-w-2xl flex-1 px-4 pb-36 pt-5'>
        <div className='waps-card overflow-hidden'>
          <div className='h-44 animate-pulse bg-surface' />
          <div className='space-y-5 p-5 sm:p-6'>
            <div className='h-3 w-20 animate-pulse rounded bg-surface' />
            <div className='h-11 animate-pulse rounded-md bg-surface' />
            <div className='h-3 w-24 animate-pulse rounded bg-surface' />
            <div className='h-28 animate-pulse rounded-md bg-surface' />
            <div className='h-3 w-16 animate-pulse rounded bg-surface' />
            <div className='h-11 animate-pulse rounded-md bg-surface' />
          </div>
        </div>
      </main>
      <div className='fixed inset-x-0 bottom-0 border-t border-border bg-background/95'>
        <div className='mx-auto flex w-full max-w-2xl gap-3 px-4 py-3'>
          <div className='h-11 flex-1 animate-pulse rounded-md bg-surface' />
          <div className='h-11 flex-[2] animate-pulse rounded-md bg-surface' />
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
  const setTags = useMutation(api.bookmarks.setTags)
  const togglePublic = useMutation(api.bookmarks.togglePublic)
  const togglePin = useMutation(api.bookmarks.togglePin)
  const generateShareLink = useMutation(api.bookmarks.generateShareLink)

  const categories = useQuery(
    api.categories.list,
    sessionToken ? { sessionToken: sessionToken ?? undefined } : 'skip'
  )

  const allTags = useQuery(
    api.bookmarks.listAllTags,
    sessionToken ? { sessionToken: sessionToken ?? undefined } : 'skip'
  )

  const [loaded, setLoaded] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [tags, setTagsState] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (bookmark && !loaded) {
      const b = bookmark as any
      setTitle(b.title ?? '')
      setDescription(b.description ?? '')
      setCategoryId(b.categoryId ?? '')
      setTagsState(b.tags ?? [])
      setIsPublic(!!b.isPublic)
      setIsPinned(!!b.isPinned)
      setLoaded(true)
    }
  }, [bookmark, loaded])

  const initial = useMemo(
    () => ({
      title: (bookmark as any)?.title ?? '',
      description: (bookmark as any)?.description ?? '',
      categoryId: (bookmark as any)?.categoryId ?? '',
      tags: (bookmark as any)?.tags ?? ([] as string[]),
      isPublic: !!(bookmark as any)?.isPublic,
      isPinned: !!(bookmark as any)?.isPinned
    }),
    [bookmark]
  )

  const dirty =
    loaded &&
    (title !== initial.title ||
      description !== initial.description ||
      categoryId !== initial.categoryId ||
      tags.join('\u0000') !== initial.tags.join('\u0000') ||
      isPublic !== initial.isPublic ||
      isPinned !== initial.isPinned)

  const publicId = (bookmark as any)?.publicId as string | undefined

  const save = useCallback(async () => {
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
      if (tags.join('\u0000') !== initial.tags.join('\u0000')) {
        await setTags({ bookmarkId: id as Id<'bookmarks'>, tags })
      }
      if (isPinned !== initial.isPinned) {
        await togglePin({
          id: id as Id<'bookmarks'>,
          sessionToken: sessionToken ?? undefined
        })
      }
      if (isPublic !== initial.isPublic) {
        await togglePublic({
          id: id as Id<'bookmarks'>,
          sessionToken: sessionToken ?? undefined
        })
        // Mint a publicId when going public so Explore can deep-link to the
        // share page instead of the raw URL.
        if (isPublic && !publicId) {
          await generateShareLink({
            id: id as Id<'bookmarks'>,
            sessionToken: sessionToken ?? undefined
          })
        }
      }
      router.push(`/wap/${id}`)
    } catch {
      setError("Couldn't save your changes. Please try again.")
      setBusy(false)
    }
  }, [
    categoryId,
    description,
    dirty,
    generateShareLink,
    id,
    initial.isPinned,
    initial.isPublic,
    initial.tags,
    isPinned,
    isPublic,
    publicId,
    router,
    sessionToken,
    setTags,
    tags,
    title,
    togglePin,
    togglePublic,
    update
  ])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  if (sessionLoading || !bookmark || !loaded) {
    return <EditSkeleton />
  }

  const b = bookmark as any
  let host = b.url
  try {
    host = new URL(b.url).hostname.replace(/^www\./, '')
  } catch {}

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <header className='sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md'>
        <div className='mx-auto flex h-14 w-full max-w-2xl items-center gap-3 px-4'>
          <Link
            href={`/wap/${id}`}
            aria-label='Back to wap'
            className='-ml-2 rounded-md p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary'
          >
            <BackIcon size={18} />
          </Link>
          <div className='min-w-0 flex-1'>
            <h1 className='truncate text-heading font-bold leading-tight text-text-primary'>
              Edit Wap
            </h1>
            <span className='block truncate text-tag font-bold uppercase tracking-wider text-text-secondary'>
              {host}
            </span>
          </div>
          {dirty && !busy && (
            <span className='hidden flex-shrink-0 rounded-sm border border-border px-2 py-0.5 text-tag font-bold uppercase tracking-wider text-text-secondary sm:block'>
              Unsaved
            </span>
          )}
          <button
            type='button'
            onClick={save}
            disabled={busy}
            className='waps-btn hidden px-4 sm:flex'
          >
            {busy ? 'Saving...' : dirty ? 'Save' : 'Done'}
          </button>
        </div>
      </header>

      <main className='mx-auto w-full max-w-2xl flex-1 px-4 pb-36 pt-5'>
        <form
          onSubmit={e => {
            e.preventDefault()
            save()
          }}
        >
          {/* Preview */}
          <section className='waps-card overflow-hidden'>
            {b.image && (
              <img
                src={b.image}
                alt=''
                className='h-44 w-full object-cover'
                onError={e => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            <div className='flex items-center justify-between gap-3 px-5 py-4'>
              <div className='flex min-w-0 items-center gap-2.5'>
                {b.favicon && (
                  <img
                    src={b.favicon}
                    alt=''
                    className='h-5 w-5 flex-shrink-0'
                    onError={e => {
                      ;(e.target as HTMLImageElement).style.visibility =
                        'hidden'
                    }}
                  />
                )}
                <a
                  href={b.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='truncate text-sm font-medium text-text-primary transition-colors hover:text-primary'
                >
                  {host}
                </a>
              </div>
              <a
                href={b.url}
                target='_blank'
                rel='noopener noreferrer'
                className='flex flex-shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors hover:border-primary hover:text-primary'
              >
                Open
                <ExternalLinkIcon size={12} />
              </a>
            </div>
          </section>

          {/* Details */}
          <section className='waps-card mt-4 p-5 sm:p-6'>
            <h2 className='waps-label mb-4'>Details</h2>

            <div className='space-y-5'>
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
                  className='waps-input w-full py-2.5'
                />
              </div>

              <div>
                <div className='mb-1.5 flex items-baseline justify-between'>
                  <label
                    htmlFor='edit-description'
                    className='waps-label block'
                  >
                    Description
                  </label>
                  <span className='text-tag tabular-nums text-text-secondary'>
                    {description.length}/{DESCRIPTION_LIMIT}
                  </span>
                </div>
                <textarea
                  id='edit-description'
                  value={description}
                  onChange={e =>
                    setDescription(e.target.value.slice(0, DESCRIPTION_LIMIT))
                  }
                  rows={4}
                  placeholder='What is this wap about?'
                  className='waps-input w-full resize-none py-2.5'
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
                    <SelectTrigger
                      id='edit-category'
                      aria-label='Category'
                      className='h-11'
                    >
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
            </div>
          </section>

          {/* Tags */}
          <section className='waps-card mt-4 p-5 sm:p-6'>
            <h2 className='waps-label mb-4'>Tags</h2>
            <TagEditor
              tags={tags}
              onChange={setTagsState}
              suggestions={allTags}
            />
          </section>

          {/* Visibility & status */}
          <section className='waps-card mt-4 p-5 sm:p-6'>
            <h2 className='waps-label mb-4'>Visibility &amp; status</h2>
            <div className='space-y-5'>
              <ToggleSwitch
                checked={isPublic}
                onChange={setIsPublic}
                label='Public wap'
                description={
                  isPublic
                    ? 'Visible to everyone on the Explore page.'
                    : 'Only you can see this wap. Make it public so others can discover it.'
                }
              />
              <div className='border-t border-border pt-5'>
                <ToggleSwitch
                  checked={isPinned}
                  onChange={setIsPinned}
                  label='Pinned'
                  description='Keep this wap at the top of your library.'
                />
              </div>
            </div>
          </section>

          {error && (
            <Alert variant='destructive' role='alert' className='mt-4'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className='mt-4 hidden items-center justify-center gap-1.5 text-tag font-bold uppercase tracking-wider text-text-secondary sm:flex'>
            <PinIcon size={11} />
            Tip: press Ctrl + Enter to save
          </p>
        </form>
      </main>

      {/* Sticky action bar */}
      <div className='fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md'>
        <div className='mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3'>
          <button
            type='button'
            onClick={() => router.push(`/wap/${id}`)}
            disabled={busy}
            className='waps-btn-outline h-11 flex-1'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={busy}
            className='waps-btn h-11 flex-[2] items-center justify-center active:scale-[0.98]'
          >
            {busy ? 'Saving...' : dirty ? 'Save changes' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
