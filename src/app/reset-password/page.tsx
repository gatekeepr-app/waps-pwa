'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMutation } from 'convex/react'
import { CheckCircle2, Loader2, Lock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { api } from '../../../convex/_generated/api'

function ResetForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()
  const resetPassword = useMutation(api.authManual.resetPassword)

  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetPassword({ token, newPassword: password })
      setDone(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className='waps-card rounded-2xl p-6 text-center'>
        <p className='text-white/80'>Invalid reset link. No token provided.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className='waps-card rounded-2xl p-6 text-center'>
        <CheckCircle2 className='mx-auto h-10 w-10 text-emerald-400' />
        <h2 className='mt-3 text-lg font-semibold'>Password reset!</h2>
        <p className='mt-1 text-sm text-white/50'>
          You can now sign in with your new password.
        </p>
        <Button onClick={() => router.push('/auth')} className='waps-btn mt-4'>
          Sign in
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='waps-card space-y-4 rounded-2xl p-4'
    >
      <div>
        <h2 className='text-lg font-semibold'>Set new password</h2>
        <p className='text-sm text-white/50'>Enter your new password below.</p>
      </div>

      <div className='flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2'>
        <Lock className='h-4 w-4 text-white/50' />
        <Input
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder='New password (8+ chars)'
          className='h-9 border-0 bg-transparent px-0 placeholder:text-white/40 focus-visible:ring-0'
          autoFocus
        />
      </div>

      {error && <p className='text-sm text-red-300'>{error}</p>}

      <Button
        type='submit'
        disabled={busy || password.length < 8}
        className='waps-btn w-full'
      >
        {busy ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
        Reset password
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className='waps-bg flex min-h-screen items-center justify-center px-4 text-white'>
      <div className='w-full max-w-sm space-y-4'>
        <Suspense
          fallback={<div className='text-center text-white/50'>Loading…</div>}
        >
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
