'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Team {
  id: string
  name: string
  is_active: boolean
  short_name: string | null
}

interface MergeResult {
  ok: boolean
  from: string
  to: string
  matches_transferred: number
  players_transferred: number
}

export default function MergeTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MergeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    fetch('/api/admin/teams')
      .then(r => r.json())
      .then(d => setTeams(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const fromTeam = teams.find(t => t.id === fromId)
  const toTeam = teams.find(t => t.id === toId)

  async function handleMerge() {
    if (!fromId || !toId || !confirmed) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/admin/teams/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_id: fromId, to_id: toId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Merge failed')
      setResult(data)
      setFromId('')
      setToId('')
      setConfirmed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const activeTeams = teams.filter(t => t.is_active)
  const allTeams = teams

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/teams" className="text-sm" style={{ color: 'var(--text-muted)' }}>
          ← Teams
        </Link>
        <h1 className="text-2xl font-bold">Merge Teams</h1>
      </div>

      <div
        className="rounded-xl p-5 mb-6 text-sm leading-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <p>Use this when a roster gets picked up by a new org or plays under a new name.</p>
        <p className="mt-2">All match results and players are transferred from the <strong style={{ color: 'var(--text)' }}>old team</strong> to the <strong style={{ color: 'var(--text)' }}>new team</strong>. The old team is then marked inactive and its ELO is cleared.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Old team (disbanded / rebranded)
          </label>
          <select
            value={fromId}
            onChange={e => { setFromId(e.target.value); setConfirmed(false) }}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">Select team…</option>
            {allTeams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.short_name ? ` (${t.short_name})` : ''}{!t.is_active ? ' — inactive' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            New team (receives history)
          </label>
          <select
            value={toId}
            onChange={e => { setToId(e.target.value); setConfirmed(false) }}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">Select team…</option>
            {activeTeams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.short_name ? ` (${t.short_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        {fromId && toId && fromId !== toId && (
          <div
            className="rounded-lg p-4 text-sm"
            style={{ background: 'var(--wrong-dim)', border: '1px solid var(--wrong-border)' }}
          >
            <p className="font-semibold mb-1" style={{ color: 'var(--wrong)' }}>Confirm merge</p>
            <p style={{ color: 'var(--text-muted)' }}>
              All matches and players from <strong style={{ color: 'var(--text)' }}>{fromTeam?.name}</strong> will move to{' '}
              <strong style={{ color: 'var(--text)' }}>{toTeam?.name}</strong>.{' '}
              {fromTeam?.name} will be marked inactive. This cannot be undone easily.
            </p>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                Yes, transfer everything from {fromTeam?.name} to {toTeam?.name}
              </span>
            </label>
          </div>
        )}

        {error && (
          <p className="text-sm font-semibold" style={{ color: 'var(--wrong)' }}>{error}</p>
        )}

        {result && (
          <div
            className="rounded-lg p-4 text-sm"
            style={{ background: 'var(--correct-dim)', border: '1px solid var(--correct-border)' }}
          >
            <p className="font-semibold mb-1" style={{ color: 'var(--correct)' }}>Merge complete</p>
            <p style={{ color: 'var(--text-muted)' }}>
              Transferred <strong style={{ color: 'var(--text)' }}>{result.matches_transferred} match series</strong> and{' '}
              <strong style={{ color: 'var(--text)' }}>{result.players_transferred} players</strong> from{' '}
              {result.from} → {result.to}.
            </p>
          </div>
        )}

        <button
          onClick={handleMerge}
          disabled={!fromId || !toId || fromId === toId || !confirmed || loading}
          className="w-full py-2.5 rounded-lg text-sm font-bold transition-opacity disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {loading ? 'Merging…' : 'Merge Teams'}
        </button>
      </div>
    </div>
  )
}
