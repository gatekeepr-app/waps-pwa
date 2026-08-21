'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('waps:user')
    if (user) {
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
