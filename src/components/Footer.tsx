'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const COLUMNS = {
  en: [
    {
      heading: 'Follow the Scene',
      links: [
        { href: '/tournaments',  label: 'Tournaments' },
        { href: '/rankings',     label: 'ELO Rankings' },
        { href: '/transfers',    label: 'Transfers' },
        { href: '/track-record', label: 'Track Record' },
      ],
    },
    {
      heading: 'Explore the Game',
      links: [
        { href: '/heroes', label: 'Heroes' },
        { href: '/items',  label: 'Items' },
        { href: '/teams',  label: 'Teams' },
        { href: '/players', label: 'Players' },
      ],
    },
    {
      heading: 'More',
      links: [
        { href: '/blog',         label: 'Blog' },
        { href: '/about',        label: 'About Me' },
        { href: '/contact',      label: 'Contact' },
        { href: '/terms-of-use', label: 'Terms of Use' },
      ],
    },
  ],
  ru: [
    {
      heading: 'Сцена',
      links: [
        { href: '/ru/tournaments',  label: 'Турниры' },
        { href: '/ru/rankings',     label: 'ELO Рейтинг' },
        { href: '/ru/transfers',    label: 'Трансферы' },
        { href: '/ru/track-record', label: 'Статистика' },
      ],
    },
    {
      heading: 'Игра',
      links: [
        { href: '/ru/heroes',  label: 'Герои' },
        { href: '/ru/items',   label: 'Предметы' },
        { href: '/ru/teams',   label: 'Команды' },
        { href: '/ru/players', label: 'Игроки' },
      ],
    },
    {
      heading: 'Прочее',
      links: [
        { href: '/ru/blog',         label: 'Блог' },
        { href: '/ru/about',        label: 'Обо мне' },
        { href: '/ru/contact',      label: 'Связаться' },
        { href: '/ru/terms-of-use', label: 'Условия' },
      ],
    },
  ],
}

const TAGLINE = {
  en: "No backdating. No excuses. Just my picks — win or lose, it's all here.",
  ru: 'Без задних чисел. Без отговорок. Только мои прогнозы — победы и поражения, всё здесь.',
}

const COPYRIGHT = {
  en: '© 2026 Dota2ProTips. All rights reserved.',
  ru: '© 2026 Dota2ProTips. Все права защищены.',
}

export default function Footer() {
  const pathname = usePathname()
  const isRu = pathname.startsWith('/ru')
  const locale = isRu ? 'ru' : 'en'
  const columns = COLUMNS[locale]

  return (
    <footer className="mt-20 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 py-14">

        {/* Main grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">

          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <p className="font-display text-xl font-bold tracking-[0.06em] mb-3">
              DOTA2<span className="text-gradient-primary">PROTIPS</span>
            </p>
            <p className="text-sm text-muted-foreground leading-6 mb-6 max-w-[220px]">
              {TAGLINE[locale]}
            </p>
            <div className="flex items-center gap-2">
              <a href="https://x.com/Dota2ProTips" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70"
                style={{ background: 'hsl(var(--secondary))', color: 'var(--text-muted)' }}
                aria-label="X (Twitter)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://www.facebook.com/Dota2ProTips" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70"
                style={{ background: 'hsl(var(--secondary))', color: 'var(--text-muted)' }}
                aria-label="Facebook"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="https://t.me/dota2protips" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70"
                style={{ background: 'hsl(var(--secondary))', color: 'var(--text-muted)' }}
                aria-label="Telegram"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.167l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.392z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {columns.map(col => (
            <div key={col.heading}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border/40">
          <p className="text-xs text-muted-foreground/40">{COPYRIGHT[locale]}</p>
        </div>
      </div>
    </footer>
  )
}
