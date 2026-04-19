'use client'

import { useState } from 'react'
import Link from 'next/link'

// Parses inline Markdown links: [text](url) → <Link> or <a>
function renderWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (!m) return part
    const [, label, href] = m
    const isInternal = href.startsWith('/')
    if (isInternal) {
      return (
        <Link key={i} href={href} className="underline underline-offset-2 hover:text-primary transition-colors" style={{ color: 'hsl(var(--primary))' }}>
          {label}
        </Link>
      )
    }
    return (
      <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary transition-colors" style={{ color: 'hsl(var(--primary))' }}>
        {label}
      </a>
    )
  })
}

export default function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const hasLinks = /\[[^\]]+\]\([^)]+\)/.test(text)
  const needsClamp = !hasLinks // line-clamp breaks mid-link so disable it when links are present

  return (
    <>
      <p className={`text-base leading-7 font-medium text-foreground ${expanded || !needsClamp ? '' : 'line-clamp-3'}`}>
        {renderWithLinks(text)}
      </p>
      <button
        onClick={() => setExpanded(e => !e)}
        className="mt-2 text-xs font-semibold transition-colors hover:text-primary"
        style={{ color: 'hsl(var(--primary) / 0.7)' }}
      >
        {expanded ? '↑ Show less' : '↓ Read more'}
      </button>
    </>
  )
}
