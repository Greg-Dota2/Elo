'use client'

import { useState, useRef, useEffect } from 'react'
import { renderWithLinks } from '@/lib/renderLinks'

export default function ExpandableText({ text, locale }: { text: string; locale?: 'en' | 'ru' }) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const pRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = pRef.current
    if (!el) return
    setOverflows(el.scrollHeight > el.clientHeight + 2)
  }, [text])

  return (
    <>
      <p
        ref={pRef}
        className={`text-base leading-7 font-medium text-foreground ${expanded ? '' : 'line-clamp-3'}`}
      >
        {renderWithLinks(text, locale)}
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
