'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
      router.refresh()
    } else {
      setError('Wrong password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h1 className="font-display text-2xl font-black mb-1">Admin Login</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Enter your password to continue.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          {error && <p className="text-sm" style={{ color: 'var(--wrong)' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="rounded-xl px-4 py-3 text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
          >
            {loading ? 'Checking…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  )
}
