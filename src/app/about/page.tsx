import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Me',
  description: 'Greg Spencer — Dota 2 enthusiast, ex semi-pro, and the person behind every pick on Dota2ProTips.',
  openGraph: {
    title: 'About Me | Dota2ProTips',
    description: 'Greg Spencer — Dota 2 enthusiast, ex semi-pro, and the person behind every pick on Dota2ProTips.',
    url: '/about',
  },
  twitter: {
    card: 'summary',
    title: 'About Me | Dota2ProTips',
    description: 'Greg Spencer — Dota 2 enthusiast, ex semi-pro, and the person behind every pick on Dota2ProTips.',
  },
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <div className="fade-in-up max-w-2xl mx-auto py-8">
      <p className="section-label mb-3">The person behind the picks</p>
      <h1 className="font-display text-4xl font-black tracking-tight mb-8">About Me</h1>

      <div
        className="rounded-2xl p-7 mb-6 text-base leading-8 space-y-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <p>
          I am Greg and I am a Dota 2 enthusiast, just like you. I love the game and more than that —{' '}
          <span className="font-semibold" style={{ color: 'var(--text)' }}>I LOVE to watch the pro games.</span>{' '}
          Don&apos;t ask me why, I just do.
        </p>
        <p>
          I also played Dota semi-pro. Back in the day I had a high MMR — 6k — which was serious
          at the time (the highest was W33 with 8k, so don&apos;t laugh).
        </p>
        <p>
          Now I&apos;m older, meaning I have a family, so playing is out of the picture. But watching?
          Guys, I watch <span className="font-semibold" style={{ color: 'var(--text)' }}>everything.</span>{' '}
          I consider myself something of an expert on pro Dota — I know every team and every player.
        </p>
        <p>
          In the end, I hope to create some memories with you and build the best Dota 2 content out there.
        </p>
      </div>

      <div
        className="rounded-2xl px-7 py-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Join the discussion</p>
        <div className="flex flex-col gap-3">
          {/* Facebook */}
          <a
            href="https://www.facebook.com/Dota2ProTips"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 transition-opacity hover:opacity-70"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2" className="shrink-0">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="text-sm font-medium" style={{ color: '#1877F2' }}>facebook.com/Dota2ProTips</span>
          </a>
          {/* X / Twitter */}
          <a
            href="https://x.com/Dota2ProTips"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 transition-opacity hover:opacity-70"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" style={{ color: 'var(--text)' }}>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>x.com/Dota2ProTips</span>
          </a>
          {/* Telegram */}
          <a
            href="https://t.me/dota2protips"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 transition-opacity hover:opacity-70"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#229ED9" className="shrink-0">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.167l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.392z"/>
            </svg>
            <span className="text-sm font-medium" style={{ color: '#229ED9' }}>t.me/dota2protips</span>
          </a>
        </div>
      </div>
    </div>
  )
}
