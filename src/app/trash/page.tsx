'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'

export default function TrashPage() {
  const { sessionToken, loading: sessionLoading } = useSession()
  const trash = useQuery(
    api.bookmarks.listTrash,
    sessionToken ? { sessionToken } : 'skip'
  )
  const restore = useMutation(api.bookmarks.restore)
  const permanentDelete = useMutation(api.bookmarks.permanentDelete)
  const emptyTrash = useMutation(api.bookmarks.emptyTrash)

  async function restoreOne(id: string) {
    await restore({ id: id as any, sessionToken: sessionToken ?? undefined })
    toast.success('Wap restored')
  }

  async function deleteOne(id: string) {
    await permanentDelete({
      id: id as any,
      sessionToken: sessionToken ?? undefined
    })
    toast.success('Deleted forever')
  }

  async function emptyAll() {
    await emptyTrash({ sessionToken: sessionToken ?? undefined })
    toast.success('Trash emptied')
  }

  if (sessionLoading || !trash) {
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
        <h1 className='text-heading font-bold text-text-primary'>Trash</h1>
        {trash.length > 0 && (
          <button
            type='button'
            className='text-sm text-destructive underline'
            onClick={emptyAll}
          >
            Empty
          </button>
        )}
      </div>
      {trash.length === 0 ? (
        <div className='waps-empty text-text-secondary'>Trash is empty.</div>
      ) : (
        <div className='space-y-2'>
          {trash.map((wap: any) => (
            <div key={wap._id} className='waps-card p-3'>
              <div className='truncate text-sm font-bold text-text-primary'>
                {wap.title || wap.url}
              </div>
              <div className='truncate text-xs text-text-secondary'>
                {wap.url}
              </div>
              <div className='mt-3 flex gap-2'>
                <button
                  type='button'
                  className='waps-btn flex-1'
                  onClick={() => restoreOne(wap._id)}
                >
                  Restore
                </button>
                <button
                  type='button'
                  className='waps-btn-outline flex-1 text-destructive'
                  onClick={() => deleteOne(wap._id)}
                >
                  Delete forever
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
