'use client'

import { Button } from '@/components/ui/button'
import { WifiOff } from 'lucide-react'
import Link from 'next/link'

export default function Offline() {
  return (
    <main className='waps-bg flex min-h-screen flex-col items-center justify-center p-6 text-center text-white'>
      <WifiOff className='mb-4 h-16 w-16 text-orange-400' />
      <h1 className='text-2xl font-bold'>You&rsquo;re Offline</h1>
      <p className='mt-2 max-w-sm text-white/70'>
        Looks like you lost your internet connection. Don&rsquo;t worry, you can
        still explore your saved waps once you&rsquo;re back online.
      </p>

      <div className='mt-6 flex gap-3'>
        <Link href='/'>
          <Button className='waps-btn'>Try Again</Button>
        </Link>
        <Link href='/waps'>
          <Button
            variant='outline'
            className='border-white/15 text-white hover:bg-white/10'
          >
            My Waps
          </Button>
        </Link>
      </div>
    </main>
  )
}
