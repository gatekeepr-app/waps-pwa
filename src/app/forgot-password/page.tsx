'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send reset email')
      }
      setDone(true)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='waps-bg flex min-h-screen items-center justify-center px-4 text-white'>
      <div className='w-full max-w-sm space-y-4'>
        <div className='text-center'>
          <h1 className='text-xl font-semibold'>Forgot password</h1>
          <p className='mt-1 text-sm text-white/50'>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {done ? (
          <div className='waps-card rounded-2xl p-6 text-center'>
            <CheckCircle2 className='mx-auto h-10 w-10 text-emerald-400' />
            <p className='mt-3 text-sm text-white/80'>
              If an account exists for {email}, you&apos;ll receive a reset link
              shortly.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className='waps-card space-y-4 rounded-2xl p-4'
          >
            <div className='flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2'>
              <Mail className='h-4 w-4 text-white/50' />
              <Input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='your@email.com'
                className='h-9 border-0 bg-transparent px-0 placeholder:text-white/40 focus-visible:ring-0'
                autoFocus
                required
              />
            </div>

            {error && <p className='text-sm text-red-300'>{error}</p>}

            <Button
              type='submit'
              disabled={busy || !email.includes('@')}
              className='waps-btn w-full'
            >
              {busy ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Sending…
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>
        )}

        <div className='text-center text-sm text-white/40'>
          <Link href='/auth' className='hover:text-white/80'>
            &larr; Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
