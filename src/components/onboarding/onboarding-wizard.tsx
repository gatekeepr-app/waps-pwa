'use client'

import { markMobileOnboardingSeen } from '@/lib/onboarding'
import {
  DEFAULT_ONBOARDING_CATEGORIES,
  splitOnboardingCategories
} from '@/lib/onboarding-categories'
import { useSession } from '@/lib/use-session'
import { useMutation, useQuery } from 'convex/react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Chrome,
  Link2,
  Loader2,
  Plus,
  Sparkles
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '../../../convex/_generated/api'

type Step = 1 | 2 | 3

export function OnboardingWizard() {
  const router = useRouter()
  const { sessionToken, user, loading } = useSession()
  const [step, setStep] = useState<Step>(1)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [savedFirstLink, setSavedFirstLink] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(['Work', 'Reading', 'Learning'])
  )
  const [customName, setCustomName] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const suggestions = useQuery(api.bookmarks.exploreFeed, {
    sort: 'trending',
    limit: 3
  })
  const addBookmark = useMutation(api.bookmarks.add)
  const configureCategories = useMutation(api.categories.configureOnboarding)
  const generatePairingCode = useMutation(api.pairing.generatePairingCode)

  useEffect(() => {
    if (user?.id) markMobileOnboardingSeen(user.id, localStorage)
  }, [user?.id])

  function clearError() {
    if (error) setError('')
  }

  function chooseSuggestion(suggestion: { url: string; title?: string }) {
    setUrl(suggestion.url)
    setTitle(suggestion.title ?? '')
    clearError()
  }

  async function saveFirstLink() {
    if (!sessionToken || !url.trim()) return
    setBusy(true)
    setError('')
    try {
      await addBookmark({
        sessionToken,
        url: url.trim(),
        title: title.trim() || undefined
      })
      setSavedFirstLink(true)
    } catch (err: any) {
      setError(err?.message || 'We could not save that link yet.')
    } finally {
      setBusy(false)
    }
  }

  function toggleCategory(name: string) {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function addCustomCategory() {
    const name = customName.trim()
    if (!name) return
    setSelected(current => new Set(current).add(name))
    setCustomName('')
  }

  async function finishCategories() {
    if (!sessionToken) return
    setBusy(true)
    setError('')
    try {
      const selection = splitOnboardingCategories(Array.from(selected))
      await configureCategories({
        sessionToken,
        defaultNames: selection.defaultNames,
        customNames: selection.customNames
      })
      setStep(3)
    } catch (err: any) {
      setError(err?.message || 'We could not save your categories.')
    } finally {
      setBusy(false)
    }
  }

  async function createPairingCode() {
    if (!sessionToken) return
    setBusy(true)
    setError('')
    try {
      const result = await generatePairingCode({ sessionToken })
      setPairingCode(result.code)
    } catch (err: any) {
      setError(err?.message || 'We could not create a pairing code.')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !sessionToken) {
    return (
      <div className='mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4'>
        <Loader2
          className='animate-spin text-primary'
          aria-label='Loading onboarding'
        />
      </div>
    )
  }

  return (
    <main className='mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-10 pt-6 sm:px-6 sm:pt-10'>
      <header className='mb-8 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='flex h-9 w-9 items-center justify-center rounded-md bg-primary font-bold text-white'>
            W
          </div>
          <span className='text-sm font-bold tracking-wide text-text-primary'>
            WAPS
          </span>
        </div>
        <button
          type='button'
          onClick={() => router.push('/bookmarks')}
          className='text-sm text-text-secondary underline underline-offset-4 hover:text-text-primary'
        >
          Skip setup
        </button>
      </header>

      <div className='mb-8' aria-label={`Onboarding step ${step} of 3`}>
        <div className='mb-3 flex items-center gap-2'>
          {[1, 2, 3].map(item => (
            <div
              key={item}
              className={`h-1 flex-1 rounded-full transition-colors ${item <= step ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </div>
        <div className='text-xs font-bold uppercase tracking-widest text-text-secondary'>
          Step {step} of 3
        </div>
      </div>

      <div
        key={step}
        className='flex-1 duration-300 animate-in slide-in-from-right-4'
      >
        {step === 1 && (
          <section aria-labelledby='onboarding-link-title'>
            <div className='mb-8 max-w-xl'>
              <div className='mb-3 flex items-center gap-2 text-sm font-bold text-primary'>
                <Sparkles size={16} /> Start with one useful link
              </div>
              <h1
                id='onboarding-link-title'
                className='text-3xl font-bold tracking-tight text-text-primary sm:text-4xl'
              >
                Start adding your first link.
              </h1>
              <p className='mt-3 text-base leading-relaxed text-text-secondary'>
                Drop in something you want to remember. Waps will fetch the
                details and keep it organized for you.
              </p>
            </div>

            <div className='waps-card p-4 sm:p-5'>
              <label htmlFor='onboarding-url' className='waps-label mb-2 block'>
                Link to save
              </label>
              <div className='flex flex-col gap-2 sm:flex-row'>
                <div className='relative min-w-0 flex-1'>
                  <Link2
                    className='absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary'
                    size={16}
                  />
                  <input
                    id='onboarding-url'
                    type='url'
                    value={url}
                    onChange={event => {
                      setUrl(event.target.value)
                      clearError()
                    }}
                    placeholder='https://example.com/article'
                    className='waps-input w-full py-3 pl-9'
                    autoFocus
                  />
                </div>
                <button
                  type='button'
                  onClick={saveFirstLink}
                  disabled={busy || !url.trim() || savedFirstLink}
                  className='waps-btn flex items-center justify-center gap-2 whitespace-nowrap sm:px-5'
                >
                  {busy ? (
                    <Loader2 size={16} className='animate-spin' />
                  ) : (
                    <Plus size={16} />
                  )}
                  {savedFirstLink ? 'Saved' : 'Add link'}
                </button>
              </div>
              {title && (
                <p className='mt-2 truncate text-xs text-text-secondary'>
                  {title}
                </p>
              )}
              {error && (
                <p className='mt-3 text-sm text-destructive' role='alert'>
                  {error}
                </p>
              )}
            </div>

            <div className='mt-8'>
              <div className='mb-3 flex items-end justify-between'>
                <div>
                  <h2 className='text-sm font-bold text-text-primary'>
                    Need a starting point?
                  </h2>
                  <p className='mt-1 text-xs text-text-secondary'>
                    Popular links saved by the Waps community.
                  </p>
                </div>
                <span className='text-xs text-text-secondary'>Top 3</span>
              </div>
              <div className='space-y-2'>
                {(suggestions ?? []).map(suggestion => (
                  <button
                    key={suggestion._id}
                    type='button'
                    onClick={() => chooseSuggestion(suggestion)}
                    className='waps-card flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-primary'
                  >
                    <div className='flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-surface text-primary'>
                      <Link2 size={16} />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm font-bold text-text-primary'>
                        {suggestion.title || suggestion.url}
                      </div>
                      <div className='truncate text-xs text-text-secondary'>
                        {suggestion.url}
                      </div>
                    </div>
                    <ArrowRight
                      size={15}
                      className='flex-shrink-0 text-text-secondary'
                    />
                  </button>
                ))}
                {suggestions?.length === 0 && (
                  <p className='py-4 text-sm text-text-secondary'>
                    Your first link can set the tone for your library.
                  </p>
                )}
              </div>
            </div>

            <div className='mt-10 flex justify-end'>
              <button
                type='button'
                onClick={() => setStep(2)}
                className='waps-btn flex items-center gap-2'
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby='onboarding-category-title'>
            <div className='mb-8 max-w-xl'>
              <div className='mb-3 text-sm font-bold text-primary'>
                Make Waps feel like yours
              </div>
              <h1
                id='onboarding-category-title'
                className='text-3xl font-bold tracking-tight text-text-primary sm:text-4xl'
              >
                Choose your starting categories.
              </h1>
              <p className='mt-3 text-base leading-relaxed text-text-secondary'>
                Keep the defaults, pick only what fits, or create a category of
                your own.
              </p>
            </div>

            <div className='mb-4 flex flex-wrap gap-2'>
              {DEFAULT_ONBOARDING_CATEGORIES.map(name => {
                const active = selected.has(name)
                return (
                  <button
                    key={name}
                    type='button'
                    aria-pressed={active}
                    onClick={() => toggleCategory(name)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text-primary hover:border-primary'}`}
                  >
                    {active && <Check size={14} />}
                    {name}
                  </button>
                )
              })}
            </div>

            {selected.size === 0 && (
              <p className='mb-4 text-sm text-text-secondary'>
                Pick at least one category, or skip setup.
              </p>
            )}

            <form
              className='mb-8 flex gap-2'
              onSubmit={event => {
                event.preventDefault()
                addCustomCategory()
              }}
            >
              <input
                value={customName}
                onChange={event => setCustomName(event.target.value)}
                placeholder='Create your own category'
                maxLength={40}
                className='waps-input min-w-0 flex-1'
              />
              <button
                type='submit'
                disabled={!customName.trim()}
                className='waps-btn flex items-center gap-2'
              >
                <Plus size={15} /> Add
              </button>
            </form>

            {error && (
              <p className='mb-4 text-sm text-destructive' role='alert'>
                {error}
              </p>
            )}
            <div className='flex items-center justify-between gap-3'>
              <button
                type='button'
                onClick={() => setStep(1)}
                className='waps-btn-outline flex items-center gap-2'
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type='button'
                onClick={finishCategories}
                disabled={busy || selected.size === 0}
                className='waps-btn flex items-center gap-2'
              >
                {busy && <Loader2 size={16} className='animate-spin' />}{' '}
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby='onboarding-extension-title'>
            <div className='mb-8 max-w-xl'>
              <div className='mb-3 flex items-center gap-2 text-sm font-bold text-primary'>
                <Chrome size={16} /> Keep saving in one click
              </div>
              <h1
                id='onboarding-extension-title'
                className='text-3xl font-bold tracking-tight text-text-primary sm:text-4xl'
              >
                Install the extension and pair your app.
              </h1>
              <p className='mt-3 text-base leading-relaxed text-text-secondary'>
                Save anything you find on the web without leaving the page you
                are on.
              </p>
            </div>

            <div className='waps-card mb-4 p-5'>
              <div className='mb-3 flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white'>
                  <Chrome size={19} />
                </div>
                <div>
                  <h2 className='font-bold text-text-primary'>
                    Install Waps for Chrome
                  </h2>
                  <p className='text-xs text-text-secondary'>
                    Download, unzip, then load it from chrome://extensions.
                  </p>
                </div>
              </div>
              <a
                href='/extension'
                target='_blank'
                rel='noreferrer'
                className='waps-btn-outline block w-full text-center'
              >
                Get the extension
              </a>
            </div>

            <div className='waps-card p-5'>
              <h2 className='mb-2 font-bold text-text-primary'>
                Pair it with this account
              </h2>
              <p className='mb-4 text-sm leading-relaxed text-text-secondary'>
                Open the extension, choose Connect, and enter the code below.
              </p>
              {pairingCode ? (
                <div className='rounded-md border border-primary bg-surface p-4 text-center'>
                  <div className='text-xs font-bold uppercase tracking-widest text-text-secondary'>
                    Pairing code
                  </div>
                  <div className='mt-2 text-3xl font-bold tracking-[0.3em] text-primary'>
                    {pairingCode}
                  </div>
                  <div className='mt-2 text-xs text-text-secondary'>
                    This code expires in 10 minutes.
                  </div>
                </div>
              ) : (
                <button
                  type='button'
                  onClick={createPairingCode}
                  disabled={busy}
                  className='waps-btn flex w-full items-center justify-center gap-2'
                >
                  {busy && <Loader2 size={16} className='animate-spin' />}{' '}
                  Generate pairing code
                </button>
              )}
              {error && (
                <p className='mt-3 text-sm text-destructive' role='alert'>
                  {error}
                </p>
              )}
            </div>

            <div className='mt-8 flex items-center justify-between gap-3'>
              <button
                type='button'
                onClick={() => setStep(2)}
                className='waps-btn-outline flex items-center gap-2'
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type='button'
                onClick={() => router.push('/bookmarks')}
                className='waps-btn flex items-center gap-2'
              >
                Finish setup <Check size={16} />
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
