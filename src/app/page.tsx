'use client'

import { hasSeenMobileOnboarding, isMobileDevice } from '@/lib/onboarding'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('waps:user')
    if (user) {
      try {
        const parsed = JSON.parse(user) as { id?: string }
        if (
          parsed.id &&
          isMobileDevice(navigator.userAgent, navigator.maxTouchPoints) &&
          !hasSeenMobileOnboarding(parsed.id, localStorage)
        ) {
          router.replace('/onboarding')
          return
        }
      } catch {
        // Fall through to the normal authenticated destination.
      }
      router.replace('/bookmarks')
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className='flex min-h-screen items-center justify-center bg-background'>
      <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
    </div>
  )
}
