'use client'

import { useState } from 'react'

export default function SyncResultsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [log, setLog] = useState<string[]>([])

  async function handleClick() {
    setStatus('loading')
    setMsg('')
    setLog([])

    const res = await fetch('/api/admin/results/sync', { method: 'POST' })
    const data = await res.json()

    if (res.ok) {
      setStatus('done')
      setMsg(`${data.updated} result${data.updated !== 1 ? 's' : ''} updated`)
      setLog(data.log ?? [])
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
          {status === 'loading' ? '⏳' : status === 'done' ? '✅' : status === 'error' ? '❌' : '🎯'}
        </div>
        <div className="font-semibold text-sm">
          {status === 'loading' ? 'Syncing...' : 'Sync Results'}
        </div>
        {msg && (
          <div className="text-xs mt-1" style={{ color: status === 'done' ? 'var(--correct)' : 'var(--wrong)' }}>
            {msg}
          </div>
        )}
      </button>

      {log.length > 0 && (
        <div
          className="mt-2 rounded-lg p-3 text-xs font-mono space-y-0.5 max-h-48 overflow-y-auto"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          {log.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
    </div>
  )
}
