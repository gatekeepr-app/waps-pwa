'use client'

import { BackIcon } from '@/components/GeometricIcons'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const fd = new FormData(e.currentTarget)
    const email = (fd.get('email') as string)?.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      setBusy(false)
      return
    }

    try {
      const res = await fetch('/api/manual-auth/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setSent(true)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
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
          Reset your password
        </h1>
        <p className='mb-6 text-sm text-text-secondary'>
          Enter the email you used to sign up. We&apos;ll send you a link to
          reset your password.
        </p>

        {sent ? (
          <div className='rounded-md border border-border bg-surface p-4 text-center'>
            <div className='mb-2 text-sm font-bold text-primary'>
              Check your inbox
            </div>
            <p className='text-xs text-text-secondary'>
              If an account exists with that email, you&apos;ll receive a reset
              link shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className='space-y-4'>
            <div>
              <label className='waps-label mb-1 block'>Email</label>
              <input
                name='email'
                type='email'
                placeholder='you@example.com'
                className='waps-input w-full'
                required
                autoFocus
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
              {busy ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
