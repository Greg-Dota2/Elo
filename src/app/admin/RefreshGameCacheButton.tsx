'use client'

import { useState } from 'react'

export default function RefreshGameCacheButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleClick() {
    setStatus('loading')
    setMsg('')

    const res = await fetch('/api/admin/game-cache/refresh', { method: 'POST' })
    const data = await res.json()

    if (res.ok) {
      setStatus('done')
      setMsg(`${data.heroes} heroes · ${data.items} items`)
    } else {
      setStatus('error')
      setMsg(data.error ?? 'Failed')
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="rounded-lg p-4 text-center transition-colors disabled:opacity-50 w-full"
        style={{
          background: 'var(--surface)',
          border: `1px solid ${status === 'done' ? 'var(--correct)' : status === 'error' ? 'var(--wrong)' : 'var(--border)'}`,
        }}
      >
        <div className="text-2xl mb-1">
          {status === 'loading' ? '⏳' : status === 'done' ? '✅' : status === 'error' ? '❌' : '🗄️'}
        </div>
        <div className="font-semibold text-sm">
          {status === 'loading' ? 'Refreshing...' : 'Refresh Game Cache'}
        </div>
        {msg && (
          <div className="text-xs mt-1" style={{ color: status === 'done' ? 'var(--correct)' : 'var(--wrong)' }}>
            {msg}
          </div>
        )}
      </button>
    </div>
  )
}
