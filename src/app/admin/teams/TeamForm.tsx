'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Team } from '@/lib/types'
import ImageUpload from '@/components/ImageUpload'

const REGIONS = ['Western Europe', 'Eastern Europe', 'China', 'Southeast Asia', 'North America', 'South America', 'CIS', 'Other']

interface Props {
  team?: Team
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

export default function TeamForm({ team }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoUrl, setLogoUrl] = useState(team?.logo_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(team?.banner_url ?? '')
  const isEdit = !!team

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)

    const body: Record<string, unknown> = {
      name: form.get('name'),
      short_name: form.get('short_name') || null,
      region: form.get('region') || null,
      logo_url: logoUrl || null,
      banner_url: bannerUrl || null,
      slug: form.get('slug') || undefined,
      bio: form.get('bio') || null,
      achievements: form.get('achievements') || null,
      founded_year: form.get('founded_year') || null,
      website_url: form.get('website_url') || null,
      liquipedia_url: form.get('liquipedia_url') || null,
      is_active: form.get('is_active') === 'on',
    }
    if (isEdit) body.id = team.id

    const res = await fetch('/api/admin/teams', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    router.push('/admin/teams')
    router.refresh()
  }

  async function handleDelete() {
    if (!team || !confirm(`Delete ${team.name}? This cannot be undone.`)) return
    const res = await fetch('/api/admin/teams', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: team.id }),
    })
    if (res.ok) { router.push('/admin/teams'); router.refresh() }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Team Name *">
          <input name="name" required defaultValue={team?.name} className={inputClass} placeholder="Team Liquid" />
        </Field>
        <Field label="Short Name">
          <input name="short_name" defaultValue={team?.short_name ?? ''} className={inputClass} placeholder="Liquid" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Slug (auto-generated if blank)">
          <input name="slug" defaultValue={team?.slug ?? ''} className={inputClass} placeholder="team-liquid" />
        </Field>
        <Field label="Region">
          <select name="region" defaultValue={team?.region ?? ''} className={inputClass}>
            <option value="">— Select region —</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Founded Year">
          <input name="founded_year" type="number" min="1990" max="2030" defaultValue={team?.founded_year ?? ''} className={inputClass} placeholder="2012" />
        </Field>
        <Field label="Website URL">
          <input name="website_url" type="url" defaultValue={team?.website_url ?? ''} className={inputClass} placeholder="https://teamliquid.com" />
        </Field>
      </div>

      <Field label="Liquipedia URL">
        <input name="liquipedia_url" type="url" defaultValue={team?.liquipedia_url ?? ''} className={inputClass} placeholder="https://liquipedia.net/dota2/..." />
      </Field>

      <ImageUpload
        label="Team Logo"
        value={logoUrl}
        onChange={setLogoUrl}
        folder="teams"
      />

      <ImageUpload
        label="Banner / Cover Image"
        value={bannerUrl}
        onChange={setBannerUrl}
        folder="teams"
      />

      <Field label="Bio" hint="Use ## Heading for section titles, # Heading for large titles">
        <textarea name="bio" rows={6} defaultValue={team?.bio ?? ''} className={inputClass} placeholder={"## Early Days\nFounded in 2022...\n\n## Competitive Rise\nIn 2023..."} />
      </Field>

      <Field label="Notable Achievements" hint="Use ## Heading for section titles">
        <textarea name="achievements" rows={4} defaultValue={team?.achievements ?? ''} className={inputClass} placeholder="TI Champion 2021, DreamLeague S21 Winner..." />
      </Field>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input name="is_active" type="checkbox" defaultChecked={team?.is_active ?? true} className="w-4 h-4" />
        <span style={{ color: 'var(--text-muted)' }}>Active (visible in rankings)</span>
      </label>

      {error && <p className="text-sm" style={{ color: 'var(--wrong)' }}>{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading} className="px-5 py-2 rounded font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#fff' }}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Team'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-5 py-2 rounded text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
          Cancel
        </button>
        {isEdit && (
          <button type="button" onClick={handleDelete} className="ml-auto px-4 py-2 rounded text-sm font-semibold" style={{ background: 'var(--wrong-dim)', color: 'var(--wrong)', border: '1px solid var(--wrong-border)' }}>
            Delete Team
          </button>
        )}
      </div>
    </form>
  )
}
