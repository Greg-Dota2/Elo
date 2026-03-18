'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Player } from '@/lib/types'
import ImageUpload from '@/components/ImageUpload'

interface TeamOption { id: string; name: string }

interface Props {
  player?: Player
  teams: TeamOption[]
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

export default function PlayerForm({ player, teams }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photoUrl, setPhotoUrl] = useState(player?.photo_url ?? '')
  const isEdit = !!player

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)

    const body: Record<string, unknown> = {
      ign: form.get('ign'),
      slug: form.get('slug') || undefined,
      full_name: form.get('full_name') || null,
      team_id: form.get('team_id') || null,
      position: form.get('position') || null,
      nationality: form.get('nationality') || null,
      date_of_birth: form.get('date_of_birth') || null,
      photo_url: photoUrl || null,
      bio: form.get('bio') || null,
      signature_heroes: form.get('signature_heroes') || null,
      achievements: form.get('achievements') || null,
      previous_teams: form.get('previous_teams') || null,
      liquipedia_url: form.get('liquipedia_url') || null,
      is_published: form.get('is_published') === 'on',
    }
    if (isEdit) body.id = player.id

    const res = await fetch('/api/admin/players', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    router.push('/admin/players')
    router.refresh()
  }

  async function handleDelete() {
    if (!player || !confirm(`Delete ${player.ign}? This cannot be undone.`)) return
    const res = await fetch('/api/admin/players', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: player.id }),
    })
    if (res.ok) { router.push('/admin/players'); router.refresh() }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="In-Game Name (IGN) *">
          <input name="ign" required defaultValue={player?.ign} className={inputClass} placeholder="Collapse" />
        </Field>
        <Field label="Slug (auto-generated if blank)">
          <input name="slug" defaultValue={player?.slug} className={inputClass} placeholder="collapse" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Full Name">
          <input name="full_name" defaultValue={player?.full_name ?? ''} className={inputClass} placeholder="Magomed Khalilov" />
        </Field>
        <Field label="Nationality">
          <input name="nationality" defaultValue={player?.nationality ?? ''} className={inputClass} placeholder="Russian" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Current Team">
          <select name="team_id" defaultValue={player?.team_id ?? ''} className={inputClass}>
            <option value="">— No team —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Position">
          <select name="position" defaultValue={player?.position ?? ''} className={inputClass}>
            <option value="">— Position —</option>
            <option value="1">1 — Carry (Safe Lane)</option>
            <option value="2">2 — Mid</option>
            <option value="3">3 — Offlane</option>
            <option value="4">4 — Soft Support</option>
            <option value="5">5 — Hard Support</option>
          </select>
        </Field>
      </div>

      <Field label="Date of Birth">
        <input name="date_of_birth" type="date" defaultValue={player?.date_of_birth ?? ''} className={inputClass} />
      </Field>

      <ImageUpload
        label="Player Photo"
        value={photoUrl}
        onChange={setPhotoUrl}
        folder="players"
      />

      <Field label="Signature Heroes" hint="Comma-separated, e.g: Invoker, Storm Spirit, Puck">
        <input
          name="signature_heroes"
          defaultValue={player?.signature_heroes?.join(', ') ?? ''}
          className={inputClass}
          placeholder="Invoker, Storm Spirit, Puck"
        />
      </Field>

      <Field label="Bio" hint="Use ## Heading for section titles, # Heading for large titles">
        <textarea name="bio" rows={6} defaultValue={player?.bio ?? ''} className={inputClass} placeholder="Short player biography..." />
      </Field>

      <Field label="Notable Achievements" hint="Use ## Heading for section titles">
        <textarea name="achievements" rows={4} defaultValue={player?.achievements ?? ''} className={inputClass} placeholder="TI Champion 2023, DreamLeague S21 MVP..." />
      </Field>

      <Field label="Previous Teams" hint="Comma-separated or free text">
        <input name="previous_teams" defaultValue={player?.previous_teams ?? ''} className={inputClass} placeholder="Team Spirit, Virtus.pro, Natus Vincere" />
      </Field>

      <Field label="Liquipedia URL">
        <input name="liquipedia_url" type="url" defaultValue={player?.liquipedia_url ?? ''} className={inputClass} placeholder="https://liquipedia.net/dota2/..." />
      </Field>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input name="is_published" type="checkbox" defaultChecked={player?.is_published ?? false} className="w-4 h-4" />
        <span style={{ color: 'var(--text-muted)' }}>Published (visible to public)</span>
      </label>

      {error && <p className="text-sm" style={{ color: 'var(--wrong)' }}>{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading} className="px-5 py-2 rounded font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#fff' }}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Player'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-5 py-2 rounded text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
          Cancel
        </button>
        {isEdit && (
          <button type="button" onClick={handleDelete} className="ml-auto px-4 py-2 rounded text-sm font-semibold" style={{ background: 'var(--wrong-dim)', color: 'var(--wrong)', border: '1px solid var(--wrong-border)' }}>
            Delete Player
          </button>
        )}
      </div>
    </form>
  )
}
