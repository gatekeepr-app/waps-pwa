// app/api/auth/manual/signup/route.ts
export const runtime = 'nodejs'

import { rateLimit } from '@/lib/request-dedup'
import { ConvexHttpClient } from 'convex/browser'
import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { api } from '../../../../../convex/_generated/api'

let _client: ConvexHttpClient | null = null
const client = () =>
  _client ??
  (_client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!))

const bodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().max(80).optional()
})

export async function POST(req: Request) {
  try {
    const { email, password, name } = bodySchema.parse(await req.json())

    const rl = rateLimit(`signup:${email}`, 3, 3600_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Try again later.' },
        { status: 429 }
      )
    }

    const { userId } = await client().mutation(api.authManual.signup, {
      email,
      password,
      name
    })

    // (Optional) create session on signup
    const token = randomBytes(32).toString('base64url')
    const maxAgeDays = 30
    const expiresAt = Date.now() + maxAgeDays * 24 * 60 * 60 * 1000

    await client().mutation(api.authManual.createSession, {
      userId,
      token,
      expiresAt
    })

    const res = NextResponse.json({ ok: true })
    res.cookies.set('waps_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeDays * 24 * 60 * 60
    })
    return res
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Signup failed' },
      { status: 400 }
    )
  }
}
