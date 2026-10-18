'use client'

import { hasSeenMobileOnboarding, isMobileDevice } from '@/lib/onboarding'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function MobileOnboardingGuard({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (pathname === '/onboarding') {
      setChecking(false)
      return
    }

    const userJson = localStorage.getItem('waps:user')
    if (
      !userJson ||
      !isMobileDevice(navigator.userAgent, navigator.maxTouchPoints)
    ) {
      setChecking(false)
      return
    }

    try {
      const user = JSON.parse(userJson) as { id?: string }
      if (user.id && !hasSeenMobileOnboarding(user.id, localStorage)) {
        router.replace('/onboarding')
        return
      }
    } catch {
      // A malformed local user record is handled by the normal session guard.
    }

    setChecking(false)
  }, [pathname, router])

  if (checking) {
    return (
      <div className='flex min-h-[70vh] items-center justify-center bg-background'>
        <div
          className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent'
          aria-label='Checking onboarding'
        />
      </div>
    )
  }

  return children
}
