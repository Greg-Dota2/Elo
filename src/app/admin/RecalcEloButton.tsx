'use client'

import { useState } from 'react'

export default function RecalcEloButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleClick() {
    setStatus('loading')
    setMsg('')
    const res = await fetch('/api/elo/recalculate', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setStatus('done')
      setMsg(`${data.processed} matches · ${data.teams} teams`)
    } else {
      setStatus('error')
      setMsg(data.error ?? 'Failed')
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className="rounded-lg p-4 text-center transition-colors disabled:opacity-50 w-full"
      style={{ background: 'var(--surface)', border: `1px solid ${status === 'done' ? 'var(--correct)' : status === 'error' ? 'var(--wrong)' : 'var(--border)'}` }}
    >
      <div className="text-2xl mb-1">
        {status === 'loading' ? '⏳' : status === 'done' ? '✅' : status === 'error' ? '❌' : '📊'}
      </div>
      <div className="font-semibold text-sm">
        {status === 'loading' ? 'Calculating...' : 'Recalculate ELO'}
      </div>
      {msg && (
        <div className="text-xs mt-1" style={{ color: status === 'done' ? 'var(--correct)' : 'var(--wrong)' }}>
          {msg}
        </div>
      )}
    </button>
  )
}
