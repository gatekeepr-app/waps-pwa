export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { Resend } from 'resend'

let _resend: Resend | null = null
const getResend = () =>
  _resend ?? (_resend = new Resend(process.env.RESEND_API_KEY))

type Payload = {
  name: string
  email: string
  subject?: string
  message: string
  company?: string // honeypot
}

function isValidEmail(s: string) {
  return /^\S+@\S+\.\S+$/.test(s)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload

    // Honeypot: if filled, treat as spam
    if (body.company && body.company.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }
    if (!isValidEmail(body.email)) {
      return NextResponse.json({ error: 'Invalid email.' }, { status: 400 })
    }

    const to = process.env.CONTACT_TO
    const from = process.env.CONTACT_FROM
    if (!to || !from) {
      return NextResponse.json(
        { error: 'Contact email is not configured (CONTACT_TO/CONTACT_FROM).' },
        { status: 500 }
      )
    }

    const subject = body.subject?.trim() || `New enquiry from ${body.name}`
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
        <h2>New enquiry</h2>
        <p><b>Name:</b> ${escapeHtml(body.name)}</p>
        <p><b>Email:</b> ${escapeHtml(body.email)}</p>
        ${body.subject ? `<p><b>Subject:</b> ${escapeHtml(body.subject)}</p>` : ''}
        <p><b>Message:</b></p>
        <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">${escapeHtml(body.message)}</pre>
      </div>
    `

    await getResend().emails.send({
      from,
      to,
      subject,
      replyTo: body.email,
      html
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Send failed' },
      { status: 500 }
    )
  }
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
