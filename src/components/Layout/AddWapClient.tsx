'use client'

import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useAction, useMutation, useQuery } from 'convex/react'
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  PlusCircle
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'

const SYSTEM_OWNER = 'seed'
const SYSTEM_BOARD_SLUG = 'discover'

const CATEGORIES = [
  'Design',
  'Productivity',
  'Dev & Infra',
  'Reading',
  'Education',
  'Music & Audio',
  'Video',
  'Tools'
] as const

type Status =
  | 'idle'
  | 'checking'
  | 'found'
  | 'scanning'
  | 'new'
  | 'saving'
  | 'error'

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

function normalizeToHomepage(
  input: string
): { canonicalUrl: string; origin: string } | null {
  try {
    const u = new URL(input.includes('://') ? input : `https://${input}`)
    const origin = u.hostname.replace(/^www\./, '')
    return { canonicalUrl: `https://${origin}/`, origin }
  } catch {
    return null
  }
}

function guessFavicon(origin: string) {
  return `https://www.google.com/s2/favicons?sz=64&domain=${origin}`
}

function errText(e: unknown) {
  return e instanceof Error ? e.message : String(e ?? 'Unknown error')
}

function useOwnerKey() {
  const [ownerKey, setOwnerKey] = useState<string | null>(null)
  useEffect(() => {
    try {
      const k =
        localStorage.getItem('waps.ownerKey') ||
        localStorage.getItem('wapsOwnerKey')
      if (k) setOwnerKey(k)
    } catch {}
  }, [])
  return ownerKey
}

