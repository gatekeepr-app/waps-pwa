'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { toast } from '@/hooks/use-toast'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { api } from '../../../convex/_generated/api'

export default function BrokenLinksPage() {
  const { sessionToken, loading } = useSession()
  const broken = useQuery(
    api.bookmarks.listBroken,
    sessionToken ? { sessionToken } : 'skip'
  )
  const recheckLink = useMutation(api.bookmarks.recheckLink)
  const remove = useMutation(api.bookmarks.remove)

  async function recheckOne(id: string) {
    await recheckLink({
      id: id as any,
      sessionToken: sessionToken ?? undefined
    })
  }

  async function recheckAll() {
    if (!broken) return
    for (const wap of broken) await recheckOne(wap._id)
    toast.success('Re-checking links')
  }

  async function trashOne(id: string) {
    await remove({ id: id as any, sessionToken: sessionToken ?? undefined })
    toast.success('Moved to trash')
  }

  if (loading || !broken) {
    return <div className='p-6 text-sm text-text-secondary'>Loading...</div>
  }

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <Link
        href='/profile'
        className='mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary'
      >
        <BackIcon size={14} />
        Back
      </Link>
      <div className='mb-4 flex items-center justify-between'>
        <h1 className='text-heading font-bold text-text-primary'>
          Broken links
        </h1>
        {broken.length > 0 && (
          <button
            type='button'
            className='text-sm text-primary underline'
            onClick={recheckAll}
          >
            Re-check all
          </button>
        )}
      </div>
      {broken.length === 0 ? (
        <div className='waps-empty text-text-secondary'>
          No broken links right now.
        </div>
      ) : (
        <div className='space-y-2'>
          {broken.map((wap: any) => (
            <div key={wap._id} className='waps-card p-3'>
              <Link
                href={`/wap/${wap._id}`}
                className='block truncate text-sm font-bold text-text-primary'
              >
                {wap.title || wap.url}
              </Link>
              <div className='truncate text-xs text-text-secondary'>
                {wap.url}
              </div>
              <div className='mt-3 flex gap-2'>
                <button
                  type='button'
                  className='waps-btn-outline flex-1'
                  onClick={() => recheckOne(wap._id)}
                >
                  Check again
                </button>
                <button
                  type='button'
                  className='waps-btn-outline flex-1 text-destructive'
                  onClick={() => trashOne(wap._id)}
                >
                  Trash
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
