import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Me',
  description: 'Greg Spencer — Dota 2 enthusiast, ex semi-pro, and the person behind every pick on Dota2ProTips.',
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
        className="rounded-2xl px-7 py-5 flex items-center gap-4"
        style={{ background: 'hsl(220 100% 55% / 0.08)', border: '1px solid hsl(220 100% 55% / 0.2)' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#1877F2" className="shrink-0">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Join the discussion</p>
          <a
            href="https://www.facebook.com/Dota2Protips"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: '#1877F2' }}
          >
            facebook.com/Dota2Protips →
          </a>
        </div>
      </div>
    </div>
  )
}
