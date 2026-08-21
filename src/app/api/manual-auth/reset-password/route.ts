export const runtime = 'nodejs'

import { ConvexHttpClient } from 'convex/browser'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { api } from '../../../../../convex/_generated/api'

let _client: ConvexHttpClient | null = null
const client = () =>
  _client ??
  (_client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!))

const bodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128)
})

export async function POST(req: Request) {
  try {
    const { token, newPassword } = bodySchema.parse(await req.json())

    try {
      await client().mutation(api.authManual.resetPassword, {
        token,
        newPassword
      })
    } catch (e: any) {
      console.error('[reset-password] Convex error:', e?.message || e)
      return NextResponse.json(
        { error: e?.message ?? 'Failed to reset password' },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[reset-password] Error:', e)
    return NextResponse.json(
      { error: e?.message ?? 'Failed to reset password' },
      { status: 400 }
    )
  }
}
