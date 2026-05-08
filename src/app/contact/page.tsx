'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { useState } from 'react'

type State = 'idle' | 'sending' | 'success' | 'error'

export default function ContactPage() {
  const [state, setState] = useState<State>('idle')
  const [err, setErr] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  // Anti-bot honeypot; should stay empty
  const [company, setCompany] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setState('sending')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          company
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Failed to send. Try again.')
      }

      setState('success')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
      setCompany('')
    } catch (e) {
      setState('error')
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  return (
    <main className='waps-bg min-h-dvh px-4 pb-24 pt-6 text-white'>
      <div className='mx-auto w-full max-w-screen-sm space-y-5'>
        {/* Card header */}
        <div className='waps-card rounded-2xl p-5'>
          <div className='flex items-center gap-3'>
            <div className='waps-brand-bg grid h-11 w-11 place-items-center rounded-2xl'>
              <Mail className='h-5 w-5 text-white' />
            </div>
            <div>
              <h1 className='text-lg font-semibold leading-tight'>
                Contact us
              </h1>
              <p className='text-xs text-white/50'>
                Have a question about Waps? Send us a note.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className='mt-5 space-y-4'>
            <Field label='Name'>
              <Input
                value={name}
                onChange={e => setName(e.currentTarget.value)}
                placeholder='Your name'
                className='h-9 border-0 bg-transparent text-white placeholder:text-white/60 focus-visible:ring-0'
                required
              />
            </Field>

            <Field label='Email'>
              <Input
                type='email'
                value={email}
                onChange={e => setEmail(e.currentTarget.value)}
                placeholder='you@example.com'
                className='h-9 border-0 bg-transparent text-white placeholder:text-white/60 focus-visible:ring-0'
                required
              />
            </Field>

            <Field label='Subject'>
              <Input
                value={subject}
                onChange={e => setSubject(e.currentTarget.value)}
                placeholder="What's this about?"
                className='h-9 border-0 bg-transparent text-white placeholder:text-white/60 focus-visible:ring-0'
              />
            </Field>

            <Field label='Message'>
              <Textarea
                value={message}
                onChange={e => setMessage(e.currentTarget.value)}
                placeholder='Tell us a little more…'
                rows={6}
                className='border-0 bg-transparent text-white placeholder:text-white/60 focus-visible:ring-0'
                required
              />
            </Field>

            {/* Honeypot (hidden) */}
            <div className='hidden'>
              <label>
                Company
                <input
                  value={company}
                  onChange={e => setCompany(e.currentTarget.value)}
                />
              </label>
            </div>

            {/* Status */}
            {state === 'error' && (
              <p className='flex items-center gap-2 text-sm text-red-300'>
                <AlertTriangle className='h-4 w-4' /> {err || 'Failed to send.'}
              </p>
            )}
            {state === 'success' && (
              <p className='flex items-center gap-2 text-sm text-emerald-300'>
                <CheckCircle2 className='h-4 w-4' /> Thanks! We&apos;ll get back
                to you soon.
              </p>
            )}

            <Button
              type='submit'
              disabled={state === 'sending'}
              className='waps-btn w-full'
            >
              {state === 'sending' ? (
                <span className='inline-flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' /> Sending…
                </span>
              ) : (
                'Send message'
              )}
            </Button>
          </form>
        </div>

        <div className='text-center text-xs text-white/50'>
          We usually respond within 1–2 business days.
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className='block'>
      <div className='mb-1 text-xs uppercase tracking-wide text-white/50'>
        {label}
      </div>
      <div className='rounded-xl border border-white/10 bg-white/5 p-2'>
        {children}
      </div>
    </label>
  )
}
