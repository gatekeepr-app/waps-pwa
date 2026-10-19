'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { toast } from '@/hooks/use-toast'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'

export default function DuplicatesPage() {
  const { sessionToken, loading } = useSession()
  const groups = useQuery(
    api.bookmarks.findDuplicateGroups,
    sessionToken ? { sessionToken } : 'skip'
  )
  const mergeDuplicates = useMutation(api.bookmarks.mergeDuplicates)
  const [busy, setBusy] = useState<string | null>(null)

  async function merge(group: any) {
    setBusy(group.keeper._id)
    try {
      const result = await mergeDuplicates({
        sessionToken: sessionToken ?? undefined,
        keepId: group.keeper._id,
        mergeIds: group.duplicates.map((d: any) => d._id)
      })
      toast.success(`Merged ${result.merged} duplicate(s)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Merge failed')
    } finally {
      setBusy(null)
    }
  }

  if (loading || !groups) {
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
      <h1 className='mb-1 text-heading font-bold text-text-primary'>
        Duplicates
      </h1>
      <p className='mb-4 text-sm text-text-secondary'>
        Same URL saved more than once. Merging keeps the oldest wap and moves
        the rest to trash with their tags and description copied over.
      </p>

      {groups.length === 0 ? (
        <div className='waps-empty text-text-secondary'>
          No duplicates found.
        </div>
      ) : (
        <div className='space-y-3'>
          {groups.map((group: any) => (
            <div key={group.keeper._id} className='waps-card p-3'>
              <Link
                href={`/wap/${group.keeper._id}`}
                className='block truncate text-sm font-bold text-text-primary'
              >
                {group.keeper.title || group.keeper.url}
              </Link>
              <div className='truncate text-xs text-text-secondary'>
                {group.keeper.url}
              </div>
              <ul className='mt-2 space-y-1 text-xs text-text-secondary'>
                {group.duplicates.map((dup: any) => (
                  <li key={dup._id} className='truncate'>
                    + {dup.title || dup.url}
                  </li>
                ))}
              </ul>
              <button
                type='button'
                className='waps-btn mt-3 w-full'
                disabled={busy === group.keeper._id}
                onClick={() => merge(group)}
              >
                {busy === group.keeper._id
                  ? 'Merging...'
                  : `Merge ${group.duplicates.length} into keeper`}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
