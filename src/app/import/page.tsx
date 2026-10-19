'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { toast } from '@/hooks/use-toast'
import { parseBookmarkFile } from '@/lib/import-parsers'
import { useSession } from '@/lib/use-session'
import { useMutation } from 'convex/react'
import Link from 'next/link'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'

export default function ImportPage() {
  const { sessionToken, loading } = useSession()
  const importAll = useMutation(api.bookmarks.importAll)
  const [busy, setBusy] = useState(false)

  async function handleFile(file?: File) {
    if (!file || !sessionToken) return
    setBusy(true)
    try {
      const bookmarks = parseBookmarkFile(file.name, await file.text())
      if (bookmarks.length === 0) {
        toast.error('No bookmarks found in that file')
        return
      }
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
        Upload an export from Chrome, Edge, Firefox, Safari, Pocket, Raindrop,
        or Notion (HTML, CSV, or JSON).
      </p>
      <label className='waps-card block cursor-pointer p-6 text-center text-sm text-text-secondary'>
        <input
          type='file'
          accept='.html,.htm,.csv,.json,text/html,text/csv,application/json'
          disabled={loading || busy}
          onChange={e => handleFile(e.target.files?.[0])}
          className='sr-only'
        />
        {busy ? 'Importing...' : 'Choose export file'}
      </label>
    </div>
  )
}
