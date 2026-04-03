'use client'

import { useState } from 'react'
import type { ItemGuide } from '@/lib/guides'

const inputClass = 'w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]'

interface Props {
  itemKey: string
  initial: ItemGuide | null
}

export default function ItemGuideForm({ itemKey, initial }: Props) {
  const [whyBuy, setWhyBuy] = useState(initial?.why_buy ?? '')
  const [whenToBuy, setWhenToBuy] = useState(initial?.when_to_buy ?? '')
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
    const res = await fetch('/api/admin/guides/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_key: itemKey, why_buy: whyBuy, when_to_buy: whenToBuy, tips, summary }),
    })

    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Why buy</label>
        <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>What problem does this item solve? What&apos;s the core reason to purchase it?</p>
        <textarea
          className={inputClass}
          rows={3}
          placeholder="e.g. BKB gives you temporary debuff immunity so you can keep acting and dealing damage even when the enemy throws multiple disables, silences, or magical bursts at you."
          value={whyBuy}
          onChange={e => setWhyBuy(e.target.value)}
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>When to buy</label>
        <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Timing, draft triggers, and situations that call for it (or don&apos;t).</p>
        <textarea
          className={inputClass}
          rows={4}
          placeholder="e.g. Rush it as your second or third big item (15-25 min) if the enemy has 2+ hard disables or heavy magic damage. Delay or skip if they're mostly physical damage..."
          value={whenToBuy}
          onChange={e => setWhenToBuy(e.target.value)}
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Tips & common mistakes <span style={{ color: 'var(--text-subtle)' }}>(one per line)</span></label>
        <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Short tactical bullets — things intermediate players get wrong.</p>
        <textarea
          className={inputClass}
          rows={6}
          placeholder={"BKB duration starts at 9s and decreases by 1s each use (min 7s)\nActivate before you jump in — never after you're already stunned\nApplies a basic dispel on activation, but does not block Doom or Ice Blast"}
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
          placeholder="e.g. BKB is still one of the most important defensive items in Dota 2. In games with heavy crowd control or magic burst, getting it at the right time can single-handedly win teamfights. The key is timing — use it offensively, not just to survive."
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
          href="/admin/items"
          className="px-4 py-2 rounded text-sm"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
        >
          Back to items
        </a>
      </div>
    </form>
  )
}
