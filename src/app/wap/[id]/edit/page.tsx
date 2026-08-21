'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

export default function EditWapPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const bookmark = useQuery(api.bookmarks.getById, {
    id: id as Id<'bookmarks'>
  })
  const update = useMutation(api.bookmarks.update)

  const { sessionToken } = useSession()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const categories = useQuery(
    api.categories.list,
    sessionToken ? { sessionToken } : 'skip'
  )

  useEffect(() => {
    if (bookmark) {
      setTitle((bookmark as any).title ?? '')
      setDescription((bookmark as any).description ?? '')
      setCategoryId((bookmark as any).categoryId ?? '')
    }
  }, [bookmark])

  if (!bookmark) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='text-sm text-text-secondary'>Loading...</div>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await update({
        id: id as Id<'bookmarks'>,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        categoryId: (categoryId as any) || undefined
      })
      router.push(`/wap/${id}`)
    } catch {
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='mx-auto max-w-lg px-4 pt-4'>
      <Link
        href={`/wap/${id}`}
        className='mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary'
      >
        <BackIcon size={14} />
        Back
      </Link>

      <div className='waps-card p-6'>
        <h1 className='mb-4 text-heading font-bold text-text-primary'>
          Edit Wap
        </h1>

        <form onSubmit={onSubmit} className='space-y-4'>
          <div>
            <label className='waps-label mb-1 block'>Title</label>
            <input
              type='text'
              value={title}
              onChange={e => setTitle(e.target.value)}
              className='waps-input w-full'
            />
          </div>

          <div>
            <label className='waps-label mb-1 block'>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className='waps-input w-full resize-none'
            />
          </div>

          {categories && categories.length > 0 && (
            <div>
              <label className='waps-label mb-1 block'>Category</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className='waps-input w-full'
              >
                <option value=''>No category</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type='submit'
            disabled={busy}
            className='waps-btn flex w-full items-center justify-center'
          >
            {busy ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
