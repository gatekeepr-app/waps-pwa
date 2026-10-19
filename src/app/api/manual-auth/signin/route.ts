export const runtime = 'nodejs'

import { signInBodySchema } from '@/lib/auth-validation'
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
  const parsed = signInBodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Enter a valid email and password.' },
      { status: 400 }
    )

  const { email, password } = parsed.data

  try {
    // Fail as a service configuration error instead of recording an auth
    // attempt when the session bridge is not configured on the deployment.
    const secret = internalSecret()

    let userId: any
    try {
      const result = await client().mutation(api.authManual.verifyCredentials, {
        email,
        password
      })
      userId = result.userId
    } catch (error: any) {
      const message = String(error?.message ?? '')
      if (message.includes('Too many sign-in attempts'))
        return NextResponse.json(
          { error: 'Too many sign-in attempts. Try again later.' },
          { status: 429 }
        )
      if (message.includes('Invalid email or password'))
        return NextResponse.json(
          { error: 'Invalid email or password.' },
          { status: 401 }
        )
      console.error('Manual sign-in verification failed', { message })
      return NextResponse.json(
        { error: 'Sign-in service unavailable. Please try again.' },
        { status: 503 }
      )
    }

    const token = randomBytes(32).toString('base64url')
    const maxAgeDays = 30
    const expiresAt = Date.now() + maxAgeDays * 24 * 60 * 60 * 1000

    await client().mutation(api.authManual.createSession, {
      userId,
      token,
      expiresAt,
      userAgent: req.headers.get('user-agent') ?? undefined,
      internalSecret: secret
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
  } catch (error: any) {
    console.error('Manual sign-in session creation failed', {
      message: String(error?.message ?? '')
    })
    return NextResponse.json(
      { error: 'Sign-in service unavailable. Please try again.' },
      { status: 503 }
    )
  }
}
