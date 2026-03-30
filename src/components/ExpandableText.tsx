'use client'

import { useState } from 'react'

export default function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <p className={`text-base leading-7 font-medium text-foreground ${expanded ? '' : 'line-clamp-3'}`}>
        {text}
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
