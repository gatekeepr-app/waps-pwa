'use client'

import { BackIcon, ExternalLinkIcon } from '@/components/GeometricIcons'
import { useSession } from '@/lib/use-session'
import { useQuery } from 'convex/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

export default function ReaderPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { sessionToken, loading: sessionLoading } = useSession()
  const bookmark = useQuery(
    api.bookmarks.getById,
    sessionToken ? { id: id as Id<'bookmarks'>, sessionToken } : 'skip'
  )

  if (sessionLoading || !bookmark) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='text-sm text-text-secondary'>Loading...</div>
      </div>
    )
  }

  const b = bookmark as any

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <Link
        href={`/wap/${id}`}
        className='mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary'
      >
        <BackIcon size={14} />
        Back
      </Link>

      <div className='mb-4 flex items-center gap-2'>
        {b.favicon && <img src={b.favicon} alt='' className='h-5 w-5' />}
        <h1 className='text-heading font-bold text-text-primary'>
          {b.title || new URL(b.url).hostname}
        </h1>
      </div>

      <a
        href={b.url}
        target='_blank'
        rel='noopener noreferrer'
        className='mb-4 inline-flex items-center gap-1 text-xs text-primary hover:underline'
      >
        <ExternalLinkIcon size={12} />
        {new URL(b.url).hostname}
      </a>

      {b.image && (
        <img
          src={b.image}
          alt=''
          className='mb-4 h-48 w-full rounded-lg object-cover'
        />
      )}

      {b.description && (
        <p className='mb-4 text-sm leading-relaxed text-text-secondary'>
          {b.description}
        </p>
      )}

      {b.textContent && (
        <div className='waps-card p-4'>
          <div className='whitespace-pre-wrap text-sm leading-relaxed text-text-primary'>
            {b.textContent}
          </div>
        </div>
      )}
    </div>
  )
}
