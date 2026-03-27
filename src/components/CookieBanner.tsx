'use client'

import { useState } from 'react'
import Link from 'next/link'

function setConsentCookie(value: string) {
  // 1 year, SameSite=Lax, no Secure needed (works on both http/https)
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `cookie_consent=${value}; expires=${expires}; path=/; SameSite=Lax`
  localStorage.setItem('cookie_consent', value)
}

export default function CookieBanner({ initialConsent }: { initialConsent: string | null }) {
  const [visible, setVisible] = useState(!initialConsent)

  function accept() {
    setConsentCookie('accepted')
    setVisible(false)
  }

  function decline() {
    setConsentCookie('declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="max-w-3xl mx-auto rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          pointerEvents: 'all',
        }}
      >
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1">This site uses cookies</p>
          <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
            We use essential cookies to keep the site working. No tracking or advertising cookies are used.{' '}
            <Link href="/terms-of-use" className="underline hover:opacity-70 transition-opacity">
              Learn more about our cookie policy
            </Link>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
