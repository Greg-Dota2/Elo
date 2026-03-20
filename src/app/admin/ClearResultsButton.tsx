'use client'

import { useState } from 'react'

export default function ClearResultsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleClick() {
    if (!confirm('Clear ALL match results across every tournament? The cron job will re-fill them from PandaScore.')) return
    setStatus('loading')
    const res = await fetch('/api/admin/results/clear', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setStatus('done')
      setMsg('All results cleared')
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
      style={{
        background: 'var(--surface)',
        border: `1px solid ${status === 'done' ? 'var(--correct)' : status === 'error' ? 'var(--wrong)' : 'rgba(239,68,68,0.3)'}`,
      }}
    >
      <div className="text-2xl mb-1">
        {status === 'loading' ? '⏳' : status === 'done' ? '✅' : status === 'error' ? '❌' : '🗑️'}
      </div>
      <div className="font-semibold text-sm" style={{ color: status === 'idle' ? '#f87171' : 'inherit' }}>
        {status === 'loading' ? 'Clearing...' : 'Clear All Results'}
      </div>
      {msg && (
        <div className="text-xs mt-1" style={{ color: status === 'done' ? 'var(--correct)' : 'var(--wrong)' }}>
          {msg}
        </div>
      )}
    </button>
  )
}
