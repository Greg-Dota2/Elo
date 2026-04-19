import Link from 'next/link'

export function renderWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (!m) return part
    const [, label, href] = m
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
