'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useState, useEffect } from 'react'

const links = [
  { href: '/', label: 'Home' },
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/teams', label: 'Teams' },
  { href: '/players', label: 'Players' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/blog', label: 'Blog' },
]

export default function Navbar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-2xl">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-20">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image src="/1.png" alt="Dota2ProTips" width={44} height={44} className="rounded-lg" />
          <p className="font-display text-xl font-bold tracking-[0.06em]">
            DOTA2<span className="text-gradient-primary">PROTIPS</span>
          </p>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'px-4 py-2 rounded-xl text-base font-semibold transition-all duration-200',
                  active
                    ? 'text-primary bg-primary/8 border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground border border-transparent',
                ].join(' ')}
              >
                {link.label}
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className="ml-2 px-4 py-2 rounded-xl text-base font-semibold transition-all duration-200 border"
              style={{ borderColor: 'hsl(var(--primary) / 0.4)', color: 'hsl(var(--primary))' }}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Hamburger button — mobile only */}
        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-xl gap-1.5 transition-colors"
          style={{ background: open ? 'hsl(var(--secondary))' : 'transparent' }}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5 rounded-full transition-all duration-300" style={{ background: 'var(--text)', transform: open ? 'translateY(8px) rotate(45deg)' : 'none' }} />
          <span className="block w-5 h-0.5 rounded-full transition-all duration-300" style={{ background: 'var(--text)', opacity: open ? 0 : 1 }} />
          <span className="block w-5 h-0.5 rounded-full transition-all duration-300" style={{ background: 'var(--text)', transform: open ? 'translateY(-8px) rotate(-45deg)' : 'none' }} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden border-t"
          style={{ background: 'hsl(var(--background) / 0.97)', borderColor: 'var(--border)' }}
        >
          <nav className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-1">
            {links.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    'px-4 py-3 rounded-xl text-base font-semibold transition-all duration-200',
                    active
                      ? 'text-primary bg-primary/8 border border-primary/20'
                      : 'text-muted-foreground border border-transparent',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              )
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className="mt-2 px-4 py-3 rounded-xl text-base font-semibold border"
                style={{ borderColor: 'hsl(var(--primary) / 0.4)', color: 'hsl(var(--primary))' }}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
