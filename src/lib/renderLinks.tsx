import Link from 'next/link'

const RU_SUPPORTED = ['/tournaments', '/blog', '/heroes', '/items', '/teams', '/players', '/about', '/terms-of-use']

function localizeHref(href: string, locale?: 'en' | 'ru'): string {
  if (locale !== 'ru' || !href.startsWith('/')) return href
  if (href.startsWith('/ru')) return href
  const supported = RU_SUPPORTED.some(p => href === p || href.startsWith(p + '/'))
  return supported ? `/ru${href}` : href
}

export function renderWithLinks(text: string, locale?: 'en' | 'ru') {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (!m) return part
    const [, label, rawHref] = m
    const href = localizeHref(rawHref, locale)
    if (href.startsWith('/')) {
      return (
        <Link key={i} href={href} className="underline underline-offset-2 transition-colors hover:opacity-80" style={{ color: 'hsl(var(--primary))' }}>
          {label}
        </Link>
      )
    }
    return (
      <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:opacity-80" style={{ color: 'hsl(var(--primary))' }}>
        {label}
      </a>
    )
  })
}
