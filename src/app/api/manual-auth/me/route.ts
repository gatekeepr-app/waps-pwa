export const runtime = 'nodejs'

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

  const data = await getClient().query(api.authManual.sessionUser, { token })
  if (!data) return NextResponse.json({ user: null })

  return NextResponse.json({
    user: { id: data._id, email: data.email, name: data.name }
  })
}
