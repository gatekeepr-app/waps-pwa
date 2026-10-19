export const runtime = 'nodejs'

import { signUpBodySchema } from '@/lib/auth-validation'
import { ConvexHttpClient } from 'convex/browser'
import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { api } from '../../../../../convex/_generated/api'

let _client: ConvexHttpClient | null = null
const client = () =>
  _client ??
  (_client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!))

const internalSecret = () => {
  const secret = process.env.MANUAL_AUTH_INTERNAL_SECRET
  if (!secret) throw new Error('Authentication service is not configured')
  return secret
}

export async function POST(req: Request) {
  try {
    const { email, password, name } = signUpBodySchema.parse(await req.json())

    const { userId } = await client().mutation(api.authManual.signup, {
      email,
      password,
      name
    })

    const token = randomBytes(32).toString('base64url')
    const maxAgeDays = 30
    const expiresAt = Date.now() + maxAgeDays * 24 * 60 * 60 * 1000

    await client().mutation(api.authManual.createSession, {
      userId,
      token,
      expiresAt,
      userAgent: req.headers.get('user-agent') ?? undefined,
      internalSecret: internalSecret()
    })

    const res = NextResponse.json({ ok: true, userId })
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
