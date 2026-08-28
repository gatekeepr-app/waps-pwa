'use client'

import {
  BackIcon,
  CloseIcon,
  ExternalLinkIcon,
  LinkIcon
} from '@/components/GeometricIcons'
import { TagEditor } from '@/components/TagEditor'
import { ToggleSwitch } from '@/components/ToggleSwitch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import { CheckCircle2, Heart, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../convex/_generated/api'

const DESCRIPTION_LIMIT = 300

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
  const setTags = useMutation(api.bookmarks.setTags)
  const ensureCategories = useMutation(api.categories.ensureDefaults)

  const { sessionToken } = useSession()

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTagsState] = useState<string[]>([])
  const [categoryId, setCategoryId] = useState<string>('')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [makePublic, setMakePublic] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveStep, setSaveStep] = useState('')
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const categories = useQuery(
    api.categories.list,
    sessionToken ? { sessionToken: sessionToken ?? undefined } : 'skip'
  )

  const allTags = useQuery(
    api.bookmarks.listAllTags,
    sessionToken ? { sessionToken: sessionToken ?? undefined } : 'skip'
  )

  useEffect(() => {
    if (sessionToken)
      ensureCategories({ sessionToken: sessionToken ?? undefined })
  }, [sessionToken])

  useEffect(() => {
    const draft = localStorage.getItem('waps:add-draft')
    if (draft) {
      try {
        const d = JSON.parse(draft)
        setUrl(d.url ?? '')
        setTitle(d.title ?? '')
        setDescription(d.description ?? '')
        setTagsState(d.tags ?? [])
        setCategoryId(d.categoryId ?? '')
      } catch {}
    }
    navigator.clipboard
      .readText()
      .then(text => {
        if (text && /^https?:\/\//i.test(text.trim())) {
          setClipboardUrl(text.trim())
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!url && !title && !description && tags.length === 0 && !categoryId) {
      localStorage.removeItem('waps:add-draft')
      return
    }
    localStorage.setItem(
      'waps:add-draft',
      JSON.stringify({ url, title, description, tags, categoryId })
    )
  }, [categoryId, description, tags, title, url])

  const normalized = normalizeUrlInput(url)
  const debouncedUrl = useDebounced(normalized ?? '', 500)
  const debouncedTitle = useDebounced(title.trim(), 500)

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

  // #4 auto-categorization from the user's own library patterns
  const suggestion = useQuery(
    api.bookmarks.suggestCategory,
    sessionToken && debouncedUrl && !categoryTouched
      ? {
          sessionToken: sessionToken ?? undefined,
          url: debouncedUrl,
          title: debouncedTitle || undefined
        }
      : 'skip'
  )

  useEffect(() => {
    if (suggestion?.categoryId) setCategoryId(suggestion.categoryId as any)
  }, [suggestion])

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setUrl(text.trim())
    } catch {}
  }

  const save = useCallback(async () => {
    setError(null)

    const finalUrl = normalizeUrlInput(url)
    if (!finalUrl) {
      setError('Please enter a valid URL.')
      return
    }

    setBusy(true)
    setSaveStep('Saving link...')
    try {
      const newId = await addBookmark({
        sessionToken: sessionToken ?? undefined,
        url: finalUrl,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        categoryId: (categoryId as any) || undefined,
        isPublic: makePublic || undefined
      })
      if (tags.length > 0) {
        setSaveStep('Saving tags...')
        await setTags({
          bookmarkId: newId,
          tags,
          sessionToken: sessionToken ?? undefined
        })
      }
      setSaveStep('Fetching metadata...')
      localStorage.removeItem('waps:add-draft')
      router.push(`/wap/${newId}`)
    } catch (err: any) {
      setError(err?.message || 'Failed to add bookmark.')
      setBusy(false)
      setSaveStep('')
    }
  }, [
    addBookmark,
    categoryId,
    description,
    makePublic,
    router,
    sessionToken,
    setTags,
    tags,
    title,
    url
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

  const canSave = !!normalized && !busy && !duplicate?.exists

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <header className='sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md'>
        <div className='mx-auto flex h-14 w-full max-w-2xl items-center gap-3 px-4'>
          <Link
            href='/bookmarks'
            aria-label='Back to bookmarks'
            className='-ml-2 rounded-md p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary'
          >
            <BackIcon size={18} />
          </Link>
          <div className='min-w-0 flex-1'>
            <h1 className='truncate text-heading font-bold leading-tight text-text-primary'>
              Add a Wap
            </h1>
            <p className='text-tag font-bold uppercase tracking-wider text-text-secondary'>
              Save a link to your library
            </p>
          </div>
          <button
            type='button'
            onClick={save}
            disabled={!canSave}
            className='waps-btn hidden px-4 sm:flex'
          >
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <main className='mx-auto w-full max-w-2xl flex-1 px-4 pb-36 pt-5'>
        <form
          id='add-wap-form'
          onSubmit={e => {
            e.preventDefault()
            save()
          }}
        >
          {/* Link */}
          <section className='waps-card p-5 sm:p-6'>
            {!url && clipboardUrl && (
              <div className='mb-4 rounded-md border border-border bg-surface p-3 text-sm text-text-secondary'>
                <div className='mb-2 truncate'>
                  Use copied link? {clipboardUrl}
                </div>
                <Button
                  type='button'
                  onClick={() => {
                    setUrl(clipboardUrl)
                    setClipboardUrl(null)
                  }}
                  size='sm'
                >
                  Use clipboard link
                </Button>
              </div>
            )}
            <label htmlFor='add-url' className='waps-label mb-2 block'>
              Link
            </label>
            <div className='relative'>
              <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary'>
                <LinkIcon size={15} />
              </span>
              <input
                id='add-url'
                type='text'
                inputMode='url'
                autoComplete='off'
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder='https://example.com/article'
                className='waps-input w-full py-3 pl-9 pr-20 text-sm'
                autoFocus
              />
              <div className='absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1'>
                {!url && (
                  <button
                    type='button'
                    onClick={pasteFromClipboard}
                    className='rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/10'
                  >
                    Paste
                  </button>
                )}
                {url && (
                  <button
                    type='button'
                    onClick={() => setUrl('')}
                    aria-label='Clear link'
                    className='rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary'
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>
            </div>

            {url.trim() !== '' &&
              (normalized ? (
                <p className='mt-2 flex items-center gap-1.5 break-all text-xs text-emerald-400'>
                  <CheckCircle2 size={13} className='flex-shrink-0' />
                  {normalized}
                </p>
              ) : (
                <p className='mt-2 text-xs text-destructive'>
                  That does not look like a valid link yet.
                </p>
              ))}

            {duplicate?.exists && (
              <Alert variant='destructive' role='alert' className='mt-4'>
                <AlertTitle>Already saved</AlertTitle>
                <AlertDescription>
                  You have this wap in your collection.{' '}
                  {duplicate.bookmarkId && (
                    <>
                      <Link
                        href={`/wap/${duplicate.bookmarkId}`}
                        className='font-bold underline underline-offset-2'
                      >
                        View it
                      </Link>{' '}
                      or{' '}
                      <Link
                        href={`/wap/${duplicate.bookmarkId}/edit`}
                        className='font-bold underline underline-offset-2'
                      >
                        edit it
                      </Link>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!duplicate?.exists &&
              popularity !== undefined &&
              popularity.users > 0 && (
                <div className='mt-4 flex items-start gap-3 rounded-md border border-primary/40 bg-primary/10 px-4 py-3'>
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
                    <button
                      type='button'
                      onClick={() => setMakePublic(true)}
                      className='mt-2 block text-xs font-bold uppercase tracking-wider text-primary underline underline-offset-2'
                    >
                      Make public on save
                    </button>
                  </div>
                </div>
              )}
          </section>

          {/* Details */}
          <section className='waps-card mt-4 p-5 sm:p-6'>
            <h2 className='waps-label mb-4'>Details</h2>

            <div className='space-y-5'>
              <div>
                <label htmlFor='add-title' className='waps-label mb-1.5 block'>
                  Title
                </label>
                <input
                  id='add-title'
                  type='text'
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder='Leave empty and we will fetch one automatically'
                  className='waps-input w-full py-2.5'
                />
              </div>

              <div>
                <div className='mb-1.5 flex items-baseline justify-between'>
                  <label htmlFor='add-description' className='waps-label block'>
                    Description
                  </label>
                  <span className='text-tag tabular-nums text-text-secondary'>
                    {description.length}/{DESCRIPTION_LIMIT}
                  </span>
                </div>
                <textarea
                  id='add-description'
                  value={description}
                  onChange={e =>
                    setDescription(e.target.value.slice(0, DESCRIPTION_LIMIT))
                  }
                  rows={3}
                  placeholder='Why is this worth saving?'
                  className='waps-input w-full resize-none py-2.5'
                />
              </div>

              {categories && categories.length > 0 && (
                <div>
                  <label
                    htmlFor='add-category'
                    className='waps-label mb-1.5 block'
                  >
                    Category
                  </label>
                  <Select
                    value={categoryId || 'none'}
                    onValueChange={v => {
                      setCategoryTouched(true)
                      setCategoryId(v === 'none' ? '' : v)
                    }}
                  >
                    <SelectTrigger
                      id='add-category'
                      aria-label='Category'
                      className='h-11'
                    >
                      <SelectValue
                        placeholder={
                          suggestion
                            ? `Auto: ${suggestion.name}`
                            : 'Pick a category'
                        }
                      />
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
                  {!categoryTouched && suggestion && (
                    <p className='mt-1.5 flex items-center gap-1.5 text-xs text-text-secondary'>
                      <Sparkles size={12} className='text-primary' />
                      Auto-filled with {suggestion.name} based on your library
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Organize */}
          <section className='waps-card mt-4 p-5 sm:p-6'>
            <h2 className='waps-label mb-4'>Organize</h2>

            <div className='space-y-6'>
              <div>
                <span className='waps-label mb-1.5 block'>Tags</span>
                <TagEditor
                  tags={tags}
                  onChange={setTagsState}
                  suggestions={allTags}
                />
              </div>

              <div className='border-t border-border pt-5'>
                <ToggleSwitch
                  checked={makePublic}
                  onChange={setMakePublic}
                  label='Make this wap public'
                  description='Anyone can discover it on the Explore page. You can change this later.'
                />
              </div>
            </div>
          </section>

          {error && (
            <Alert variant='destructive' role='alert' className='mt-4'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {saveStep && (
            <p className='mt-4 text-center text-sm text-text-secondary'>
              {saveStep}
            </p>
          )}

          <p className='mt-4 hidden items-center justify-center gap-1.5 text-tag font-bold uppercase tracking-wider text-text-secondary sm:flex'>
            <ExternalLinkIcon size={11} />
            Tip: press Ctrl + Enter to save
          </p>
        </form>
      </main>

      {/* Sticky action bar */}
      <div className='fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md'>
        <div className='mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3'>
          <button
            type='button'
            onClick={() => router.push('/bookmarks')}
            disabled={busy}
            className='waps-btn-outline h-11 flex-1'
          >
            Cancel
          </button>
          <button
            type='submit'
            form='add-wap-form'
            disabled={!canSave}
            className='waps-btn h-11 flex-[2] items-center justify-center active:scale-[0.98]'
          >
            {busy
              ? 'Saving...'
              : duplicate?.exists
                ? 'Already saved'
                : 'Save Wap'}
          </button>
        </div>
      </div>
    </div>
  )
}
