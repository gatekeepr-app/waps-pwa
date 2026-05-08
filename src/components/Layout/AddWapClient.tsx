'use client'

import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAction, useMutation, useQuery } from 'convex/react'
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  Sparkles
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
  const [toMyWaps, setToMyWaps] = useState(false)

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
      setMessage('Ready to add')
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
        setMessage('Ready to add')
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

      if (localOwnerKey && toMyWaps) {
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

  const showFields = status !== 'idle'

  const badge = useMemo(() => {
    switch (status) {
      case 'checking':
        return (
          <Badge className='inline-flex items-center gap-1 border-zinc-700 bg-zinc-800 text-zinc-200'>
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          </Badge>
        )
      case 'found':
        return (
          <Badge className='inline-flex items-center gap-1 border-emerald-500/40 bg-emerald-500/20 text-emerald-200'>
            <CheckCircle2 className='h-3.5 w-3.5' />
          </Badge>
        )
      case 'scanning':
        return (
          <Badge className='inline-flex items-center gap-1 border-orange-500/40 bg-orange-500/20 text-orange-200'>
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          </Badge>
        )
      case 'new':
        return (
          <Badge className='border-violet-500/40 bg-violet-500/20 text-violet-200'>
            New
          </Badge>
        )
      case 'saving':
        return (
          <Badge className='inline-flex items-center gap-1 border-zinc-700 bg-zinc-800 text-zinc-200'>
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          </Badge>
        )
      case 'error':
        return (
          <Badge className='inline-flex items-center gap-1 border-red-500/40 bg-red-500/20 text-red-200'>
            <AlertTriangle className='h-3.5 w-3.5' />
          </Badge>
        )
      default:
        return null
    }
  }, [status])

  return (
    <main className='waps-bg min-h-dvh px-4 pb-24 pt-3 text-white'>
      <div className='mx-auto w-full max-w-screen-sm'>
        <form
          onSubmit={onSubmit}
          className='waps-card space-y-5 rounded-2xl p-5'
        >
          {/* Header row */}
          <div className='flex items-center gap-3'>
            <div className='waps-brand-bg grid h-10 w-10 shrink-0 place-items-center rounded-xl'>
              <Globe className='h-5 w-5 text-white' />
            </div>
            <div className='min-w-0 flex-1'>
              <h1 className='text-lg font-semibold leading-tight'>
                Add a website
              </h1>
              {showFields && (
                <p className='mt-0.5 text-xs leading-tight text-white/50'>
                  {message}
                </p>
              )}
            </div>
            <div className='flex items-center gap-3'>
              {localOwnerKey && (
                <label className='flex cursor-pointer items-center gap-2'>
                  <span className='whitespace-nowrap text-xs text-white/50'>
                    {toMyWaps ? 'My Waps' : 'Public'}
                  </span>
                  <Switch
                    checked={toMyWaps}
                    onCheckedChange={setToMyWaps}
                    className='data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-white/20'
                  />
                </label>
              )}
              {badge}
            </div>
          </div>

          {/* URL input */}
          <div>
            <div className='flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition focus-within:border-white/20'>
              <Input
                value={rawUrl}
                onChange={e => setRawUrl(e.currentTarget.value)}
                placeholder='Paste a link…'
                className='h-9 border-0 bg-transparent px-0 text-base placeholder:text-white/30 focus-visible:ring-0'
                autoFocus
              />
            </div>
            {normalized?.origin && (
              <p className='mt-1.5 text-xs text-white/40'>
                https://{normalized.origin}/
              </p>
            )}
          </div>

          {/* Fields (reveal after scan) */}
          {showFields && (
            <div className='space-y-4'>
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

              <div className='grid grid-cols-2 gap-3'>
                <Field label='Slug'>
                  <Input
                    value={slug}
                    onChange={e => setSlug(slugify(e.currentTarget.value))}
                    placeholder='auto'
                    className='h-9 border-0 bg-white/5'
                  />
                </Field>

                <Field label='Category'>
                  <Select
                    value={
                      CATEGORIES.includes(category as any) ? category : 'other'
                    }
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
                      <SelectValue placeholder='Pick one' />
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
                      placeholder='Custom category'
                      className='mt-2 h-8 border-0 bg-white/5 text-sm'
                    />
                  )}
                </Field>
              </div>

              <Field label='Description'>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.currentTarget.value)}
                  rows={4}
                  placeholder='What does this website do?'
                  className='resize-none border-0 bg-white/5'
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

              <Button
                type='submit'
                disabled={
                  !normalized?.canonicalUrl ||
                  !title.trim() ||
                  !slug.trim() ||
                  !description.trim() ||
                  busySubmit
                }
                className='waps-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm'
              >
                {busySubmit ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' /> Saving…
                  </>
                ) : (
                  <>
                    <Sparkles className='h-4 w-4' />{' '}
                    {toMyWaps ? 'Save to my Waps' : 'Share to Discover'}
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
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
