import type { Metadata } from 'next'
import { Manrope, Oxanium } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import CookieBanner from '@/components/CookieBanner'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import { Analytics } from '@vercel/analytics/next'
import Footer from '@/components/Footer'
import { Suspense } from 'react'
import { cookies, headers } from 'next/headers'

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

const SITE_URL = 'https://www.dota2protips.com'

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
  const adminPwd = process.env.ADMIN_PASSWORD
  const isAdmin = !!adminPwd && cookieStore.get('admin_token')?.value === adminPwd
  const headersList = await headers()
  const locale = headersList.get('x-locale') ?? 'en'
  return (
    <html lang={locale} className={`dark ${manrope.variable} ${oxanium.variable}`}>
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
                inLanguage: 'en',
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
        <CookieBanner />
        <Footer />
      </body>
    </html>
  )
}
