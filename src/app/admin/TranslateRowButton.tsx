'use client'

import { useState } from 'react'

interface Props {
  type: 'player' | 'team'
  id: string
  hasContent: boolean
}

export default function TranslateRowButton({ type, id, hasContent }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  if (!hasContent) return null

  async function handleClick() {
    setStatus('loading')
    const body = type === 'player' ? { type: 'player', player_id: id } : { type: 'team', team_id: id }
    const res = await fetch('/api/admin/guides/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setStatus(res.ok ? 'done' : 'error')
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className="text-xs px-3 py-1.5 rounded font-medium shrink-0 disabled:opacity-50"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        color: status === 'done' ? 'var(--correct)' : status === 'error' ? 'var(--wrong)' : 'var(--text-muted)',
      }}
    >
      {status === 'loading' ? '⏳' : status === 'done' ? '✅ RU' : status === 'error' ? '❌' : '🌐 RU'}
    </button>
  )
}
