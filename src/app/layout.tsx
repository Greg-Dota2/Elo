import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

const SITE_URL = 'https://dota2protips.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Dota2ProTips — Tier 1 Dota 2 Match Predictions',
    template: '%s | Dota2ProTips',
  },
  description:
    'Free pre-match analysis and winner predictions for every Tier 1 Dota 2 tournament. Accuracy tracked, every pick visible.',
  keywords: ['Dota 2 predictions', 'Dota 2 match analysis', 'Tier 1 Dota 2', 'Dota 2 esports', 'match predictions', 'ELO rankings'],
  authors: [{ name: 'Greg', url: SITE_URL }],
  creator: 'Greg',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Dota2ProTips',
    title: 'Dota2ProTips — Tier 1 Dota 2 Match Predictions',
    description: 'Free pre-match analysis and winner predictions for every Tier 1 Dota 2 tournament. Accuracy tracked, every pick visible.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dota2ProTips — Tier 1 Dota 2 Match Predictions',
    description: 'Free pre-match analysis and winner predictions for every Tier 1 Dota 2 tournament.',
    creator: '@dota2protips',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: SITE_URL },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        <footer className="text-center py-8 mt-16 border-t border-border/50 text-xs font-bold tracking-[0.12em] uppercase text-muted-foreground/50">
          Dota2ProTips · Tier 1 Only · by Greg
        </footer>
      </body>
    </html>
  )
}
