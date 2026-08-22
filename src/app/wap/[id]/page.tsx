'use client'

import {
  BackIcon,
  DeleteIcon,
  EditIcon,
  ExternalLinkIcon,
  LinkIcon,
  ShareIcon
} from '@/components/GeometricIcons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import { Check, Globe, Heart } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

export default function WapDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { sessionToken, loading: sessionLoading } = useSession()
  const bookmark = useQuery(
    api.bookmarks.getById,
    sessionToken
      ? { id: id as Id<'bookmarks'>, sessionToken: sessionToken ?? undefined }
      : 'skip'
  )
  const togglePublic = useMutation(api.bookmarks.togglePublic)
  const remove = useMutation(api.bookmarks.remove)
  const generateShareLink = useMutation(api.bookmarks.generateShareLink)
  const addTag = useMutation(api.bookmarks.addTag)
  const removeTag = useMutation(api.bookmarks.removeTag)

  const [newTag, setNewTag] = useState('')
  const [shareId, setShareId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (sessionLoading || !bookmark) {
    return <DetailSkeleton />
  }

  const b = bookmark as any

  async function handleShare() {
    try {
      const id = await generateShareLink({
        id: b._id,
        sessionToken: sessionToken ?? undefined
      })
      setShareId(id)
      await navigator.clipboard.writeText(
        `${window.location.origin}/share/${id}`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  async function handleDelete() {
    if (!confirm('Move to trash?')) return
    await remove({ id: b._id, sessionToken: sessionToken ?? undefined })
    router.push('/bookmarks')
  }

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault()
    const tag = newTag.trim().toLowerCase()
    if (!tag) return
    await addTag({ id: b._id, tag, sessionToken: sessionToken ?? undefined })
    setNewTag('')
  }

  async function handleTogglePublic() {
    await togglePublic({
      id: b._id,
      sessionToken: sessionToken ?? undefined
    })
    // Mint a publicId when going public so Explore can deep-link to the
    // share page instead of the raw URL.
    if (!b.isPublic && !b.publicId) {
      await generateShareLink({
        id: b._id,
        sessionToken: sessionToken ?? undefined
      })
    }
  }

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <Link
        href='/bookmarks'
        className='mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary'
      >
        <BackIcon size={14} />
        Back
      </Link>

      {b.image && (
        <img
          src={b.image}
          alt=''
          className='mb-4 h-48 w-full rounded-lg object-cover'
          onError={e => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      )}

      <div className='mb-4 flex items-start gap-3'>
        {b.favicon && (
          <img
            src={b.favicon}
            alt=''
            className='mt-1 h-6 w-6'
            onError={e => {
              ;(e.target as HTMLImageElement).style.visibility = 'hidden'
            }}
          />
        )}
        <div className='min-w-0 flex-1'>
          <h1 className='text-heading font-bold text-text-primary'>
            {b.title || new URL(b.url).hostname}
          </h1>
          <a
            href={b.url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-xs text-text-secondary hover:text-primary'
          >
            {new URL(b.url).hostname}
          </a>
        </div>
      </div>

      {b.description && (
        <p className='mb-4 text-sm text-text-secondary'>{b.description}</p>
      )}

      <div className='waps-card mb-4 flex items-start justify-between px-3 py-4 sm:px-7'>
        <DetailAction
          href={b.url}
          external
          icon={<ExternalLinkIcon size={16} />}
          label='Open'
        />
        <DetailAction
          href={`/wap/${b._id}/edit`}
          icon={<EditIcon size={16} />}
          label='Edit'
        />
        <DetailAction
          onClick={handleShare}
          icon={copied ? <Check size={16} /> : <ShareIcon size={16} />}
          label={copied ? 'Copied' : 'Share'}
          tone={copied ? 'success' : 'default'}
        />
        <DetailAction
          onClick={handleTogglePublic}
          icon={<Globe size={16} />}
          label={b.isPublic ? 'Public' : 'Publish'}
          tone={b.isPublic ? 'active' : 'default'}
        />
        <DetailAction
          onClick={handleDelete}
          icon={<DeleteIcon size={16} />}
          label='Trash'
          tone='danger'
        />
      </div>

      {b.isPublic && (
        <Alert className='mb-4' variant='default'>
          <Globe size={14} />
          <AlertDescription>
            This wap is visible to everyone on the Explore page.
          </AlertDescription>
        </Alert>
      )}

      {shareId && (
        <div className='waps-card mb-4 p-3'>
          <div className='text-xs text-text-secondary'>Share link:</div>
          <div className='mt-1 truncate text-xs text-primary'>
            {`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareId}`}
          </div>
        </div>
      )}

      <div className='mb-4'>
        <div className='waps-label mb-2'>Tags</div>
        <div className='flex flex-wrap gap-2'>
          {b.tags?.map((t: string) => (
            <span key={t} className='waps-chip flex items-center gap-1'>
              {t}
              <button
                onClick={() =>
                  removeTag({
                    id: b._id,
                    tag: t,
                    sessionToken: sessionToken ?? undefined
                  })
                }
                className='text-text-secondary hover:text-destructive'
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={handleAddTag} className='mt-2 flex gap-2'>
          <input
            type='text'
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder='Add tag...'
            className='waps-input flex-1'
          />
          <button type='submit' className='waps-btn px-3'>
            <LinkIcon size={14} />
          </button>
        </form>
      </div>

      {b.textContent && (
        <div className='waps-card mb-4 p-4'>
          <div className='waps-label mb-2'>Extracted text</div>
          <div className='max-h-48 overflow-y-auto text-xs leading-relaxed text-text-secondary'>
            {b.textContent.slice(0, 2000)}
          </div>
        </div>
      )}

      <Recommendations b={b} sessionToken={sessionToken} />
    </div>
  )
}

const ACTION_TONES: Record<string, string> = {
  default: 'text-text-secondary',
  active: 'text-primary',
  danger: 'text-destructive',
  success: 'text-emerald-400'
}

interface DetailActionProps {
  icon: React.ReactNode
  label: string
  href?: string
  external?: boolean
  onClick?: () => void
  tone?: 'default' | 'active' | 'danger' | 'success'
}

function DetailAction({
  icon,
  label,
  href,
  external,
  onClick,
  tone = 'default'
}: DetailActionProps) {
  const inner = (
    <>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
          tone === 'active'
            ? 'border-primary/60 bg-primary/10'
            : 'border-border group-hover:border-current'
        }`}
      >
        {icon}
      </span>
      <span className='text-tag font-bold uppercase tracking-wider'>
        {label}
      </span>
    </>
  )
  const cls = `group flex w-16 flex-col items-center gap-1.5 py-1 transition-colors ${ACTION_TONES[tone]}`

  if (href && external)
    return (
      <a href={href} target='_blank' rel='noopener noreferrer' className={cls}>
        {inner}
      </a>
    )
  if (href)
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    )
  return (
    <button type='button' onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

function DetailSkeleton() {
  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <div className='mb-4 h-4 w-16 animate-pulse rounded bg-surface' />
      <div className='mb-4 h-48 animate-pulse rounded-lg bg-surface' />
      <div className='mb-4 flex items-start gap-3'>
        <div className='mt-1 h-6 w-6 animate-pulse rounded-full bg-surface' />
        <div className='flex-1 space-y-2'>
          <div className='h-5 w-3/4 animate-pulse rounded bg-surface' />
          <div className='h-3 w-32 animate-pulse rounded bg-surface' />
        </div>
      </div>
      <div className='waps-card mb-4 flex items-start justify-between px-3 py-4 sm:px-7'>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className='flex w-16 flex-col items-center gap-1.5'>
            <div className='h-10 w-10 animate-pulse rounded-full bg-surface' />
            <div className='h-2.5 w-12 animate-pulse rounded bg-surface' />
          </div>
        ))}
      </div>
      <div className='waps-card p-4'>
        <div className='mb-3 h-3 w-10 animate-pulse rounded bg-surface' />
        <div className='flex gap-2'>
          <div className='h-8 w-20 animate-pulse rounded-full bg-surface' />
          <div className='h-8 w-16 animate-pulse rounded-full bg-surface' />
          <div className='h-8 w-24 animate-pulse rounded-full bg-surface' />
        </div>
      </div>
    </div>
  )
}

function Recommendations({
  b,
  sessionToken
}: {
  b: any
  sessionToken: string | null
}) {
  const similar = useQuery(
    api.bookmarks.similarTo,
    sessionToken ? { id: b._id, sessionToken } : 'skip'
  )
  const related = useQuery(
    api.bookmarks.relatedWaps,
    b.url ? { url: b.url, sessionToken: sessionToken ?? undefined } : 'skip'
  )

  if (
    (similar === undefined || similar.length === 0) &&
    (related === undefined || related.length === 0)
  ) {
    return null
  }

  return (
    <div className='waps-card p-4'>
      <div className='waps-label mb-3'>You might also like</div>

      {similar !== undefined && similar.length > 0 && (
        <>
          <div className='mb-2 text-tag font-bold uppercase tracking-wider text-text-secondary'>
            In your library
          </div>
          <ul className='mb-4 space-y-1.5'>
            {similar.map((s: any) => (
              <li key={s._id}>
                <Link
                  href={`/wap/${s._id}`}
                  className='flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface'
                >
                  {s.favicon && (
                    <img
                      src={s.favicon}
                      alt=''
                      className='h-4 w-4 flex-shrink-0'
                      onError={e => {
                        ;(e.target as HTMLImageElement).style.visibility =
                          'hidden'
                      }}
                    />
                  )}
                  <span className='min-w-0 flex-1 truncate text-sm text-text-primary'>
                    {s.title || s.url}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {related !== undefined && related.length > 0 && (
        <>
          <div className='mb-2 text-tag font-bold uppercase tracking-wider text-text-secondary'>
            Loved by the community
          </div>
          <ul className='space-y-1.5'>
            {related.map((r: any) => (
              <li key={`rel-${r._id}`}>
                <Link
                  href={r.publicId ? `/share/${r.publicId}` : r.url}
                  className='flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface'
                >
                  {r.favicon && (
                    <img
                      src={r.favicon}
                      alt=''
                      className='h-4 w-4 flex-shrink-0'
                      onError={e => {
                        ;(e.target as HTMLImageElement).style.visibility =
                          'hidden'
                      }}
                    />
                  )}
                  <span className='min-w-0 flex-1 truncate text-sm text-text-primary'>
                    {r.title || r.url}
                  </span>
                  <Heart size={11} className='flex-shrink-0 text-primary' />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
