'use client'

import { useState } from 'react'
import type React from 'react'

interface Props {
  picks: React.ReactNode
  bracket: React.ReactNode
}

const IconSwords = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
    <line x1="13" y1="19" x2="19" y2="13"/>
    <line x1="16" y1="16" x2="20" y2="20"/>
    <line x1="19" y1="21" x2="21" y2="19"/>
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/>
    <line x1="5" y1="14" x2="9" y2="18"/>
    <line x1="7" y1="21" x2="9" y2="19"/>
  </svg>
)

const IconBracket = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="6" height="4" rx="1"/>
    <rect x="2" y="10" width="6" height="4" rx="1"/>
    <rect x="2" y="17" width="6" height="4" rx="1"/>
    <line x1="8" y1="5" x2="13" y2="5"/>
    <line x1="8" y1="12" x2="13" y2="12"/>
    <line x1="13" y1="5" x2="13" y2="19"/>
    <line x1="13" y1="19" x2="8" y2="19"/>
    <rect x="14" y="8" width="6" height="4" rx="1"/>
    <line x1="13" y1="10" x2="14" y2="10"/>
  </svg>
)

export default function TournamentTabsClient({ picks, bracket }: Props) {
  const [tab, setTab] = useState<'picks' | 'bracket'>('picks')

  const tabBtn = (id: 'picks' | 'bracket', label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setTab(id)}
      className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors"
      style={
        tab === id
          ? { background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }
          : { background: 'hsl(var(--secondary) / 0.6)', color: 'hsl(var(--muted-foreground))' }
      }
    >
      {icon}
      {label}
    </button>
  )

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        {tabBtn('picks', 'My Picks', <IconSwords />)}
        {tabBtn('bracket', 'Group Stage & Playoffs', <IconBracket />)}
      </div>
      <div style={{ display: tab === 'picks' ? 'block' : 'none' }}>{picks}</div>
      <div style={{ display: tab === 'bracket' ? 'block' : 'none' }}>{bracket}</div>
    </>
  )
}
