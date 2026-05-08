export const runtime = 'nodejs'

import { ConvexHttpClient } from 'convex/browser'
import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { api } from '../../../../../convex/_generated/api'

let _client: ConvexHttpClient | null = null
const client = () =>
  _client ??
  (_client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!))

let _resend: Resend | null = null
const getResend = () =>
  _resend ?? (_resend = new Resend(process.env.RESEND_API_KEY))

const bodySchema = z.object({
  email: z.string().email().max(254)
})

export async function POST(req: Request) {
  try {
    const { email } = bodySchema.parse(await req.json())

    const user = await client().query(api.authManual.getUserByEmail, { email })
    if (!user) {
      return NextResponse.json({ ok: true })
    }

    const token = randomBytes(32).toString('base64url')
    const expiresAt = Date.now() + 60 * 60 * 1000

    await client().mutation(api.authManual.createResetToken, {
      email,
      token,
      expiresAt
    })

    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=${token}`
    const from = process.env.CONTACT_FROM || 'Waps <noreply@waps.app>'

    await getResend().emails.send({
      from,
      to: email,
      subject: 'Reset your Waps password',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;">
          <h2>Reset your password</h2>
          <p>Click the link below to reset your Waps password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#FF6B57,#FF8F69);color:white;text-decoration:none;border-radius:12px;margin:16px 0;">
            Reset password
          </a>
          <p style="color:#666;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Failed to send reset email' },
      { status: 400 }
    )
  }
}
