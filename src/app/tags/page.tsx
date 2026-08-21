'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { useSession } from '@/lib/use-session'
import { useQuery } from 'convex/react'
import Link from 'next/link'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'

export default function TagsPage() {
  const { sessionToken, loading: sessionLoading } = useSession()
  const tags = useQuery(
    api.bookmarks.listAllTags,
    sessionToken ? { sessionToken } : 'skip'
  )
  const [search, setSearch] = useState('')

  if (sessionLoading || !tags) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='text-sm text-text-secondary'>Loading...</div>
      </div>
    )
  }

  const filtered = search
    ? tags.filter((t: any) =>
        t.tag.toLowerCase().includes(search.toLowerCase())
      )
    : tags

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <Link
        href='/bookmarks'
        className='mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary'
      >
        <BackIcon size={14} />
        Back
      </Link>

      <h1 className='mb-4 text-heading font-bold text-text-primary'>Tags</h1>

      <input
        type='text'
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder='Search tags...'
        className='waps-input mb-4 w-full'
      />

      {filtered.length === 0 ? (
        <div className='py-16 text-center text-text-secondary'>
          No tags found
        </div>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {filtered.map(({ tag, count }: any) => (
            <Link
              key={tag}
              href={`/bookmarks?tag=${encodeURIComponent(tag)}`}
              className='waps-chip hover:bg-primary hover:text-white'
            >
              {tag} ({count})
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
