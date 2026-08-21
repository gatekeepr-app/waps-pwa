'use client'

import { BackIcon } from '@/components/GeometricIcons'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className='w-full max-w-md'>
        <div className='waps-card p-6 text-center'>
          <h1 className='mb-2 text-heading font-bold text-text-primary'>
            Invalid link
          </h1>
          <p className='mb-4 text-sm text-text-secondary'>
            This password reset link is invalid or missing a token.
          </p>
          <Link href='/forgot-password' className='waps-btn inline-block'>
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const password = (fd.get('password') as string) ?? ''
    const confirm = (fd.get('confirm') as string) ?? ''

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/manual-auth/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setDone(true)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className='w-full max-w-md'>
        <div className='waps-card p-6 text-center'>
          <div className='mb-2 text-heading font-bold text-primary'>
            Password updated
          </div>
          <p className='mb-4 text-sm text-text-secondary'>
            Your password has been reset successfully.
          </p>
          <Link href='/login' className='waps-btn inline-block'>
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full max-w-md'>
      <div className='waps-card p-6'>
        <Link
          href='/login'
          className='mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary'
        >
          <BackIcon size={14} />
          Back to sign in
        </Link>

        <h1 className='mb-2 text-heading font-bold text-text-primary'>
          Set new password
        </h1>
        <p className='mb-6 text-sm text-text-secondary'>
          Choose a strong password with at least 8 characters.
        </p>

        <form onSubmit={onSubmit} className='space-y-4'>
          <div>
            <label className='waps-label mb-1 block'>New password</label>
            <div className='relative'>
              <input
                name='password'
                type={showPassword ? 'text' : 'password'}
                placeholder='••••••••'
                className='waps-input w-full pr-10'
                required
                autoFocus
              />
              <button
                type='button'
                onClick={() => setShowPassword(s => !s)}
                className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary'
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className='waps-label mb-1 block'>Confirm password</label>
            <input
              name='confirm'
              type='password'
              placeholder='••••••••'
              className='waps-input w-full'
              required
            />
          </div>

          {error && (
            <div className='text-sm text-destructive' role='alert'>
              {error}
            </div>
          )}

          <button
            type='submit'
            disabled={busy}
            className='waps-btn flex w-full items-center justify-center gap-2'
          >
            {busy ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className='flex min-h-screen items-center justify-center bg-background'>
          <div className='text-sm text-text-secondary'>Loading...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
