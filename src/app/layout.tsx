import type { Metadata } from 'next'
import { Manrope, Oxanium } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import CookieBanner from '@/components/CookieBanner'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { Suspense } from 'react'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-oxanium',
  display: 'swap',
})

const SITE_URL = 'https://dota2protips.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: { icon: '/1.png', apple: '/1.png' },
  title: {
    default: 'Dota2ProTips — Dota 2 Match Predictions',
    template: '%s | Dota2ProTips',
  },
  description:
    'Expert Dota 2 match predictions for Tier 1 pro tournaments — pre-match analysis, ELO rankings, and accuracy tracked across every pick. See who wins before they play.',
  keywords: [
    'Dota 2 predictions', 'Dota 2 match analysis', 'Dota 2 esports',
    'match predictions', 'ELO rankings', 'Dota 2 tips', 'pro Dota 2', 'Dota 2 winner',
    'Dota 2 betting analysis', 'Dota 2 tournament predictions', 'dota2protips',
  ],
  authors: [{ name: 'Greg Spencer', url: SITE_URL }],
  creator: 'Greg Spencer',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Dota2ProTips',
    title: 'Dota2ProTips — Dota 2 Match Predictions',
    description: 'Expert Dota 2 match predictions for Tier 1 pro tournaments — pre-match analysis, ELO rankings, and accuracy tracked across every pick.',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: 'Dota2ProTips — Dota 2 Match Predictions' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dota2ProTips — Dota 2 Match Predictions',
    description: 'Expert Dota 2 match predictions for Tier 1 pro tournaments — pre-match analysis, ELO rankings, accuracy tracked.',
    creator: '@dota2protips',
    images: [`${SITE_URL}/og.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: SITE_URL },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('admin_token')?.value === process.env.ADMIN_PASSWORD
  const cookieConsent = cookieStore.get('cookie_consent')?.value ?? null

  return (
    <html lang="en" className={`dark ${manrope.variable} ${oxanium.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'Dota2ProTips',
                url: SITE_URL,
                description: 'Expert Dota 2 match predictions for Tier 1 pro tournaments — pre-match analysis, ELO rankings, and accuracy tracked across every pick.',
                potentialAction: {
                  '@type': 'SearchAction',
                  target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/players?q={search_term_string}` },
                  'query-input': 'required name=search_term_string',
                },
              },
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Dota2ProTips',
                url: SITE_URL,
                logo: `${SITE_URL}/1.png`,
                sameAs: [
                  'https://x.com/Dota2ProTips',
                  'https://www.facebook.com/Dota2ProTips',
                  'https://t.me/dota2protips',
                ],
              },
            ]),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Suspense fallback={null}><GoogleAnalytics /></Suspense>
        <Navbar isAdmin={isAdmin} />
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        <Analytics />
        <CookieBanner initialConsent={cookieConsent} />
        <footer className="mt-20 border-t border-border/50">
          <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col gap-10 sm:flex-row sm:justify-between">
            {/* Left: brand + tagline + socials */}
            <div>
              <p className="font-display text-xl font-bold tracking-[0.06em] mb-3">
                DOTA2<span className="text-gradient-primary">PROTIPS</span>
              </p>
              <p className="text-base text-muted-foreground max-w-xs leading-7 mb-5">
                No backdating. No excuses. Just my picks — win or lose, it&apos;s all here.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3">
                {/* X / Twitter */}
                <a href="https://x.com/Dota2ProTips" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70"
                  style={{ background: 'hsl(var(--secondary))', color: 'var(--text-muted)' }}
                  aria-label="X (Twitter)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                {/* Facebook */}
                <a href="https://www.facebook.com/Dota2ProTips" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70"
                  style={{ background: 'hsl(var(--secondary))', color: 'var(--text-muted)' }}
                  aria-label="Facebook"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                {/* Telegram — add URL when ready */}
                <a href="https://t.me/dota2protips" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70"
                  style={{ background: 'hsl(var(--secondary))', color: 'var(--text-muted)' }}
                  aria-label="Telegram"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.167l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.392z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Right: links + about blurb */}
            <div className="flex flex-col gap-5">
              <nav className="flex flex-wrap gap-4 text-base font-semibold text-muted-foreground">
                <Link href="/tournaments" className="hover:text-foreground transition-colors">Tournaments</Link>
                <Link href="/rankings" className="hover:text-foreground transition-colors">Rankings</Link>
                <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
                <Link href="/about" className="hover:text-foreground transition-colors">About Me</Link>
                <Link href="/terms-of-use" className="hover:text-foreground transition-colors">Terms of Use</Link>
              </nav>
<p className="text-sm text-muted-foreground/40 sm:text-right">
                © 2026 Dota2ProTips. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
