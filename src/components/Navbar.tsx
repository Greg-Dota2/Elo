'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap } from 'lucide-react'

const links = [
  { href: '/', label: 'Home' },
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/teams', label: 'Teams' },
  { href: '/players', label: 'Players' },
  { href: '/rankings', label: 'Rankings' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-2xl">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 glow-primary">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display text-base font-bold tracking-[0.06em]">
            DOTA2<span className="text-gradient-primary">PROTIPS</span>
          </p>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  active
                    ? 'text-primary bg-primary/8 border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground border border-transparent',
                ].join(' ')}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
