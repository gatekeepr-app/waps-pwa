'use client'

import Link from 'next/link'

export default function OnboardingExtensionPage() {
  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-8'>
      <div className='mb-6'>
        <div className='mb-2 text-label font-bold uppercase tracking-widest text-primary'>
          Last step
        </div>
        <h1 className='text-heading font-bold text-text-primary'>
          Add the browser extension
        </h1>
        <p className='mt-2 text-sm leading-relaxed text-text-secondary'>
          Save links from any page without opening Waps first.
        </p>
      </div>

      <div className='waps-card mb-4 p-5'>
        <div className='mb-2 text-sm font-bold text-text-primary'>
          Install Waps for Chrome
        </div>
        <p className='text-sm leading-relaxed text-text-secondary'>
          Download the extension zip, unzip it, then load the folder in Chrome
          Extensions with Developer Mode enabled.
        </p>
      </div>

      <Link
        href='/extension'
        className='waps-btn block w-full py-3 text-center'
      >
        Get extension
      </Link>
      <Link
        href='/bookmarks'
        className='mt-4 block text-center text-sm text-text-secondary underline underline-offset-4'
      >
        Skip for now
      </Link>
    </div>
  )
}
