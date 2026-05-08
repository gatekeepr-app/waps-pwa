'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMutation, useQuery } from 'convex/react'
import {
  FileText,
  Globe,
  Import,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  User as UserIcon
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
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

export default function ProfilePage() {
  const ownerKey = useOwnerKey()
  const me = undefined // TODO: use auth me when available

  const boards = useQuery(
    api.boards.listByOwnerKey,
    ownerKey ? { ownerKey } : 'skip'
  )

  const createBoard = useMutation(api.boards.create)
  const renameBoard = useMutation(api.boards.rename)
  const removeBoard = useMutation(api.boards.remove)
  const togglePublic = useMutation(api.boards.setPublic)

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleCreate = async () => {
    if (!ownerKey || !newName.trim()) return
    setCreating(true)
    try {
      const slug = newName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      await createBoard({
        ownerKey,
        name: newName.trim(),
        slug,
        isPublic: false
      })
      setNewName('')
    } finally {
      setCreating(false)
    }
  }

  const handleRename = async (id: any) => {
    if (!renameValue.trim()) return
    await renameBoard({ id, name: renameValue.trim() })
    setRenaming(null)
  }

  const handleDelete = async (id: any) => {
    if (!ownerKey) return
    if (!confirm('Delete this board and all its items?')) return
    await removeBoard({ id, ownerKey })
  }

  const handleToggle = async (id: any, current: boolean) => {
    await togglePublic({ id, isPublic: !current })
  }

  if (!ownerKey) {
    return (
      <div className='waps-bg flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center text-white'>
        <UserIcon className='h-12 w-12 text-orange-400' />
        <div>
          <h1 className='text-2xl font-semibold'>Profile</h1>
          <p className='mt-2 text-sm text-white/60'>
            Sign in to manage your account.
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
      <div className='mx-auto max-w-lg space-y-6'>
        {/* Header */}
        <div className='flex items-center gap-3'>
          <div className='waps-brand-bg grid h-11 w-11 place-items-center rounded-xl text-lg font-black'>
            W
          </div>
          <div>
            <h1 className='text-xl font-semibold'>Profile</h1>
            <p className='text-xs text-white/50'>
              Manage your boards and settings
            </p>
          </div>
        </div>

        {/* Import bookmarks */}
        <Link href='/import'>
          <div className='waps-card flex cursor-pointer items-center gap-3 rounded-2xl p-4 transition hover:bg-white/[0.08]'>
            <div className='grid h-10 w-10 place-items-center rounded-xl bg-orange-500/20'>
              <Import className='h-5 w-5 text-orange-400' />
            </div>
            <div className='flex-1'>
              <div className='font-medium'>Import bookmarks</div>
              <p className='text-xs text-white/50'>
                From browser HTML export or share sheet
              </p>
            </div>
            <FileText className='h-4 w-4 text-white/40' />
          </div>
        </Link>

        {/* Boards section */}
        <div className='waps-card rounded-2xl p-4'>
          <div className='mb-3 flex items-center justify-between'>
            <h2 className='font-semibold'>Your Boards</h2>
            <span className='text-xs text-white/50'>
              {boards?.length ?? '…'} boards
            </span>
          </div>

          {/* New board form */}
          <div className='mb-3 flex gap-2'>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder='New board name…'
              className='h-9 border border-white/10 bg-white/5 text-sm'
            />
            <Button
              size='sm'
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className='waps-btn h-9 shrink-0'
            >
              {creating ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Plus className='h-4 w-4' />
              )}
            </Button>
          </div>

          {/* Board list */}
          <div className='space-y-2'>
            {boards === undefined ? (
              <div className='flex items-center gap-2 text-sm text-white/50'>
                <Loader2 className='h-4 w-4 animate-spin' /> Loading…
              </div>
            ) : boards.length === 0 ? (
              <p className='text-sm text-white/40'>
                No boards yet. Create one above.
              </p>
            ) : (
              boards.map(board => (
                <div
                  key={board._id}
                  className='flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3'
                >
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      board.isPublic ? 'waps-brand-bg' : 'bg-white/10'
                    }`}
                  >
                    {board.isPublic ? (
                      <Globe className='h-4 w-4 text-white' />
                    ) : (
                      <Lock className='h-4 w-4 text-white/50' />
                    )}
                  </div>

                  {renaming === board._id ? (
                    <div className='flex flex-1 gap-1'>
                      <Input
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        className='h-8 border border-white/10 bg-white/5 text-sm'
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(board._id)
                          if (e.key === 'Escape') setRenaming(null)
                        }}
                      />
                      <Button
                        size='sm'
                        onClick={() => handleRename(board._id)}
                        className='waps-btn h-8 text-xs'
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm font-medium'>
                        {board.name}
                      </div>
                      <div className='flex items-center gap-2 text-xs text-white/50'>
                        <span>/{board.slug}</span>
                        <span>·</span>
                        <button
                          onClick={() =>
                            handleToggle(board._id, board.isPublic)
                          }
                          className={`hover:text-white ${
                            board.isPublic ? 'text-orange-400' : 'text-white/50'
                          }`}
                        >
                          {board.isPublic ? 'Public' : 'Private'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className='flex gap-1'>
                    <button
                      onClick={() => {
                        setRenaming(board._id)
                        setRenameValue(board.name)
                      }}
                      className='rounded-lg p-1.5 hover:bg-white/10'
                    >
                      <Pencil className='h-3.5 w-3.5 text-white/40' />
                    </button>
                    {board.slug !== 'default' && (
                      <button
                        onClick={() => handleDelete(board._id)}
                        className='rounded-lg p-1.5 hover:bg-red-500/20'
                      >
                        <Trash2 className='h-3.5 w-3.5 text-red-400' />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Links */}
        <div className='text-center text-sm text-white/40'>
          <Link href='/waps' className='hover:text-white/80'>
            &larr; Back to my Waps
          </Link>
        </div>
      </div>
    </div>
  )
}
