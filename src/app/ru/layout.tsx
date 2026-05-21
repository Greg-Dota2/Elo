import type { Metadata } from 'next'

export const metadata: Metadata = {
  openGraph: {
    locale: 'ru_RU',
    alternateLocale: ['en_US'],
    siteName: 'Dota2ProTips',
  },
}

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Dota2ProTips',
    url: 'https://www.dota2protips.com/ru',
    inLanguage: 'ru',
    description: 'Экспертные прогнозы на матчи Dota 2 Tier 1 — написанные до драфта, публично отслеживаемые, с честным разбором после каждого матча. ~70% точность.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.dota2protips.com/ru/players?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Dota2ProTips',
    url: 'https://www.dota2protips.com',
    logo: 'https://www.dota2protips.com/1.png',
    sameAs: [
      'https://x.com/Dota2ProTips',
      'https://www.facebook.com/Dota2ProTips',
      'https://t.me/dota2protips',
    ],
  },
]

export default function RuLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Set html lang before React hydration */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.lang='ru'" }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
