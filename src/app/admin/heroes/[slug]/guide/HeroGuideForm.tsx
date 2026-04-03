'use client'

import { useState } from 'react'
import type { HeroGuide } from '@/lib/guides'

const inputClass = 'w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]'

interface Props {
  heroId: number
  heroName: string
  initial: HeroGuide | null
}

export default function HeroGuideForm({ heroId, heroName, initial }: Props) {
  const [whenToPick, setWhenToPick] = useState(initial?.when_to_pick ?? '')
  const [tipsText, setTipsText] = useState((initial?.tips ?? []).join('\n'))
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    setError('')

    const tips = tipsText.split('\n').map(t => t.trim()).filter(Boolean)
    const res = await fetch('/api/admin/guides/hero', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero_id: heroId, hero_name: heroName, when_to_pick: whenToPick, tips, summary }),
    })

    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>When to pick</label>
        <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Draft context, matchup conditions, and situations where this hero shines or struggles.</p>
        <textarea
          className={inputClass}
          rows={4}
          placeholder="e.g. Pick Invoker when your team already has reliable initiation and you can afford a slow start. Avoid into heavy silences — Skywrath or Orchid lineups make the laning phase miserable."
          value={whenToPick}
          onChange={e => setWhenToPick(e.target.value)}
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Tips & common mistakes <span style={{ color: 'var(--text-subtle)' }}>(one per line)</span></label>
        <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Short tactical bullets — things even intermediate players get wrong.</p>
        <textarea
          className={inputClass}
          rows={6}
          placeholder={"Level Cold Snap early — it's your best laning tool, not just a combo piece\nGhost Walk is a free escape; don't waste it aggressively early\nSunstrike has a 1.7s delay — cast it where they're running, not where they are"}
          value={tipsText}
          onChange={e => setTipsText(e.target.value)}
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Strategy summary</label>
        <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>A 1-3 sentence closing take — the key insight a player should walk away with.</p>
        <textarea
          className={inputClass}
          rows={3}
          placeholder="e.g. Invoker rewards preparation and game sense above mechanics. If you know your spells cold and draft him into the right game, he can single-handedly control the pace of teamfights."
          value={summary}
          onChange={e => setSummary(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && <p className="text-sm text-green-400">Saved — page will revalidate shortly.</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          {loading ? 'Saving…' : 'Save guide'}
        </button>
        <a
          href="/admin/heroes"
          className="px-4 py-2 rounded text-sm"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
        >
          Back to heroes
        </a>
      </div>
    </form>
  )
}
