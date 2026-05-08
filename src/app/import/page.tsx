'use client'

import { Button } from '@/components/ui/button'
import { useMutation } from 'convex/react'
import {
  Bookmark,
  CheckCircle2,
  FileText,
  Import,
  Loader2,
  Upload
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'

function useOwnerKey() {
  const [ownerKey, setOwnerKey] = useState<string | null>(null)
  useEffect(() => {
    try {
      const k =
        localStorage.getItem('waps.ownerKey') ||
        localStorage.getItem('wapsOwnerKey')
      if (k) setOwnerKey(k)
    } catch {}
  }, [])
  return ownerKey
}

function parseBookmarkHTML(html: string): { url: string; title: string }[] {
  const results: { url: string; title: string }[] = []
  const linkRegex = /<A[^>]*HREF=["']([^"']+)["'][^>]*>([\s\S]*?)<\/A>/gi
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, '').trim()
    if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
      results.push({ url, title: title || url })
    }
  }
  return results
}

export default function ImportPage() {
  const ownerKey = useOwnerKey()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bulkImport = useMutation(api.waps.bulkImport)

  const [parsed, setParsed] = useState<{ url: string; title: string }[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    added: number
    skipped: number
  } | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setParsed([])

    const reader = new FileReader()
    reader.onload = ev => {
      const html = ev.target?.result as string
      const bookmarks = parseBookmarkHTML(html)
      setParsed(bookmarks)
    }
    reader.readAsText(f)
  }

  const handleImport = async () => {
    if (!ownerKey || !parsed.length) return
    setImporting(true)
    try {
      const res = await bulkImport({ ownerKey, bookmarks: parsed })
      setResult(res)
    } finally {
      setImporting(false)
    }
  }

  if (!ownerKey) {
    return (
      <div className='waps-bg flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center text-white'>
        <div className='waps-card rounded-2xl p-4'>
          <Bookmark className='mx-auto h-10 w-10 text-orange-400' />
        </div>
        <div>
          <h1 className='text-2xl font-semibold'>Import bookmarks</h1>
          <p className='mt-2 text-sm text-white/60'>
            Sign in to import bookmarks into your Waps.
          </p>
        </div>
        <Link href='/auth'>
          <Button className='waps-btn'>Sign in</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className='waps-bg min-h-screen px-4 py-8 text-white'>
      <div className='mx-auto max-w-lg space-y-5'>
        <div>
          <h1 className='text-2xl font-semibold'>Import bookmarks</h1>
          <p className='mt-1 text-sm text-white/60'>
            Import from browser bookmark exports or share from your browser.
          </p>
        </div>

        {/* Tab: Manual upload */}
        <div className='waps-card rounded-2xl p-4'>
          <div className='flex items-center gap-2'>
            <div className='waps-brand-bg grid h-9 w-9 place-items-center rounded-xl'>
              <Upload className='h-5 w-5 text-white' />
            </div>
            <div>
              <h2 className='font-semibold'>Upload HTML file</h2>
              <p className='text-xs text-white/50'>
                Export from Chrome, Firefox, Safari, or Edge
              </p>
            </div>
          </div>

          <div className='mt-4'>
            <input
              ref={fileInputRef}
              type='file'
              accept='.html,.htm'
              onChange={handleFile}
              className='hidden'
            />
            <Button
              type='button'
              variant='outline'
              onClick={() => fileInputRef.current?.click()}
              className='waps-btn-outline w-full'
            >
              <FileText className='mr-2 h-4 w-4' />
              {file ? file.name : 'Choose bookmark file'}
            </Button>
          </div>

          {parsed.length > 0 && (
            <div className='mt-4 space-y-3'>
              <p className='text-sm text-white/80'>
                Found{' '}
                <span className='font-semibold text-white'>
                  {parsed.length}
                </span>{' '}
                bookmarks
              </p>

              <div className='max-h-40 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2'>
                {parsed.slice(0, 50).map((bm, i) => (
                  <div key={i} className='truncate text-xs text-white/50'>
                    {bm.title}
                  </div>
                ))}
                {parsed.length > 50 && (
                  <div className='text-xs text-white/40'>
                    …and {parsed.length - 50} more
                  </div>
                )}
              </div>

              {result ? (
                <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200'>
                  <CheckCircle2 className='mr-1.5 inline h-4 w-4' />
                  Imported {result.added} bookmarks
                  {result.skipped > 0 && ` (${result.skipped} already saved)`}
                </div>
              ) : (
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className='waps-btn w-full'
                >
                  {importing ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Import className='mr-2 h-4 w-4' />
                      Import {parsed.length} bookmarks
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Browser share */}
        <div className='waps-card rounded-2xl p-4'>
          <div className='flex items-center gap-2'>
            <div className='waps-brand-bg grid h-9 w-9 place-items-center rounded-xl'>
              <Bookmark className='h-5 w-5 text-white' />
            </div>
            <div>
              <h2 className='font-semibold'>Share from browser</h2>
              <p className='text-xs text-white/50'>
                Use your browser&apos;s Share menu to send links to Waps
              </p>
            </div>
          </div>
          <ol className='mt-3 space-y-2 text-sm text-white/80'>
            <li className='flex gap-2'>
              <span className='text-orange-400'>1.</span>
              Open a website you want to save
            </li>
            <li className='flex gap-2'>
              <span className='text-orange-400'>2.</span>
              Tap Share in your browser menu
            </li>
            <li className='flex gap-2'>
              <span className='text-orange-400'>3.</span>
              Select Waps from the share sheet
            </li>
          </ol>
          <div className='mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/50'>
            Tip: Install Waps as a PWA (Add to Home Screen) for the best share
            experience.
          </div>
        </div>

        <div className='text-center text-sm text-white/40'>
          <Link href='/waps' className='hover:text-white/80'>
            &larr; Back to my Waps
          </Link>
        </div>
      </div>
    </div>
  )
}
