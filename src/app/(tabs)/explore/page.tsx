'use client'

import { useQuery } from 'convex/react'
import Link from 'next/link'
import { api } from '../../../../convex/_generated/api'

export default function ExplorePage() {
  const items = useQuery(api.bookmarks.listPublic, {})

  if (!items) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='text-sm text-text-secondary'>Loading...</div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <h1 className='mb-4 text-heading font-bold text-text-primary'>Explore</h1>

      {items.length === 0 ? (
        <div className='py-16 text-center text-text-secondary'>
          No public waps yet. Share yours to get started!
        </div>
      ) : (
        <div className='grid grid-cols-2 gap-3'>
          {items.map((b: any) => (
            <Link
              key={b._id}
              href={`/wap/${b._id}`}
              className='waps-card overflow-hidden'
            >
              {b.image && (
                <img
                  src={b.image}
                  alt=''
                  className='h-28 w-full object-cover'
                  loading='lazy'
                />
              )}
              <div className='p-3'>
                <div className='mb-1 flex items-center gap-2'>
                  {b.favicon && (
                    <img
                      src={b.favicon}
                      alt=''
                      className='h-4 w-4'
                      loading='lazy'
                    />
                  )}
                  <div className='truncate text-xs font-bold text-text-primary'>
                    {b.title || new URL(b.url).hostname}
                  </div>
                </div>
                {b.description && (
                  <div className='line-clamp-2 text-xs text-text-secondary'>
                    {b.description}
                  </div>
                )}
                {b.tags && b.tags.length > 0 && (
                  <div className='mt-2 flex flex-wrap gap-1'>
                    {b.tags.slice(0, 3).map((t: string) => (
                      <span
                        key={t}
                        className='text-tag font-bold uppercase text-primary'
                      >
                        {t}
                      </span>
                    ))}
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
