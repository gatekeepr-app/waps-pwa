'use client'

import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import { Check, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'

const SUGGESTED_CATEGORIES = [
  'Work',
  'Reading',
  'Learning',
  'Shopping',
  'Recipes',
  'Travel',
  'Finance',
  'Health',
  'Personal'
]

export default function OnboardingCategoriesPage() {
  const router = useRouter()
  const { sessionToken, loading } = useSession()
  const addCategory = useMutation(api.categories.add)
  const categories = useQuery(
    api.categories.list,
    sessionToken ? { sessionToken } : 'skip'
  )
  const [selected, setSelected] = useState<Set<string>>(
    new Set(['Work', 'Reading', 'Learning'])
  )
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [busy, setBusy] = useState(false)

  function toggle(name: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function addCustomCategory() {
    const name = customName.trim()
    if (!name) return
    setSelected(prev => new Set(prev).add(name))
    setCustomName('')
    setCustomOpen(false)
  }

  async function finish() {
    if (!sessionToken) return
    setBusy(true)
    try {
      const existing = new Set(
        (categories ?? []).map(category => category.name)
      )
      for (const name of Array.from(selected)) {
        if (!existing.has(name)) {
          await addCategory({ sessionToken, name })
        }
      }
      router.push('/onboarding/extension')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save categories'
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading || categories === undefined) {
    return <div className='p-6 text-sm text-text-secondary'>Loading...</div>
  }

  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-8'>
      <div className='mb-6'>
        <div className='mb-2 text-label font-bold uppercase tracking-widest text-primary'>
          One quick setup
        </div>
        <h1 className='text-heading font-bold text-text-primary'>
          Pick your starting categories
        </h1>
        <p className='mt-2 text-sm leading-relaxed text-text-secondary'>
          Choose the buckets you want Waps to start with. You can edit these
          anytime.
        </p>
      </div>

      <div className='mb-4 grid grid-cols-2 gap-2'>
        {SUGGESTED_CATEGORIES.map(name => {
          const active = selected.has(name)
          return (
            <button
              key={name}
              type='button'
              onClick={() => toggle(name)}
              className={`flex items-center justify-between rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-text-primary'
              }`}
            >
              {name}
              {active && <Check size={14} />}
            </button>
          )
        })}
      </div>

      {customOpen ? (
        <form
          className='mb-4 flex gap-2'
          onSubmit={event => {
            event.preventDefault()
            addCustomCategory()
          }}
        >
          <input
            value={customName}
            onChange={event => setCustomName(event.target.value)}
            placeholder='Custom category'
            maxLength={40}
            className='waps-input min-w-0 flex-1'
            autoFocus
          />
          <button type='submit' className='waps-btn flex items-center gap-1.5'>
            <Plus size={14} />
            Add
          </button>
        </form>
      ) : (
        <button
          type='button'
          className='mb-4 text-sm font-medium text-text-secondary underline underline-offset-4 hover:text-primary'
          onClick={() => setCustomOpen(true)}
        >
          Create your own category
        </button>
      )}

      <button
        type='button'
        className='waps-btn w-full py-3'
        disabled={busy || selected.size === 0}
        onClick={finish}
      >
        {busy ? 'Saving...' : 'Continue'}
      </button>
    </div>
  )
}