export default function AddWapClient() {
  const searchParams = useSearchParams()
  const localOwnerKey = useOwnerKey()

  const [rawUrl, setRawUrl] = useState('')
  const normalized = useMemo(() => normalizeToHomepage(rawUrl), [rawUrl])

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [description, setDescription] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [selectedBoard, setSelectedBoard] = useState('discover')

  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [busySubmit, setBusySubmit] = useState(false)

  const url = searchParams.get('url')
  const title2 = searchParams.get('title')
  const text = searchParams.get('text')

  useEffect(() => {
    if (url) {
      setRawUrl(url)
      setTitle(title2 || '')
      setDescription(text || '')
    }
  }, [url, title2, text])

  const userBoards = useQuery(
    api.boards.listByOwnerKey,
    localOwnerKey ? { ownerKey: localOwnerKey } : 'skip'
  )

  const seedBoard = useQuery(api.boards.getByOwnerAndSlug, {
    ownerKey: SYSTEM_OWNER,
    slug: SYSTEM_BOARD_SLUG
  })

  const existing = useQuery(
    api.websites.getByCanonicalUrl,
    normalized?.canonicalUrl
      ? { canonicalUrl: normalized.canonicalUrl }
      : 'skip'
  )

  const ensurePublicBoard = useMutation(api.boards.ensurePublicBoard)
  const upsertWebsite = useMutation(api.websites.upsert)
  const addToBoard = useMutation(api.boardItems.addToBoard)
  const addToDefault = useMutation(api.boardItems.addToDefault)
  const scanWithGemini = useAction(api.actions.websites.scanWithGemini)

  const scannedKeyRef = useRef<string | null>(null)

  const resetForm = () => {
    setRawUrl('')
    setTitle('')
    setSlug('')
    setCategory('')
    setCustomCategory('')
    setDescription('')
    setFaviconUrl('')
    setStatus('idle')
    setMessage(null)
    setBusySubmit(false)
  }

  useEffect(() => {
    if (!normalized?.canonicalUrl) {
      if (rawUrl.trim()) {
        setStatus('error')
        setMessage('Invalid URL')
      } else {
        setStatus('idle')
        setMessage(null)
      }
      return
    }

    if (existing === undefined) {
      setStatus('checking')
      setMessage('Checking database…')
      return
    }

    if (existing) {
      setStatus('found')
      setMessage('Wap found in database')
      setTitle(existing.title || normalized.origin)
      setSlug(existing.slug || slugify(existing.title || normalized.origin))
      const existingCat = existing.categories?.[0] || ''
      setCategory(existingCat)
      if (existingCat && !CATEGORIES.includes(existingCat as any)) {
        setCustomCategory(existingCat)
      }
      setDescription(existing.description || '')
      setFaviconUrl(existing.faviconUrl || guessFavicon(normalized.origin))
      scannedKeyRef.current = null
      return
    }

    const key = normalized.canonicalUrl
    if (scannedKeyRef.current === key) {
      setStatus('new')
      setMessage('You are adding a new Wap!!')
      return
    }

    ;(async () => {
      try {
        setStatus('scanning')
        setMessage('Scanning website for details…')
        const scanned = await scanWithGemini({ url: key })

        const t = scanned?.title || normalized.origin
        setTitle(t)
        setSlug(scanned?.slug || slugify(t))
        setCategory(scanned?.category || '')
        setDescription(
          scanned?.description ||
            'A useful website discovered via Waps. Add your own notes here.'
        )
        setFaviconUrl(scanned?.faviconUrl || guessFavicon(normalized.origin))

        scannedKeyRef.current = key
        setStatus('new')
        setMessage('You are adding a new Wap!!')
      } catch (e) {
        setStatus('error')
        setMessage(errText(e))
      }
    })()
  }, [normalized?.canonicalUrl, existing])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!normalized?.canonicalUrl) return

    setBusySubmit(true)
    setStatus('saving')
    setMessage('Saving…')

    try {
      const websiteId = await upsertWebsite({
        canonicalUrl: normalized.canonicalUrl,
        origin: normalized.origin,
        title: title.trim(),
        slug: (slug || slugify(title)).trim(),
        description: description.trim(),
        categories: category ? [category.trim()] : [],
        faviconUrl: faviconUrl || guessFavicon(normalized.origin)
      })

      if (localOwnerKey && selectedBoard === 'my') {
        await addToDefault({ ownerKey: localOwnerKey, websiteId })
      } else {
        const board =
          seedBoard ??
          (await ensurePublicBoard({
            ownerKey: SYSTEM_OWNER,
            slug: SYSTEM_BOARD_SLUG,
            name: 'Discover'
          }))

        await addToBoard({
          ownerKey: board.ownerKey,
          boardId: board._id,
          websiteId
        })
      }

      setStatus('found')
      setMessage('Saved!')
      resetForm()
    } catch (e) {
      setStatus('error')
      setMessage(errText(e))
    } finally {
      setBusySubmit(false)
    }
  }

  const badge = useMemo(() => {
    switch (status) {
      case 'checking':
        return (
          <Badge className='inline-flex items-center gap-1 border-zinc-700 bg-zinc-800 text-zinc-200'>
            <Loader2 className='h-3.5 w-3.5 animate-spin' /> Checking…
          </Badge>
        )
      case 'found':
        return (
          <Badge className='inline-flex items-center gap-1 border-emerald-500/40 bg-emerald-500/20 text-emerald-200'>
            <CheckCircle2 className='h-3.5 w-3.5' /> Found
          </Badge>
        )
      case 'scanning':
        return (
          <Badge className='inline-flex items-center gap-1 border-orange-500/40 bg-orange-500/20 text-orange-200'>
            <Loader2 className='h-3.5 w-3.5 animate-spin' /> Scanning…
          </Badge>
        )
      case 'new':
        return (
          <Badge className='border-violet-500/40 bg-violet-500/20 text-violet-200'>
            New Wap!
          </Badge>
        )
      case 'saving':
        return (
          <Badge className='inline-flex items-center gap-1 border-zinc-700 bg-zinc-800 text-zinc-200'>
            <Loader2 className='h-3.5 w-3.5 animate-spin' /> Saving…
          </Badge>
        )
      case 'error':
        return (
          <Badge className='inline-flex items-center gap-1 border-red-500/40 bg-red-500/20 text-red-200'>
            <AlertTriangle className='h-3.5 w-3.5' /> {message || 'Error'}
          </Badge>
        )
      default:
        return null
    }
  }, [status, message])

  return (
    <main className='waps-bg min-h-dvh px-4 pb-24 pt-3 text-white'>
      <div className='mx-auto w-full max-w-screen-sm space-y-5'>
        {/* Header card */}
        <div className='waps-card rounded-2xl p-4'>
          <div className='flex items-center gap-2'>
            <div className='waps-brand-bg grid h-9 w-9 place-items-center rounded-xl'>
              <Globe className='h-5 w-5 text-white' />
            </div>
            <div className='min-w-0'>
              <h1 className='font-semibold'>Add a website</h1>
              <p className='text-xs text-white/50'>
                Save to:{' '}
                {localOwnerKey && selectedBoard === 'my'
                  ? 'your Waps'
                  : `${SYSTEM_OWNER}/${SYSTEM_BOARD_SLUG} (public)`}
              </p>
            </div>
            <div className='ml-auto'>{badge}</div>
          </div>

          <div className='mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2'>
            <Input
              value={rawUrl}
              onChange={e => setRawUrl(e.currentTarget.value)}
              placeholder='https://example.com/page'
              className='h-9 border-0 bg-transparent px-0 placeholder:text-white/40 focus-visible:ring-0'
              autoFocus
            />
          </div>

          {normalized?.origin && (
            <p className='mt-2 text-xs text-white/50'>
              Homepage:{' '}
              <span className='text-white/80'>
                https://{normalized.origin}/
              </span>
            </p>
          )}

          {message && status !== 'error' && (
            <p className='mt-2 text-xs text-white/50'>{message}</p>
          )}
        </div>

        {/* Form card */}
        <form
          onSubmit={onSubmit}
          className='waps-card space-y-4 rounded-2xl p-4'
        >
          <Field label='Title'>
            <Input
              value={title}
              onChange={e => {
                const v = e.currentTarget.value
                setTitle(v)
                if (!slug) setSlug(slugify(v))
              }}
              placeholder='Website name'
              className='h-9 border-0 bg-white/5'
            />
          </Field>

          <Field label='Slug'>
            <Input
              value={slug}
              onChange={e => setSlug(slugify(e.currentTarget.value))}
              placeholder='auto-generated'
              className='h-9 border-0 bg-white/5'
            />
          </Field>

          <Field label='Category'>
            <Select
              value={CATEGORIES.includes(category as any) ? category : 'other'}
              onValueChange={v => {
                if (v === 'other') {
                  setCategory(customCategory || '')
                } else {
                  setCategory(v)
                  setCustomCategory('')
                }
              }}
            >
              <SelectTrigger className='h-9 border border-white/10 bg-white/5 text-white'>
                <SelectValue placeholder='Select a category' />
              </SelectTrigger>
              <SelectContent className='border-white/10 bg-zinc-900 text-white'>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value='other'>Other…</SelectItem>
              </SelectContent>
            </Select>
            {category && !CATEGORIES.includes(category as any) && (
              <Input
                value={customCategory}
                onChange={e => {
                  setCustomCategory(e.currentTarget.value)
                  setCategory(e.currentTarget.value)
                }}
                placeholder='Type a custom category'
                className='mt-2 h-9 border-0 bg-white/5'
              />
            )}
          </Field>

          <Field label='Description'>
            <Textarea
              value={description}
              onChange={e => setDescription(e.currentTarget.value)}
              rows={5}
              placeholder='A detailed paragraph about what the website does…'
              className='border-0 bg-white/5'
            />
          </Field>

          <Field label='Favicon URL'>
            <Input
              value={faviconUrl}
              onChange={e => setFaviconUrl(e.currentTarget.value)}
              placeholder='https://…/favicon.ico'
              className='h-9 border-0 bg-white/5'
            />
          </Field>

          {/* Board selector */}
          {localOwnerKey && (
            <Field label='Save to'>
              <div className='flex gap-2'>
                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                  <SelectTrigger className='flex-1 border border-white/10 bg-white/5 text-white'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className='border-white/10 bg-zinc-900 text-white'>
                    <SelectItem value='discover'>
                      Public board (Discover)
                    </SelectItem>
                    <SelectItem value='my'>
                      My Waps (your default board)
                    </SelectItem>
                    {userBoards
                      ?.filter(b => b.slug !== 'default')
                      .map(b => (
                        <SelectItem key={b._id} value={b._id}>
                          {b.name} {b.isPublic ? '(public)' : '(private)'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </Field>
          )}

          <div className='pt-2'>
            <Button
              type='submit'
              disabled={
                !normalized?.canonicalUrl ||
                !title.trim() ||
                !slug.trim() ||
                !description.trim() ||
                busySubmit
              }
              className='waps-btn inline-flex w-full items-center gap-2'
            >
              {busySubmit ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' /> Saving…
                </>
              ) : (
                <>
                  <PlusCircle className='h-4 w-4' />{' '}
                  {selectedBoard === 'my'
                    ? 'Save to my Waps'
                    : 'Add to Discover'}
                </>
              )}
            </Button>
          </div>
        </form>

        {faviconUrl ? (
          <div className='flex items-center gap-2 text-xs text-white/50'>
            <span>Favicon preview:</span>
            <img
              src={faviconUrl}
              alt=''
              width={16}
              height={16}
              className='rounded'
            />
          </div>
        ) : null}
      </div>
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
    <label className='block'>
      <div className='mb-1 text-xs uppercase tracking-wide text-white/50'>
        {label}
      </div>
      <div className='rounded-xl border border-white/10 bg-white/5 p-2'>
        {children}
      </div>
    </label>
  )
}
