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
import { Globe } from 'lucide-react'
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
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='text-sm text-text-secondary'>Loading...</div>
      </div>
    )
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

      <div className='mb-4 flex flex-wrap gap-2'>
        <a
          href={b.url}
          target='_blank'
          rel='noopener noreferrer'
          className='waps-btn-outline flex items-center gap-2'
        >
          <ExternalLinkIcon size={14} />
          Open
        </a>
        <Link
          href={`/wap/${b._id}/edit`}
          className='waps-btn-outline flex items-center gap-2'
        >
          <EditIcon size={14} />
          Edit
        </Link>
        <button
          onClick={handleShare}
          className='waps-btn-outline flex items-center gap-2'
        >
          <ShareIcon size={14} />
          {copied ? 'Copied!' : 'Share'}
        </button>
        <button
          onClick={handleTogglePublic}
          className={`waps-btn-outline flex items-center gap-2 ${
            b.isPublic ? 'border-primary text-primary' : ''
          }`}
        >
          <Globe size={14} />
          {b.isPublic ? 'Public' : 'Make public'}
        </button>
        <button
          onClick={handleDelete}
          className='waps-btn-outline flex items-center gap-2 text-destructive'
        >
          <DeleteIcon size={14} />
          Trash
        </button>
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
        <div className='waps-card p-4'>
          <div className='waps-label mb-2'>Extracted text</div>
          <div className='max-h-48 overflow-y-auto text-xs leading-relaxed text-text-secondary'>
            {b.textContent.slice(0, 2000)}
          </div>
        </div>
      )}
    </div>
  )
}
