import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { name, email, subject, message } = body
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const cleanName    = name.trim().slice(0, 120)
  const cleanEmail   = email.trim().slice(0, 254)
  const cleanSubject = subject?.trim().slice(0, 200) ?? null
  const cleanMessage = message.trim().slice(0, 3000)

  // Save to Supabase
  const supabase = createAdminClient()
  const { error: dbError } = await supabase.from('contact_messages').insert({
    name: cleanName,
    email: cleanEmail,
    subject: cleanSubject,
    message: cleanMessage,
  })

  if (dbError) {
    console.error('contact insert error:', dbError.message)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  // Send email notification
  const resendKey = process.env.RESEND_API_KEY
  const toEmail   = process.env.CONTACT_EMAIL
  if (resendKey && toEmail) {
    try {
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: 'Dota2ProTips Contact <noreply@dota2protips.com>',
        to: toEmail,
        replyTo: cleanEmail,
        subject: `[Contact] ${cleanSubject ?? 'New message'} — ${cleanName}`,
        text: [
          `From: ${cleanName} <${cleanEmail}>`,
          `Subject: ${cleanSubject ?? '—'}`,
          '',
          cleanMessage,
        ].join('\n'),
      })
    } catch (err) {
      console.error('resend error:', err)
      // Don't fail the request — message is already saved to DB
    }
  }

  return NextResponse.json({ ok: true })
}
