'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useState, useEffect } from 'react'

const RU_SUPPORTED = ['/tournaments', '/blog', '/heroes', '/items', '/teams', '/players', '/about', '/contact', '/terms-of-use', '/rankings', '/transfers', '/track-record']

function getLangUrl(pathname: string, lang: 'en' | 'ru'): string {
  const isRu = pathname.startsWith('/ru')
  if (lang === 'ru') {
    if (isRu) return pathname
    if (pathname === '/') return '/ru'
    const supported = RU_SUPPORTED.some(p => pathname.startsWith(p))
    return supported ? `/ru${pathname}` : '/ru/tournaments'
  } else {
    if (!isRu) return pathname
    const stripped = pathname.slice(3) || '/'
    if (stripped === '/') return '/'
    const supported = RU_SUPPORTED.some(p => stripped.startsWith(p))
    return supported ? stripped : '/tournaments'
  }
}

const links = [
  { href: '/',            label: 'Home',        labelRu: 'Главная' },
  { href: '/tournaments', label: 'Tournaments',  labelRu: 'Турниры' },
  { href: '/teams',       label: 'Teams',        labelRu: 'Команды' },
  { href: '/players',     label: 'Players',      labelRu: 'Игроки' },
  { href: '/heroes',      label: 'Heroes',       labelRu: 'Герои' },
  { href: '/items',       label: 'Items',        labelRu: 'Предметы' },
  { href: '/rankings',    label: 'Rankings',     labelRu: 'Рейтинг' },
]

function getNavHref(href: string, isRu: boolean): string {
  if (!isRu) return href
  if (href === '/') return '/ru'
  return RU_SUPPORTED.some(p => href.startsWith(p)) ? `/ru${href}` : href
}

function isLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '/ru'
  return pathname.startsWith(href) || pathname.startsWith(`/ru${href}`)
}

function setLocaleCookie(lang: 'en' | 'ru') {
  document.cookie = `locale=${lang}; path=/; max-age=31536000; SameSite=Lax`
}

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

  const isRu = pathname.startsWith('/ru')

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-2xl">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-20">

        {/* Logo */}
        <Link href={isRu ? '/ru' : '/'} className="flex items-center gap-3">
          <Image src="/1.png" alt="Dota2ProTips" width={44} height={44} className="rounded-lg" />
          <p className="font-display text-xl font-bold tracking-[0.06em]">
            DOTA2<span className="text-gradient-primary">PROTIPS</span>
          </p>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {/* Language switcher */}
          <div className="mr-2 flex items-center gap-1">
            <a
              href={getLangUrl(pathname, 'en')}
              onClick={() => setLocaleCookie('en')}
              className={['px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 border', !isRu ? 'text-blue-300 bg-blue-500/25 border-blue-400/50 shadow-[0_0_8px_rgba(96,165,250,0.2)]' : 'text-blue-400/50 bg-blue-500/8 border-blue-400/20 hover:text-blue-300 hover:bg-blue-500/20 hover:border-blue-400/40'].join(' ')}
            >
              EN
            </a>
            <a
              href={getLangUrl(pathname, 'ru')}
              onClick={() => setLocaleCookie('ru')}
              className={['px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 border', isRu ? 'text-red-300 bg-red-500/25 border-red-400/50 shadow-[0_0_8px_rgba(248,113,113,0.2)]' : 'text-red-400/50 bg-red-500/8 border-red-400/20 hover:text-red-300 hover:bg-red-500/20 hover:border-red-400/40'].join(' ')}
            >
              RU
            </a>
          </div>
          {links.filter(l => l.href !== '/').map((link) => {
            const active = isLinkActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={getNavHref(link.href, isRu)}
                className={[
                  'px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
                  active
                    ? 'text-primary bg-primary/8 border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground border border-transparent',
                ].join(' ')}
              >
                {isRu ? link.labelRu : link.label}
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              href="/admin" rel="nofollow"
              className="ml-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border"
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
            {/* Language switcher — mobile */}
            <div className="flex items-center gap-2 px-1 mb-1">
              <a
                href={getLangUrl(pathname, 'en')}
                onClick={() => setLocaleCookie('en')}
                className={['px-5 py-2.5 rounded-lg text-sm font-bold tracking-wider transition-all duration-200 border', !isRu ? 'text-blue-300 bg-blue-500/25 border-blue-400/50 shadow-[0_0_10px_rgba(96,165,250,0.2)]' : 'text-blue-400/50 bg-blue-500/8 border-blue-400/20'].join(' ')}
              >
                EN
              </a>
              <a
                href={getLangUrl(pathname, 'ru')}
                onClick={() => setLocaleCookie('ru')}
                className={['px-5 py-2.5 rounded-lg text-sm font-bold tracking-wider transition-all duration-200 border', isRu ? 'text-red-300 bg-red-500/25 border-red-400/50 shadow-[0_0_10px_rgba(248,113,113,0.2)]' : 'text-red-400/50 bg-red-500/8 border-red-400/20'].join(' ')}
              >
                RU
              </a>
            </div>
            {links.map((link) => {
              const active = isLinkActive(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={getNavHref(link.href, isRu)}
                  className={[
                    'px-4 py-3 rounded-xl text-base font-semibold transition-all duration-200',
                    active
                      ? 'text-primary bg-primary/8 border border-primary/20'
                      : 'text-muted-foreground border border-transparent',
                  ].join(' ')}
                >
                  {isRu ? link.labelRu : link.label}
                </Link>
              )
            })}
            {isAdmin && (
              <Link
                href="/admin" rel="nofollow"
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
