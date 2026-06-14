import type { Metadata } from 'next'
import ContactForm from '@/components/ContactForm'

export const metadata: Metadata = {
  title: 'Contact Greg — Dota2ProTips',
  description: 'Got a Dota insight, found a mistake, or just want to say hi? Drop me a message — I read everything.',
  alternates: {
    canonical: '/contact',
    languages: { 'x-default': '/contact', en: '/contact', ru: '/ru/contact' },
  },
  openGraph: {
    title: 'Contact Greg — Dota2ProTips',
    description: 'Got a Dota insight, found a mistake, or just want to say hi? Drop me a message.',
    url: '/contact',
    images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }],
  },
}

export default function ContactPage() {
  return (
    <div className="fade-in-up max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <p className="section-label mb-2">Get in touch</p>
        <h1 className="text-3xl font-black tracking-tight mb-1">Contact Me</h1>
      </div>

      <div
        className="rounded-2xl p-7 mb-8 text-sm leading-7 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <p>
          I run this site alone — every pick, every ranking, every write-up. Which means I also read every
          message that comes in. So if you have something to say, I will actually see it.
        </p>
        <p>
          Maybe you spotted a mistake in one of my predictions. Maybe you follow a team I&apos;ve been
          sleeping on and you want to make sure I know about it. Maybe you have some inside scoop on a
          roster move before it goes public.{' '}
          <span className="font-semibold" style={{ color: 'var(--text)' }}>That stuff is gold to me.</span>{' '}
          Send it.
        </p>
        <p>
          Or maybe you just want to argue about a draft I called wrong. That&apos;s fine too.
          I can take it.
        </p>
      </div>

      <div
        className="rounded-2xl p-7"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <ContactForm locale="en" />
      </div>
    </div>
  )
}
