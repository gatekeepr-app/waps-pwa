'use client'

import { GridIcon, ListIcon, SearchIcon } from '@/components/GeometricIcons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { api } from '../../../../convex/_generated/api'

export default function BookmarksPage() {
  const { sessionToken, loading: sessionLoading } = useSession()

  const bookmarks = useQuery(
    api.bookmarks.list,
    sessionToken ? { sessionToken } : 'skip'
  )
  const categories = useQuery(
    api.categories.list,
    sessionToken ? { sessionToken } : 'skip'
  )
  const togglePin = useMutation(api.bookmarks.togglePin)
  const toggleRead = useMutation(api.bookmarks.toggleRead)
  const remove = useMutation(api.bookmarks.remove)

  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const categoryCounts = useMemo(() => {
    if (!bookmarks) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const b of bookmarks) {
      const catId = (b as any).categoryId
      if (catId) map.set(catId, (map.get(catId) || 0) + 1)
    }
    return map
  }, [bookmarks])

  const items = useMemo(() => {
    if (!bookmarks) return []
    let result = bookmarks
    if (filterCategory) {
      result = result.filter(b => (b as any).categoryId === filterCategory)
    }
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(
        b =>
          (b.title ?? '').toLowerCase().includes(s) ||
          b.url.toLowerCase().includes(s) ||
          (b.description ?? '').toLowerCase().includes(s)
      )
    }
    return result.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
  }, [bookmarks, search, filterCategory])

  if (sessionLoading || !bookmarks || !categories) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='text-sm text-text-secondary'>Loading...</div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <div className='mb-4 flex items-center gap-3'>
        <h1 className='text-heading font-bold text-text-primary'>My Waps</h1>
        <span className='text-sm text-text-secondary'>({items.length})</span>
      </div>

      <div className='mb-3 flex gap-2'>
        <div className='relative flex-1'>
          <SearchIcon
            size={14}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary'
          />
          <input
            type='text'
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search...'
            className='waps-input w-full pl-9'
          />
        </div>
        <button
          onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          className='waps-btn-outline px-3'
          aria-label='Toggle view'
        >
          {view === 'grid' ? <ListIcon size={16} /> : <GridIcon size={16} />}
        </button>
      </div>

      {categories.length > 0 && (
        <div className='mb-4'>
          <Select
            value={filterCategory ?? 'all'}
            onValueChange={v => setFilterCategory(v === 'all' ? null : v)}
          >
            <SelectTrigger aria-label='Filter by category'>
              <SelectValue placeholder='All Categories' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name}
                  {categoryCounts.has(cat._id)
                    ? ` (${categoryCounts.get(cat._id)})`
                    : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {items.length === 0 ? (
        <div className='py-16 text-center'>
          <div className='mb-2 text-text-secondary'>No waps yet</div>
          <Link href='/add' className='waps-btn inline-block'>
            Add your first wap
          </Link>
        </div>
      ) : view === 'grid' ? (
        <div className='grid grid-cols-2 gap-3'>
          {items.map(b => (
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
                        ;(e.target as HTMLImageElement).style.visibility =
                          'hidden'
                      }}
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
                {(b as any).categoryName && (
                  <div className='mt-2'>
                    <span className='text-tag font-bold uppercase text-primary'>
                      {(b as any).categoryName}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className='space-y-2'>
          {items.map(b => (
            <Link
              key={b._id}
              href={`/wap/${b._id}`}
              className='waps-card flex gap-3 p-3'
            >
              {b.favicon && (
                <img
                  src={b.favicon}
                  alt=''
                  className='h-8 w-8 flex-shrink-0'
                  loading='lazy'
                  onError={e => {
                    ;(e.target as HTMLImageElement).style.visibility = 'hidden'
                  }}
                />
              )}
              <div className='min-w-0 flex-1'>
                <div className='truncate text-sm font-bold text-text-primary'>
                  {b.title || new URL(b.url).hostname}
                </div>
                <div className='truncate text-xs text-text-secondary'>
                  {b.url}
                </div>
                {(b as any).categoryName && (
                  <div className='mt-1'>
                    <span className='text-tag font-bold uppercase text-primary'>
                      {(b as any).categoryName}
                    </span>
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
