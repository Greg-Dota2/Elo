'use client'

import { useState } from 'react'

interface Props {
  type: 'all-heroes' | 'all-items' | 'all-items-lore' | 'all-players' | 'all-teams' | 'all-transfers'
  label: string
  emoji: string
}

export default function TranslateGuidesButton({ type, label, emoji }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleClick() {
    setStatus('loading')
    setMsg('')
    const res = await fetch('/api/admin/guides/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    const data = await res.json()
    if (res.ok) {
      setStatus('done')
      setMsg(data.translated === 0 ? 'All up to date' : `${data.translated}/${data.total} translated`)
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
        border: `1px solid ${status === 'done' ? 'var(--correct)' : status === 'error' ? 'var(--wrong)' : 'var(--border)'}`,
      }}
    >
      <div className="text-2xl mb-1">
        {status === 'loading' ? '⏳' : status === 'done' ? '✅' : status === 'error' ? '❌' : emoji}
      </div>
      <div className="font-semibold text-sm">
        {status === 'loading' ? 'Translating…' : label}
      </div>
      {msg && (
        <div className="text-xs mt-1" style={{ color: status === 'done' ? 'var(--correct)' : 'var(--wrong)' }}>
          {msg}
        </div>
      )}
    </button>
  )
}
