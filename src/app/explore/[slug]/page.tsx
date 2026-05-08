// File: app/(app)/site/[slug]/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useMutation, useQuery } from 'convex/react'
import { Check, ExternalLink, Plus, Share2, StickyNote } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../../convex/_generated/api'

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

export default function SiteDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const ownerKey = useOwnerKey()

  const details = useQuery(api.waps.getWebsiteDetails, {
    slug,
    ownerKey: ownerKey ?? undefined
  })

  const boards = useQuery(
    api.waps.listBoardsByOwner,
    ownerKey ? { ownerKey } : 'skip'
  )
  const similar = useQuery(api.waps.getSimilarWebsites, { slug, limit: 8 })
  const addToBoard = useMutation(api.waps.addToBoard)
  const updateNotes = useMutation(api.boardItems.updateNotes)

  const [boardSlug, setBoardSlug] = useState<string>('default')
  const [adding, setAdding] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(details?.notes || '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (details?.notes !== undefined) setNotes(details.notes)
  }, [details?.notes])

  const handleSaveNotes = async () => {
    if (!details?.boardItemId) return
    setNotesSaving(true)
    try {
      await updateNotes({
        ownerKey: ownerKey!,
        boardItemId: details.boardItemId,
        notes
      })
      setEditingNotes(false)
    } finally {
      setNotesSaving(false)
    }
  }

  const site = details?.website
  const isSaved = !!details?.isSaved

  const favicon = site?.faviconUrl
  const ogImage = site?.ogImageUrl

  const originHost = useMemo(() => {
    try {
      return site ? new URL(site.canonicalUrl).hostname.replace('www.', '') : ''
    } catch {
      return site?.origin ?? ''
    }
  }, [site])

  const handleAdd = async () => {
    if (!ownerKey || !site) return
    try {
      setAdding(true)
      await addToBoard({ ownerKey, websiteSlug: site.slug, boardSlug })
    } finally {
      setAdding(false)
    }
  }

  if (!site) {
    return (
      <div className='waps-bg min-h-screen px-4 py-6 text-white md:px-6 md:py-10 lg:px-8'>
        <Skeleton className='h-12 w-full rounded-xl' />
      </div>
    )
  }

  return (
    <div className='waps-bg min-h-screen text-white'>
      {/* Content container */}
      <div className='mx-auto max-w-6xl px-4 pb-28 md:px-6 md:pb-10 lg:px-8'>
        {/* Hero card */}
        <div className='waps-card mt-4 overflow-hidden rounded-2xl md:mt-8'>
          {/* hero image (responsive) */}
          <div className='relative aspect-video w-full bg-white/5'>
            {ogImage ? (
              <Image
                src={ogImage}
                alt={site.title}
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 66vw'
              />
            ) : (
              <div className='grid h-full w-full place-items-center text-sm text-white/60'>
                No preview image
              </div>
            )}
          </div>

          {/* header block */}
          <div className='p-4 sm:p-5 md:p-6'>
            <div className='flex items-start gap-3 sm:gap-4'>
              <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/15 sm:h-12 sm:w-12'>
                {favicon ? (
                  <Image
                    src={favicon}
                    alt='favicon'
                    fill
                    sizes='60px'
                    className='object-contain'
                  />
                ) : (
                  <div className='grid h-full w-full place-items-center text-sm'>
                    {originHost[0]?.toUpperCase() || 'W'}
                  </div>
                )}
              </div>

              <div className='min-w-0 flex-1'>
                <h1 className='truncate text-lg font-semibold leading-tight sm:text-xl md:text-2xl'>
                  {site.title}
                </h1>
                <p className='truncate text-xs text-white/70 sm:text-sm'>
                  {originHost}
                </p>
              </div>
            </div>

            {site.description && (
              <p className='mt-3 text-sm leading-relaxed text-white/80 md:mt-4 md:text-[15px]'>
                {site.description}
              </p>
            )}

            {/* Chips & Stats */}
            <div className='mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 md:mt-4'>
              {site.categories?.map(c => (
                <span key={c} className='waps-chip'>
                  {c}
                </span>
              ))}
              <span className='waps-chip opacity-90'>
                Saves: {site.saveCount ?? 0}
              </span>
              {typeof site.publicSaveCount === 'number' && (
                <span className='waps-chip opacity-90'>
                  Public Saves: {site.publicSaveCount}
                </span>
              )}
            </div>

            {/* Actions (stack on mobile) */}
            <div className='mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap md:mt-5'>
              <Button
                asChild
                className='waps-btn h-10 w-full rounded-xl sm:w-auto'
              >
                <Link
                  href={site.canonicalUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Open <ExternalLink className='ml-1 h-4 w-4' />
                </Link>
              </Button>

              {/* Add to Waps (if not saved) */}
              {!isSaved && ownerKey && (
                <div className='flex w-full gap-2 sm:w-auto sm:items-center'>
                  <Button
                    onClick={handleAdd}
                    disabled={adding}
                    className='h-10 w-full rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15 sm:w-auto'
                  >
                    <Plus className='mr-1 h-4 w-4' />
                    {adding ? 'Adding…' : 'Add to Waps'}
                  </Button>
                </div>
              )}

              {/* Share / Copy link */}
              <button
                onClick={async () => {
                  const url = window.location.href
                  if (navigator.share) {
                    await navigator.share({ url, title: site.title })
                  } else {
                    await navigator.clipboard.writeText(url)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }
                }}
                className='inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10 sm:w-auto'
              >
                {copied ? (
                  <>
                    <Check className='h-4 w-4' /> Copied
                  </>
                ) : (
                  <>
                    <Share2 className='h-4 w-4' /> Share
                  </>
                )}
              </button>

              {/* Saved state */}
              {isSaved && (
                <div className='inline-flex h-10 w-full items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 px-3 text-white/90 sm:w-auto'>
                  <Check className='h-4 w-4' /> In your Waps
                </div>
              )}
            </div>

            {/* Notes (only when saved) */}
            {isSaved && (
              <div className='mt-4 rounded-xl border border-white/10 bg-white/5 p-3'>
                <div className='flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/50'>
                  <StickyNote className='h-3.5 w-3.5' />
                  Your notes
                </div>
                {editingNotes ? (
                  <div className='mt-2 space-y-2'>
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder='Add your personal notes about this website…'
                      rows={3}
                      className='border-white/10 bg-white/5 text-sm text-white placeholder:text-white/40 focus-visible:ring-white/20'
                    />
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        onClick={handleSaveNotes}
                        disabled={notesSaving}
                        className='waps-btn h-8 rounded-lg text-xs'
                      >
                        {notesSaving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => {
                          setNotes(details?.notes || '')
                          setEditingNotes(false)
                        }}
                        className='h-8 rounded-lg border-white/15 text-xs text-white hover:bg-white/10'
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className='bg-white/3 mt-2 w-full cursor-text rounded-lg border border-white/5 p-2.5 text-left text-sm text-white/60 hover:border-white/15'
                  >
                    {notes || 'Click to add notes…'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info panel + Similar websites */}
        <div className='mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-6 lg:grid-cols-3'>
          {/* About (full width on mobile) */}
          <div
            className={`waps-card rounded-2xl p-4 sm:p-5 ${similar?.length ? 'lg:col-span-1' : 'lg:col-span-3'}`}
          >
            <h2 className='mb-2 text-base font-semibold sm:text-lg'>About</h2>
            <div className='space-y-1.5 text-sm text-white/80'>
              <p>
                <span className='text-white/60'>URL:</span>{' '}
                <a
                  href={site.canonicalUrl}
                  target='_blank'
                  className='break-all underline'
                >
                  {site.canonicalUrl}
                </a>
              </p>
              <p>
                <span className='text-white/60'>Origin:</span> {site.origin}
              </p>
              <p>
                <span className='text-white/60'>Slug:</span> {site.slug}
              </p>
              <p>
                <span className='text-white/60'>Created:</span>{' '}
                {new Date(site.createdAt).toLocaleString()}
              </p>
              <p>
                <span className='text-white/60'>Updated:</span>{' '}
                {new Date(site.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
          {/* Similar websites */}
          {similar && similar.length > 0 && (
            <div className='lg:col-span-2'>
              <h2 className='mb-3 text-base font-semibold sm:text-lg'>
                Similar websites
              </h2>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
                {similar.map(s => (
                  <SimilarCard key={s._id} site={s} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SimilarCard({ site }: { site: any }) {
  const host = (() => {
    try {
      return new URL(site.canonicalUrl).hostname.replace('www.', '')
    } catch {
      return site.origin ?? ''
    }
  })()

  return (
    <div className='waps-card waps-hover overflow-hidden rounded-2xl'>
      <div className='relative aspect-[16/10] w-full bg-white/5'>
        {site.ogImageUrl ? (
          <Image
            src={site.ogImageUrl}
            alt={site.title}
            fill
            className='object-cover'
            sizes='(max-width: 768px) 100vw, 25vw'
          />
        ) : (
          <div className='grid h-full w-full place-items-center text-xs text-white/60'>
            No image
          </div>
        )}
      </div>
      <div className='p-4'>
        <div className='flex items-start gap-3'>
          <div className='relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/15'>
            {site.faviconUrl ? (
              <Image
                src={site.faviconUrl}
                alt='favicon'
                fill
                sizes='32px'
                className='object-contain p-1'
              />
            ) : (
              <div className='grid h-full w-full place-items-center text-[10px]'>
                {host[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className='min-w-0'>
            <Link
              href={`/explore/${site.slug}`}
              className='block truncate font-medium hover:underline'
            >
              {site.title}
            </Link>
            <p className='truncate text-xs text-white/60'>{host}</p>
          </div>
        </div>
        <div className='mt-3 flex flex-wrap gap-1.5'>
          {(site.categories ?? []).slice(0, 2).map((c: string) => (
            <span key={c} className='waps-chip'>
              {c}
            </span>
          ))}
          <span className='waps-chip opacity-80'>
            Saves: {site.saveCount ?? 0}
          </span>
        </div>
      </div>
    </div>
  )
}
