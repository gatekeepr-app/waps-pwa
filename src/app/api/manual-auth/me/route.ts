export const runtime = 'nodejs'

import { dedup } from '@/lib/request-dedup'
import { ConvexHttpClient } from 'convex/browser'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { api } from '../../../../../convex/_generated/api'

let _client: ConvexHttpClient | null = null
function getClient() {
  if (!_client)
    _client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  return _client
}

export async function GET() {
  const token = cookies().get('waps_session')?.value
  if (!token) return NextResponse.json({ user: null })

  const data = await dedup(`session:${token}`, () =>
    getClient().query(api.authManual.sessionUser, { token })
  )
  return NextResponse.json(data)
}
