'use client'

import { useState } from 'react'
import { renderWithLinks } from '@/lib/renderLinks'

// ~280 chars fills roughly 3 lines at body font size — avoids DOM geometry queries
const OVERFLOW_THRESHOLD = 280

export default function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const overflows = text.length > OVERFLOW_THRESHOLD

  return (
    <>
      <p className={`text-base leading-7 font-medium text-foreground ${expanded ? '' : 'line-clamp-3'}`}>
        {renderWithLinks(text)}
      </p>
      {overflows && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-xs font-semibold transition-colors hover:text-primary"
          style={{ color: 'hsl(var(--primary) / 0.7)' }}
        >
          {expanded ? '↑ Show less' : '↓ Read more'}
        </button>
      )}
    </>
  )
}
