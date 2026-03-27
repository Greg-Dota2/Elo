'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Transfer } from '@/lib/types'

interface TeamOption { name: string; logo_url: string | null }
interface PlayerOption { slug: string; ign: string; photo_url: string | null }

interface Props {
  transfer?: Transfer
  playerOptions: PlayerOption[]
  teamOptions: TeamOption[]
}

const inputClass = 'w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>{hint}</p>}
    </div>
  )
}

// Team picker: dropdown of known teams + manual fallback
function TeamPicker({
  label,
  nameField,
  logoField,
  teamOptions,
  defaultName,
  defaultLogo,
}: {
  label: string
  nameField: string
  logoField: string
  teamOptions: TeamOption[]
  defaultName?: string | null
  defaultLogo?: string | null
}) {
  const isKnown = defaultName ? teamOptions.some(t => t.name === defaultName) : false
  const [custom, setCustom] = useState(!isKnown && !!defaultName)
  const [selectedName, setSelectedName] = useState(isKnown ? (defaultName ?? '') : '')
  const [logoUrl, setLogoUrl] = useState(defaultLogo ?? '')

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (val === '__custom__') {
      setCustom(true)
      setSelectedName('')
      setLogoUrl('')
      return
    }
    if (val === '') {
      setCustom(false)
      setSelectedName('')
      setLogoUrl('')
      return
    }
    const team = teamOptions.find(t => t.name === val)
    setCustom(false)
    setSelectedName(val)
    setLogoUrl(team?.logo_url ?? '')
  }

  const initialSelectValue = custom ? '__custom__' : (isKnown ? (defaultName ?? '') : '')

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <select onChange={handleSelect} defaultValue={initialSelectValue} className={inputClass}>
        <option value="">— Free agent / unknown —</option>
        {teamOptions.map(t => (
          <option key={t.name} value={t.name}>{t.name}</option>
        ))}
        <option value="__custom__">Other (type manually)</option>
      </select>

      {/* Hidden logo field — always submitted */}
      <input type="hidden" name={logoField} value={logoUrl} />

      {custom ? (
        /* Custom team: show name input + optional logo */
        <div className="grid gap-2">
          <input
            name={nameField}
            className={inputClass}
            placeholder="Team name"
            defaultValue={!isKnown ? (defaultName ?? '') : ''}
          />
          <input
            type="url"
            className={inputClass}
            placeholder="Logo URL (optional)"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
          />
        </div>
      ) : (
        /* Known team: name tracked in state so it updates when select changes */
        <input type="hidden" name={nameField} value={selectedName} />
      )}
    </div>
  )
}

export default function TransferForm({ transfer, playerOptions, teamOptions }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [playerSlug, setPlayerSlug] = useState(transfer?.player_slug ?? '')
  const [playerPhoto, setPlayerPhoto] = useState(transfer?.player_photo_url ?? '')
  const isEdit = !!transfer

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)

    const body: Record<string, unknown> = {
      player_ign:         form.get('player_ign'),
      player_slug:        playerSlug || null,
      player_photo_url:   playerPhoto || null,
      from_team:          form.get('from_team') || null,
      from_team_logo_url: form.get('from_team_logo_url') || null,
      to_team:            form.get('to_team') || null,
      to_team_logo_url:   form.get('to_team_logo_url') || null,
      transfer_date:      form.get('transfer_date'),
      type:               form.get('type'),
      notes:              form.get('notes') || null,
      is_published:       form.get('is_published') === 'on',
    }
    if (isEdit) body.id = transfer.id

    const res = await fetch('/api/admin/transfers', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    router.push('/admin/transfers')
    router.refresh()
  }

  async function handleDelete() {
    if (!transfer || !confirm(`Delete transfer for ${transfer.player_ign}?`)) return
    const res = await fetch('/api/admin/transfers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: transfer.id }),
    })
    if (res.ok) { router.push('/admin/transfers'); router.refresh() }
  }

  function handlePlayerLink(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = playerOptions.find(p => p.slug === e.target.value)
    setPlayerSlug(p?.slug ?? '')
    setPlayerPhoto(p?.photo_url ?? '')
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">

      {/* Player IGN — always free text */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Player IGN *">
          <input name="player_ign" required defaultValue={transfer?.player_ign} className={inputClass} placeholder="yatoro" />
        </Field>
        <Field label="Link to player page" hint="Optional — only if they exist in your players list">
          <select onChange={handlePlayerLink} defaultValue={transfer?.player_slug ?? ''} className={inputClass}>
            <option value="">— Not linked —</option>
            {playerOptions.map(p => (
              <option key={p.slug} value={p.slug}>{p.ign}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4">
        <TeamPicker
          label="From Team"
          nameField="from_team"
          logoField="from_team_logo_url"
          teamOptions={teamOptions}
          defaultName={transfer?.from_team}
          defaultLogo={transfer?.from_team_logo_url}
        />
        <TeamPicker
          label="To Team"
          nameField="to_team"
          logoField="to_team_logo_url"
          teamOptions={teamOptions}
          defaultName={transfer?.to_team}
          defaultLogo={transfer?.to_team_logo_url}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Transfer Date *">
          <input name="transfer_date" type="date" required defaultValue={transfer?.transfer_date ?? new Date().toISOString().slice(0, 10)} className={inputClass} />
        </Field>
        <Field label="Type *">
          <select name="type" defaultValue={transfer?.type ?? 'permanent'} className={inputClass}>
            <option value="permanent">Permanent signing</option>
            <option value="loan">Loan</option>
            <option value="stand-in">Stand-in</option>
            <option value="free_agent">Free Agent</option>
            <option value="retired">Retired</option>
          </select>
        </Field>
      </div>

      <Field label="Notes" hint="Short context. Optional.">
        <textarea name="notes" rows={2} defaultValue={transfer?.notes ?? ''} className={inputClass} placeholder="Replaced Miracle after TI qualifiers..." />
      </Field>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input name="is_published" type="checkbox" defaultChecked={transfer?.is_published ?? false} className="w-4 h-4" />
        <span style={{ color: 'var(--text-muted)' }}>Published (visible to public)</span>
      </label>

      {error && <p className="text-sm" style={{ color: 'var(--wrong)' }}>{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading} className="px-5 py-2 rounded font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#fff' }}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Transfer'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-5 py-2 rounded text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
          Cancel
        </button>
        {isEdit && (
          <button type="button" onClick={handleDelete} className="ml-auto px-4 py-2 rounded text-sm font-semibold" style={{ background: 'var(--wrong-dim)', color: 'var(--wrong)', border: '1px solid var(--wrong-border)' }}>
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
