'use client'

import { useState } from 'react'
import type React from 'react'

interface Props {
  picks: React.ReactNode
  bracket: React.ReactNode
}

export default function TournamentTabsClient({ picks, bracket }: Props) {
  const [tab, setTab] = useState<'picks' | 'bracket'>('picks')

  const tabBtn = (id: 'picks' | 'bracket', label: string) => (
    <button
      onClick={() => setTab(id)}
      className="px-5 py-2 rounded-full text-sm font-semibold transition-colors"
      style={
        tab === id
          ? { background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }
          : { background: 'hsl(var(--secondary) / 0.6)', color: 'hsl(var(--muted-foreground))' }
      }
    >
      {label}
    </button>
  )

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        {tabBtn('picks', '📋 Picks')}
        {tabBtn('bracket', '🏆 Bracket')}
      </div>
      <div style={{ display: tab === 'picks' ? 'block' : 'none' }}>{picks}</div>
      <div style={{ display: tab === 'bracket' ? 'block' : 'none' }}>{bracket}</div>
    </>
  )
}
