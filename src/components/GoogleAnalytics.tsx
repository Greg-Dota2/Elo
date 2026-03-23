'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const GA_ID = 'G-XWHFK8WLTK'
const AW_ID = 'AW-17155280275'

export default function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Fire a page_view hit on every client-side navigation
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
      ;(window as any).gtag('config', GA_ID, { page_path: url })
    }
  }, [pathname, searchParams])

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer=window.dataLayer||[];
        function gtag(){dataLayer.push(arguments);}
        gtag('js',new Date());
        gtag('config','${GA_ID}');
        gtag('config','${AW_ID}');
      `}</Script>
    </>
  )
}
