'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

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
      </div>
    </header>
  )
}
