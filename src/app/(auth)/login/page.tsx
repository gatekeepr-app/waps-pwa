'use client'

import { fetchMe, signIn, signUp } from '@/lib/auth-api'
import { Eye, EyeOff, Github, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const email = (fd.get('email') as string)?.trim()
    const password = (fd.get('password') as string) ?? ''
    const name = (fd.get('name') as string) || ''

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (tab === 'signup' && name && name.trim().length < 2) {
      setError('Name must be at least 2 characters.')
      return
    }

    setBusy(true)
    try {
      let signinResult: any
      if (tab === 'signin') {
        signinResult = await signIn(email, password)
      } else {
        await signUp(name.trim(), email, password)
        signinResult = await signIn(email, password)
      }

      const meNow = await fetchMe()
      if (meNow.user)
        localStorage.setItem('waps:user', JSON.stringify(meNow.user))

      router.push('/bookmarks')
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  function handleGitHubOAuth() {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
    if (!clientId) {
      setError('GitHub OAuth not configured.')
      return
    }
    const redirectUri = `${window.location.origin}/api/auth/github/callback`
    const scope = 'read:user user:email'
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`
  }

  return (
    <div className='w-full max-w-md'>
      <div className='waps-card p-6'>
        <div className='mb-6 flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-md bg-primary font-bold text-white'>
            W
          </div>
          <div>
            <div className='text-heading font-bold'>
              {tab === 'signin' ? 'Sign in' : 'Create your account'}
            </div>
            <div className='text-sm text-text-secondary'>
              Your bookmarking buddy
            </div>
          </div>
        </div>

        <div className='mb-4 flex gap-1 rounded-md bg-surface p-1'>
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 rounded-sm py-2 text-sm font-medium transition-colors ${
              tab === 'signin'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 rounded-sm py-2 text-sm font-medium transition-colors ${
              tab === 'signup'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} className='space-y-4'>
          {tab === 'signup' && (
            <div>
              <label className='waps-label mb-1 block'>Name</label>
              <input
                name='name'
                type='text'
                placeholder='Your name'
                className='waps-input w-full'
              />
            </div>
          )}

          <div>
            <label className='waps-label mb-1 block'>Email</label>
            <input
              name='email'
              type='email'
              placeholder='you@example.com'
              className='waps-input w-full'
              required
            />
          </div>

          <div>
            <div className='mb-1 flex items-center justify-between'>
              <label className='waps-label'>Password</label>
              <Link
                href='/forgot-password'
                className='text-xs text-text-secondary hover:text-primary'
              >
                Forgot password?
              </Link>
            </div>
            <div className='relative'>
              <input
                name='password'
                type={showPassword ? 'text' : 'password'}
                placeholder='••••••••'
                className='waps-input w-full pr-10'
                required
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
            {busy ? (
              <>
                <Loader2 size={16} className='animate-spin' />
                {tab === 'signin' ? 'Signing in...' : 'Creating...'}
              </>
            ) : tab === 'signin' ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className='my-4 flex items-center gap-3'>
          <div className='h-px flex-1 bg-border' />
          <span className='text-xs text-text-secondary'>or</span>
          <div className='h-px flex-1 bg-border' />
        </div>

        <button
          onClick={handleGitHubOAuth}
          className='waps-btn-outline flex w-full items-center justify-center gap-2'
        >
          <Github size={16} />
          Continue with GitHub
        </button>

        <p className='mt-4 text-center text-xs text-text-secondary'>
          By continuing you agree to Waps&apos; Terms & Privacy.
        </p>
      </div>

      <Link
        href='/bookmarks'
        className='mt-4 block text-center text-sm text-text-secondary hover:text-text-primary'
      >
        Maybe later
      </Link>
    </div>
  )
}
