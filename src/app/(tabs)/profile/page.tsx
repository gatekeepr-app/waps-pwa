'use client'

import { LogOutIcon } from '@/components/GeometricIcons'
import { signOut } from '@/lib/auth-api'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'

export default function ProfilePage() {
  const router = useRouter()
  const { user, sessionToken, loading: sessionLoading } = useSession()
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingBusy, setPairingBusy] = useState(false)
  const [pairingError, setPairingError] = useState<string | null>(null)

  const generateCode = useMutation(api.pairing.generatePairingCode)

  const bookmarks = useQuery(
    api.bookmarks.list,
    sessionToken ? { sessionToken } : 'skip'
  )
  const categories = useQuery(
    api.categories.list,
    sessionToken ? { sessionToken } : 'skip'
  )

  async function handleSignOut() {
    try {
      await signOut()
    } catch {}
    localStorage.removeItem('waps:user')
    router.push('/login')
  }

  async function handleGeneratePairing() {
    if (!sessionToken) return
    setPairingBusy(true)
    setPairingError(null)
    try {
      const result = await generateCode({ sessionToken })
      setPairingCode(result.code)
    } catch (e: any) {
      setPairingError(e?.message || 'Failed to generate code')
    } finally {
      setPairingBusy(false)
    }
  }

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-4'>
      <h1 className='mb-6 text-heading font-bold text-text-primary'>Profile</h1>

      <div className='waps-card mb-4 p-6'>
        <div className='mb-4 flex items-center gap-4'>
          <div className='flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white'>
            {user?.name?.[0]?.toUpperCase() ||
              user?.email?.[0]?.toUpperCase() ||
              'U'}
          </div>
          <div>
            <div className='text-base font-bold text-text-primary'>
              {user?.name || 'User'}
            </div>
            <div className='text-sm text-text-secondary'>{user?.email}</div>
          </div>
        </div>
        <div className='flex gap-4 text-sm text-text-secondary'>
          <div>
            <span className='font-bold text-text-primary'>
              {bookmarks?.length ?? 0}
            </span>{' '}
            waps
          </div>
          <div>
            <span className='font-bold text-text-primary'>
              {categories?.length ?? 0}
            </span>{' '}
            categories
          </div>
        </div>
      </div>

      <div className='waps-card mb-4 p-6'>
        <h2 className='mb-2 text-sm font-bold uppercase tracking-widest text-text-secondary'>
          Browser Extension
        </h2>
        <p className='mb-4 text-sm text-text-secondary'>
          Pair your browser extension to save bookmarks directly from any
          website.
        </p>

        {pairingCode ? (
          <div className='rounded-md border border-primary bg-surface p-4 text-center'>
            <div className='mb-1 text-xs text-text-secondary'>
              Your pairing code
            </div>
            <div className='text-2xl font-bold tracking-[0.3em] text-primary'>
              {pairingCode}
            </div>
            <div className='mt-2 text-xs text-text-secondary'>
              Enter this code in the Waps browser extension. Code expires in 10
              minutes.
            </div>
          </div>
        ) : (
          <button
            onClick={handleGeneratePairing}
            disabled={pairingBusy}
            className='waps-btn w-full'
          >
            {pairingBusy ? 'Generating...' : 'Generate Pairing Code'}
          </button>
        )}

        {pairingError && (
          <div className='mt-2 text-sm text-destructive'>{pairingError}</div>
        )}
      </div>

      <button
        onClick={handleSignOut}
        className='waps-btn-outline flex w-full items-center justify-center gap-2'
      >
        <LogOutIcon size={16} />
        Sign out
      </button>
    </div>
  )
}
