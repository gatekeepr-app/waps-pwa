'use client'

import { useQuery } from 'convex/react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '../../../../convex/_generated/api'

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const profile = useQuery(api.bookmarks.listPublicByUser, {
    userId: userId as any
  })

  if (profile === undefined) {
    return <div className='p-6 text-sm text-text-secondary'>Loading...</div>
  }
  if (!profile) {
    return (
      <div className='p-6 text-sm text-text-secondary'>Profile not found.</div>
    )
  }

  const name =
    profile.user.name || profile.user.email?.split('@')[0] || 'Waps user'

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <h1 className='mb-1 text-heading font-bold text-text-primary'>@{name}</h1>
      <p className='mb-6 text-sm text-text-secondary'>
        {profile.bookmarks.length} public waps
      </p>
      {profile.bookmarks.length === 0 ? (
        <div className='waps-empty text-text-secondary'>
          No public waps yet.
        </div>
      ) : (
        <div className='space-y-2'>
          {profile.bookmarks.map((wap: any) => (
            <Link
              key={wap._id}
              href={wap.publicId ? `/share/${wap.publicId}` : wap.url}
              className='waps-card flex gap-3 p-3'
            >
              {wap.favicon && (
                <Image
                  src={wap.favicon}
                  alt=''
                  width={24}
                  height={24}
                  className='h-6 w-6'
                />
              )}
              <div className='min-w-0'>
                <div className='truncate text-sm font-bold text-text-primary'>
                  {wap.title || wap.url}
                </div>
                {wap.description && (
                  <div className='line-clamp-2 text-xs text-text-secondary'>
                    {wap.description}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
