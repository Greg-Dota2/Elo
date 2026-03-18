'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewTournamentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        overview: form.get('overview') || null,
        format: form.get('format') || null,
        start_date: form.get('start_date') || null,
        end_date: form.get('end_date') || null,
        prize_pool_usd: form.get('prize_pool_usd') ? Number(form.get('prize_pool_usd')) : null,
        logo_url: form.get('logo_url') || null,
        liquipedia_url: form.get('liquipedia_url') || null,
        telegram_url: form.get('telegram_url') || null,
        is_published: form.get('is_published') === 'on',
      }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New Tournament</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Field label="Tournament Name *">
          <input name="name" required className={inputClass} placeholder="PGL Wallachia Season 7" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date"><input name="start_date" type="date" className={inputClass} /></Field>
          <Field label="End Date"><input name="end_date" type="date" className={inputClass} /></Field>
        </div>
        <Field label="Tournament Overview">
          <textarea name="overview" rows={4} className={inputClass} placeholder="PGL Wallachia Season 7 brings another tier 1 tournament..." />
        </Field>
        <Field label="Format Description">
          <textarea name="format" rows={3} className={inputClass} placeholder="Single modified Swiss-system group stage..." />
        </Field>
        <Field label="Logo URL">
          <input name="logo_url" type="url" className={inputClass} placeholder="https://cdn.pandascore.co/images/tournament/image/..." />
        </Field>
        <Field label="Liquipedia URL">
          <input name="liquipedia_url" type="url" className={inputClass} placeholder="https://liquipedia.net/dota2/..." />
        </Field>
        <Field label="Telegram URL">
          <input name="telegram_url" type="url" className={inputClass} placeholder="https://t.me/..." />
        </Field>
        <Field label="Prize Pool (USD)">
          <input name="prize_pool_usd" type="number" className={inputClass} placeholder="500000" />
        </Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input name="is_published" type="checkbox" defaultChecked className="w-4 h-4" />
          <span>Published</span>
        </label>
        {error && <p className="text-sm" style={{ color: 'var(--wrong)' }}>{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="px-5 py-2 rounded font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#fff' }}>
            {loading ? 'Saving...' : 'Create Tournament'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-5 py-2 rounded text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputClass = 'w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]'
