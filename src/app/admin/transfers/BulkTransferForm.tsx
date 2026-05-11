'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TeamOption { name: string; logo_url: string | null }
interface PlayerOption { slug: string; ign: string; photo_url: string | null }

interface PlayerRow {
  id: number
  player_ign: string
  player_slug: string
  player_photo_url: string
}

interface Props {
  playerOptions: PlayerOption[]
  teamOptions: TeamOption[]
}

const inputClass = 'w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]'

let nextId = 1

function makeRow(): PlayerRow {
  return { id: nextId++, player_ign: '', player_slug: '', player_photo_url: '' }
}

function ControlledTeamPicker({
  label,
  teamOptions,
  value,
  logoValue,
  onChange,
}: {
  label: string
  teamOptions: TeamOption[]
  value: string
  logoValue: string
  onChange: (name: string, logo: string) => void
}) {
  const isKnownTeam = value !== '' && teamOptions.some(t => t.name === value)
  const [custom, setCustom] = useState(!isKnownTeam && value !== '')

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (val === '__custom__') {
      setCustom(true)
      onChange('', '')
      return
    }
    if (val === '') {
      setCustom(false)
      onChange('', '')
      return
    }
    const team = teamOptions.find(t => t.name === val)
    setCustom(false)
    onChange(val, team?.logo_url ?? '')
  }

  const selectValue = custom ? '__custom__' : (isKnownTeam ? value : '')

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <select value={selectValue} onChange={handleSelect} className={inputClass}>
        <option value="">— Free agent / unknown —</option>
        {teamOptions.map(t => (
          <option key={t.name} value={t.name}>{t.name}</option>
        ))}
        <option value="__custom__">Other (type manually)</option>
      </select>
      {custom && (
        <div className="grid gap-2">
          <input
            className={inputClass}
            placeholder="Team name"
            value={value}
            onChange={e => onChange(e.target.value, logoValue)}
          />
          <input
            type="url"
            className={inputClass}
            placeholder="Logo URL (optional)"
            value={logoValue}
            onChange={e => onChange(value, e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

export default function BulkTransferForm({ playerOptions, teamOptions }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [fromTeam, setFromTeam] = useState('')
  const [fromLogo, setFromLogo] = useState('')
  const [toTeam, setToTeam] = useState('')
  const [toLogo, setToLogo] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState('permanent')
  const [notes, setNotes] = useState('')
  const [notesRu, setNotesRu] = useState('')
  const [isPublished, setIsPublished] = useState(false)

  const [rows, setRows] = useState<PlayerRow[]>(() => [makeRow(), makeRow(), makeRow()])

  function updateRow(id: number, field: keyof Omit<PlayerRow, 'id'>, value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function handlePlayerLink(id: number, slug: string) {
    const p = playerOptions.find(p => p.slug === slug)
    setRows(prev => prev.map(r => r.id === id
      ? { ...r, player_slug: p?.slug ?? '', player_photo_url: p?.photo_url ?? '' }
      : r
    ))
  }

  function addRow() {
    setRows(prev => [...prev, makeRow()])
  }

  function removeRow(id: number) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const players = rows
      .filter(r => r.player_ign.trim())
      .map(r => ({
        player_ign: r.player_ign.trim(),
        player_slug: r.player_slug || null,
        player_photo_url: r.player_photo_url || null,
      }))

    if (players.length === 0) {
      setError('Enter at least one player IGN.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/admin/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        players,
        from_team: fromTeam || null,
        from_team_logo_url: fromLogo || null,
        to_team: toTeam || null,
        to_team_logo_url: toLogo || null,
        transfer_date: transferDate,
        type,
        notes: notes || null,
        notes_ru: notesRu || null,
        is_published: isPublished,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    router.push('/admin/transfers')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {/* Shared team fields */}
      <div className="grid grid-cols-2 gap-4">
        <ControlledTeamPicker
          label="From Team"
          teamOptions={teamOptions}
          value={fromTeam}
          logoValue={fromLogo}
          onChange={(n, l) => { setFromTeam(n); setFromLogo(l) }}
        />
        <ControlledTeamPicker
          label="To Team"
          teamOptions={teamOptions}
          value={toTeam}
          logoValue={toLogo}
          onChange={(n, l) => { setToTeam(n); setToLogo(l) }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Transfer Date *</label>
          <input
            type="date"
            required
            value={transferDate}
            onChange={e => setTransferDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Type *</label>
          <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
            <option value="permanent">Permanent signing</option>
            <option value="loan">Loan</option>
            <option value="stand-in">Stand-in</option>
            <option value="free_agent">Free Agent</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Notes (EN)</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} placeholder="Optional context..." />
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Notes (RU)</label>
          <textarea rows={2} value={notesRu} onChange={e => setNotesRu(e.target.value)} className={inputClass} placeholder="Необязательный комментарий..." />
        </div>
      </div>

      {/* Player rows */}
      <div className="grid gap-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          Players ({rows.filter(r => r.player_ign.trim()).length} entered)
        </p>

        {rows.map((row, i) => (
          <div
            key={row.id}
            className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center rounded-lg px-3 py-2"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <span className="text-xs w-5 text-right" style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>
            <input
              className={inputClass}
              placeholder="Player IGN *"
              value={row.player_ign}
              onChange={e => updateRow(row.id, 'player_ign', e.target.value)}
            />
            <select
              value={row.player_slug}
              onChange={e => handlePlayerLink(row.id, e.target.value)}
              className={inputClass}
            >
              <option value="">— Link to player page —</option>
              {playerOptions.map(p => (
                <option key={p.slug} value={p.slug}>{p.ign}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--text-muted)', background: 'transparent' }}
              title="Remove row"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="text-sm px-4 py-2 rounded w-fit"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          + Add Player
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={e => setIsPublished(e.target.checked)}
          className="w-4 h-4"
        />
        <span style={{ color: 'var(--text-muted)' }}>Published (visible to public)</span>
      </label>

      {error && <p className="text-sm" style={{ color: 'var(--wrong)' }}>{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded font-semibold text-sm disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {loading ? 'Saving...' : `Add ${rows.filter(r => r.player_ign.trim()).length || ''} Transfers`}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 rounded text-sm"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
