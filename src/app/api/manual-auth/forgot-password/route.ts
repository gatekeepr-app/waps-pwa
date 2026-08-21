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

const bodySchema = z.object({
  email: z.string().email().max(254)
})

export async function POST(req: Request) {
  try {
    const { email } = bodySchema.parse(await req.json())

    let user: any = null
    try {
      user = await client().query(api.authManual.getUserByEmail, { email })
    } catch (e: any) {
      console.error('[forgot-password] Convex query error:', e?.message || e)
      return NextResponse.json(
        { ok: false, error: 'Failed to look up user' },
        { status: 500 }
      )
    }

    if (!user) {
      console.log(`[forgot-password] No user found for ${email}`)
      return NextResponse.json({ ok: true })
    }

    const token = randomBytes(32).toString('base64url')
    const expiresAt = Date.now() + 60 * 60 * 1000

    try {
      await client().mutation(api.authManual.createResetToken, {
        email,
        token,
        expiresAt
      })
    } catch (e: any) {
      console.error(
        '[forgot-password] Failed to create reset token:',
        e?.message || e
      )
      return NextResponse.json(
        { ok: false, error: 'Failed to create reset token' },
        { status: 500 }
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const resetUrl = `${siteUrl}/reset-password?token=${token}`

    const resend = new Resend(process.env.RESEND_API_KEY)

    try {
      const result = await resend.emails.send({
        from: process.env.CONTACT_FROM || 'Waps <waps@mail.darvizlabs.online>',
        to: email,
        subject: 'Reset your Waps password',
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 16px;">
            <div style="background:#000;color:#f97316;font-size:20px;font-weight:700;padding:12px 16px;border-radius:6px;display:inline-block;margin-bottom:24px;">
              W
            </div>
            <h1 style="color:#111;font-size:20px;font-weight:700;margin:0 0 8px;">Reset your password</h1>
            <p style="color:#555;font-size:14px;line-height:1.5;margin:0 0 24px;">
              Click the link below to set a new password. This link expires in 1 hour.
            </p>
            <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:6px;">
              Reset password
            </a>
            <p style="color:#999;font-size:12px;line-height:1.5;margin:24px 0 0;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `
      })
      console.log(
        `[forgot-password] Reset email sent to ${email}, id: ${result.data?.id}`
      )
    } catch (e: any) {
      console.error('[forgot-password] Resend error:', e?.message || e)
      return NextResponse.json(
        { ok: false, error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[forgot-password] Error:', e)
    return NextResponse.json(
      { ok: false, error: 'Invalid request' },
      { status: 400 }
    )
  }
}
