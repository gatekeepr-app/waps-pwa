'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useMutation } from 'convex/react'
import { ExternalLink, MoreVertical, StickyNote, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'

export function WapCard({ item }: { item: any }) {
  const remove = useMutation(api.waps.removeFromBoard)
  const updateNotes = useMutation(api.boardItems.updateNotes)
  const hostname = safeHostname(
    item.website.canonicalUrl || item.website.origin
  )

  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(item.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await updateNotes({
        ownerKey: getOwnerKey(),
        boardItemId: item._id,
        notes
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className='waps-card waps-hover overflow-hidden rounded-2xl'>
      <CardHeader className='pb-2'>
        <div className='flex items-start gap-3'>
          <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/15'>
            {item.website.faviconUrl ? (
              <Image
                src={item.website.faviconUrl}
                alt='favicon'
                fill
                sizes='40px'
                className='object-contain p-1.5'
              />
            ) : (
              <div className='grid h-full w-full place-items-center text-xs text-black/90'>
                {hostname[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className='min-w-0 flex-1'>
            <CardTitle className='truncate text-[15px] font-semibold text-white'>
              {item.website.title || hostname}
            </CardTitle>
            <p className='truncate text-xs text-white/50'>{hostname}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className='rounded-lg p-2 hover:bg-white/10'>
                <MoreVertical className='h-4 w-4 text-white/60' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='waps-card rounded-xl'>
              <DropdownMenuItem
                className='focus:bg-white/10'
                onClick={() => setEditing(!editing)}
              >
                <StickyNote className='mr-2 h-4 w-4' />
                {editing ? 'Close notes' : 'Add notes'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className='text-red-600 focus:bg-white/10'
                onClick={() =>
                  remove({ ownerKey: getOwnerKey(), boardItemId: item._id })
                }
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className='pt-2 text-white'>
        {editing || notes ? (
          <div className='mb-3'>
            {editing ? (
              <div className='space-y-2'>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder='Add your personal notes about this website…'
                  rows={3}
                  className='w-full resize-none rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20'
                />
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    onClick={handleSaveNotes}
                    disabled={saving}
                    className='waps-btn h-8 rounded-lg text-xs'
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      setNotes(item.notes || '')
                      setEditing(false)
                    }}
                    className='h-8 rounded-lg border-white/15 text-xs text-white hover:bg-white/10'
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className='w-full cursor-text rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-left text-sm text-white/60 hover:border-white/15'
              >
                <StickyNote className='mr-1.5 inline h-3.5 w-3.5 text-white/40' />
                {notes}
              </button>
            )}
          </div>
        ) : null}

        <div className='flex gap-2'>
          <Button asChild size='sm' className='waps-btn h-9 flex-1 rounded-xl'>
            <Link
              href={item.website.canonicalUrl}
              target='_blank'
              rel='noopener noreferrer'
            >
              Open <ExternalLink className='ml-1 h-4 w-4' />
            </Link>
          </Button>
          <Button
            asChild
            variant='outline'
            size='sm'
            className='h-9 rounded-xl border border-white/15 text-white hover:bg-white/10'
          >
            <Link href={`/explore/${item.website.slug}`}>Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}
function getOwnerKey() {
  try {
    return (
      localStorage.getItem('waps.ownerKey') ||
      localStorage.getItem('ownerKey') ||
      ''
    )
  } catch {
    return ''
  }
}
