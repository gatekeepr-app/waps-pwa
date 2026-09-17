'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { useSession } from '@/lib/use-session'
import { useMutation } from 'convex/react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'

export default function ImportPage() {
  const { sessionToken, loading } = useSession()
  const importAll = useMutation(api.bookmarks.importAll)
  const [busy, setBusy] = useState(false)

  async function handleFile(file?: File) {
    if (!file || !sessionToken) return
    setBusy(true)
    try {
      const html = await file.text()
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const bookmarks = Array.from(doc.querySelectorAll('a[href]')).map(a => ({
        url: (a as HTMLAnchorElement).href,
        title: a.textContent?.trim() || undefined
      }))
      const result = await importAll({ sessionToken, bookmarks })
      toast.success(
        `Imported ${result.added}. ${result.duplicates} duplicates skipped.`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setBusy(false)
    }
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
      <h1 className='mb-2 text-heading font-bold text-text-primary'>
        Import bookmarks
      </h1>
      <p className='mb-4 text-sm text-text-secondary'>
        Upload a browser bookmarks HTML export.
      </p>
      <label className='waps-card block cursor-pointer p-6 text-center text-sm text-text-secondary'>
        <input
          type='file'
          accept='.html,text/html'
          disabled={loading || busy}
          onChange={e => handleFile(e.target.files?.[0])}
          className='sr-only'
        />
        {busy ? 'Importing...' : 'Choose HTML file'}
      </label>
    </div>
  )
}
