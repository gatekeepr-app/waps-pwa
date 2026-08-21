'use client'

import { useQuery } from 'convex/react'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'

type Sort = 'trending' | 'new'

function WapCard({ b }: { b: any }) {
  let host = ''
  try {
    host = new URL(b.url).hostname.replace(/^www\./, '')
  } catch {}
  return (
    <Link
      href={b.publicId ? `/share/${b.publicId}` : b.url}
      className='waps-card overflow-hidden transition-transform active:scale-[0.98]'
    >
      {b.image && (
        <img
          src={b.image}
          alt=''
          className='h-28 w-full object-cover'
          loading='lazy'
          onError={e => {
            ;(e.target as HTMLImageElement).style.visibility = 'hidden'
          }}
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
              onError={e => {
                ;(e.target as HTMLImageElement).style.visibility = 'hidden'
              }}
            />
          )}
          <div className='truncate text-xs font-bold text-text-primary'>
            {b.title || host}
          </div>
        </div>
        {b.description && (
          <div className='line-clamp-2 text-xs text-text-secondary'>
            {b.description}
          </div>
        )}
        <div className='mt-2 flex items-center justify-between gap-2'>
          <span className='truncate text-tag uppercase tracking-wider text-text-secondary'>
            {host}
          </span>
          {b.savers > 1 && (
            <span className='flex flex-shrink-0 items-center gap-1 text-tag font-bold tabular-nums text-primary'>
              <Heart size={10} fill='currentColor' />
              {b.savers}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function ExplorePage() {
  const [sort, setSort] = useState<Sort>('trending')
  const items = useQuery(api.bookmarks.exploreFeed, { sort })

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <h1 className='text-heading font-bold text-text-primary'>Explore</h1>
        <div className='flex rounded-md bg-surface p-1'>
          {(['trending', 'new'] as Sort[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              aria-pressed={sort === s}
              className={`rounded-sm px-3 py-1.5 text-tab font-bold uppercase tracking-[0.15em] transition-colors ${
                sort === s
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {s === 'trending' ? 'Trending' : 'New'}
            </button>
          ))}
        </div>
      </div>

      {!items ? (
        <div className='grid grid-cols-2 gap-3'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='waps-card overflow-hidden'>
              <div className='h-28 animate-pulse bg-surface' />
              <div className='space-y-2 p-3'>
                <div className='h-3 w-3/4 animate-pulse rounded bg-surface' />
                <div className='h-3 w-1/2 animate-pulse rounded bg-surface' />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className='py-16 text-center text-text-secondary'>
          No public waps yet. Share yours to get started!
        </div>
      ) : (
        <div className='grid grid-cols-2 gap-3'>
          {items.map((b: any) => (
            <WapCard key={b._id} b={b} />
          ))}
        </div>
      )}
    </div>
  )
}
