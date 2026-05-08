'use client'

import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User as UserIcon
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  fetchMe,
  signIn,
  signOut,
  signUp,
  type MeResponse
} from '@/lib/auth-api'

export default function WapsAuthPage() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMe()
      .then(setMe)
      .catch(() => setMe({ user: null }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className='waps-bg grid min-h-screen place-items-center px-4 text-white'>
      {loading ? (
        <SkeletonCard />
      ) : me?.user ? (
        <AuthedView me={me} onSignedOut={() => fetchMe().then(setMe)} />
      ) : (
        <AuthCard onAuth={() => fetchMe().then(setMe)} />
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <Card className='waps-card w-full max-w-md'>
      <CardHeader className='space-y-2'>
        <div className='h-6 w-40 rounded bg-white/10' />
        <div className='h-4 w-64 rounded bg-white/10' />
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='h-10 w-full rounded-xl bg-white/5' />
        <div className='h-10 w-full rounded-xl bg-white/5' />
        <div className='h-10 w-full rounded-xl bg-white/5' />
      </CardContent>
      <CardFooter>
        <div className='h-9 w-full rounded-xl bg-white/5' />
      </CardFooter>
    </Card>
  )
}

function AuthedView({
  me,
  onSignedOut
}: {
  me: MeResponse
  onSignedOut: () => void
}) {
  const hello = useMemo(() => me.user?.name || me.user?.email || 'there', [me])

  async function handleSignOut() {
    await signOut()
    localStorage.removeItem('waps:user')
    onSignedOut()
  }

  return (
    <Card className='waps-card w-full max-w-md'>
      <CardHeader>
        <div className='flex items-center gap-3'>
          <MiniLogo />
          <div>
            <div className='text-lg font-semibold'>Welcome back</div>
            <div className='text-xs text-white/70'>Signed in to Waps</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <p className='text-white/90'>
          Hello {hello}! You are now authenticated.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSignOut} className='waps-btn w-full'>
          Sign out
        </Button>
      </CardFooter>
    </Card>
  )
}

function AuthCard({ onAuth }: { onAuth: () => void }) {
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
      if (tab === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(name.trim(), email, password)
        await signIn(email, password) // auto-login after sign-up
      }

      // sync localStorage and go to /waps
      const meNow = await fetchMe()
      if (meNow.user)
        localStorage.setItem('waps:user', JSON.stringify(meNow.user))

      onAuth() // refresh UI state
      router.push('/waps') // redirect
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className='waps-card w-full max-w-md'>
      <CardHeader>
        <div className='flex items-center gap-3'>
          <MiniLogo />
          <div>
            <div className='text-lg font-semibold'>
              {tab === 'signin' ? 'Sign in' : 'Create your account'}
            </div>
            <div className='text-xs text-white/70'>Your bookmarking buddy</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs
          value={tab}
          onValueChange={v => setTab(v as any)}
          className='w-full'
        >
          <TabsList className='grid w-full grid-cols-2 bg-white/10'>
            <TabsTrigger value='signin'>Sign in</TabsTrigger>
            <TabsTrigger value='signup'>Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value='signin' className='mt-4'>
            <form onSubmit={onSubmit} className='space-y-3'>
              <Field label='Email' htmlFor='email'>
                <div className='flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2'>
                  <Mail size={16} className='text-white/80' />
                  <Input
                    id='email'
                    name='email'
                    type='email'
                    placeholder='you@example.com'
                    className='h-9 border-0 bg-transparent px-0 placeholder:text-white/60 focus-visible:ring-0'
                    required
                  />
                </div>
              </Field>

              <Field label='Password' htmlFor='password'>
                <div className='flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2'>
                  <Lock size={16} className='text-white/80' />
                  <Input
                    id='password'
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder='••••••••'
                    className='h-9 border-0 bg-transparent px-0 placeholder:text-white/60 focus-visible:ring-0'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(s => !s)}
                    className='ml-auto rounded-lg px-2 py-1 hover:bg-white/10'
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              {error && (
                <div className='text-sm text-red-300' role='alert'>
                  {error}
                </div>
              )}

              <Button type='submit' disabled={busy} className='waps-btn w-full'>
                {busy ? (
                  <span className='inline-flex items-center gap-2'>
                    <Loader2 size={16} className='animate-spin' /> Signing in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </Button>
              <Link
                href='/forgot-password'
                className='block text-center text-xs text-white/50 hover:text-white/80'
              >
                Forgot password?
              </Link>
            </form>
          </TabsContent>

          <TabsContent value='signup' className='mt-4'>
            <form onSubmit={onSubmit} className='space-y-3'>
              <Field label='Name' htmlFor='name'>
                <div className='flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2'>
                  <UserIcon size={16} className='text-white/80' />
                  <Input
                    id='name'
                    name='name'
                    placeholder='Your name'
                    className='h-9 border-0 bg-transparent px-0 placeholder:text-white/60 focus-visible:ring-0'
                  />
                </div>
              </Field>

              <Field label='Email' htmlFor='email2'>
                <div className='flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2'>
                  <Mail size={16} className='text-white/80' />
                  <Input
                    id='email2'
                    name='email'
                    type='email'
                    placeholder='you@example.com'
                    className='h-9 border-0 bg-transparent px-0 placeholder:text-white/60 focus-visible:ring-0'
                    required
                  />
                </div>
              </Field>

              <Field label='Password' htmlFor='password2'>
                <div className='flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2'>
                  <Lock size={16} className='text-white/80' />
                  <Input
                    id='password2'
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Create a strong password'
                    className='h-9 border-0 bg-transparent px-0 placeholder:text-white/60 focus-visible:ring-0'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(s => !s)}
                    className='ml-auto rounded-lg px-2 py-1 hover:bg-white/10'
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              {error && (
                <div className='text-sm text-red-300' role='alert'>
                  {error}
                </div>
              )}

              <Button type='submit' disabled={busy} className='waps-btn w-full'>
                {busy ? (
                  <span className='inline-flex items-center gap-2'>
                    <Loader2 size={16} className='animate-spin' /> Creating…
                  </span>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <Separator className='my-4 bg-white/10' />
        <p className='text-center text-xs text-white/70'>
          By continuing you agree to Waps’ Terms & Privacy.
        </p>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  htmlFor,
  children
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className='space-y-1'>
      <Label
        htmlFor={htmlFor}
        className='text-xs uppercase tracking-wide text-white/70'
      >
        {label}
      </Label>
      {children}
    </div>
  )
}

function MiniLogo() {
  return (
    <div
      className='grid h-10 w-10 place-items-center rounded-xl font-black'
      style={{ background: 'linear-gradient(135deg,#FF6B57,#FFB057)' }}
      aria-label='Waps logo'
    >
      W
    </div>
  )
}
