'use client'

import { fetchMe } from '@/lib/auth-api'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export type SessionUser = {
  id: string
  email: string
  name?: string | null
}

export function useSession() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const me = await fetchMe()
        if (cancelled) return
        if (!me.user) {
          router.replace('/login')
          return
        }
        setUser(me.user)

        const res = await fetch('/api/manual-auth/token', {
          credentials: 'include',
          cache: 'no-store'
        })
        if (!res.ok) {
          router.replace('/login')
          return
        }
        const data = await res.json()
        if (cancelled) return
        setSessionToken(data.token ?? null)
      } catch {
        if (!cancelled) router.replace('/login')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router])

  return { user, sessionToken, loading }
}
