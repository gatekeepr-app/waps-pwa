export const runtime = 'nodejs'

import { ConvexHttpClient } from 'convex/browser'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { api } from '../../../../../convex/_generated/api'

let _client: ConvexHttpClient | null = null
const client = () =>
  _client ??
  (_client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!))

export async function POST() {
  const token = cookies().get('waps_session')?.value
  const res = NextResponse.json({ ok: true })
  if (token) {
    await client().mutation(api.authManual.deleteSessionByToken, { token })
    res.cookies.set('waps_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    })
  }
  return res
}
