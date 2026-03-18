'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Team, Tournament, Stage } from '@/lib/types'

function NewMatchForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTournament = searchParams.get('tournament')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [selectedTournament, setSelectedTournament] = useState(preselectedTournament ?? '')
  const [team1, setTeam1] = useState('')
  const [team2, setTeam2] = useState('')

  useEffect(() => {
    fetch('/api/admin/data?resource=teams').then(r => r.json()).then(setTeams)
    fetch('/api/admin/data?resource=tournaments').then(r => r.json()).then(setTournaments)
  }, [])

  useEffect(() => {
    if (!selectedTournament) { setStages([]); return }
    fetch(`/api/admin/data?resource=stages&tournament_id=${selectedTournament}`)
      .then(r => r.json()).then(setStages)
  }, [selectedTournament])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)

    const res = await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournament_id: selectedTournament,
        stage_id: form.get('stage_id') || null,
        new_stage_name: form.get('new_stage_name') || null,
        new_stage_date: form.get('new_stage_date') || null,
        stage_order: stages.length + 1,
        team_1_id: form.get('team_1_id'),
        team_2_id: form.get('team_2_id'),
        predicted_winner_id: form.get('predicted_winner_id') || null,
        best_of: Number(form.get('best_of')),
        match_date: form.get('match_date') || null,
        pre_analysis: form.get('pre_analysis') || null,
        twitch_url: form.get('twitch_url') || null,
        match_order: Number(form.get('match_order')) || null,
        is_published: form.get('is_published') === 'on',
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  const availableForPick = teams.filter(
    (t) => t.id === team1 || t.id === team2
  )

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New Prediction</h1>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Tournament */}
        <Field label="Tournament *">
          <select
            name="tournament_id"
            required
            className={inputClass}
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
          >
            <option value="">Select tournament</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>

        {/* Stage */}
        <div className="grid gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Stage
          </label>
          <select name="stage_id" className={inputClass}>
            <option value="">— Create new stage below —</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <input
              name="new_stage_name"
              className={inputClass}
              placeholder="New stage name (e.g. UB Semifinals)"
            />
            <input
              name="new_stage_date"
              type="date"
              className={inputClass}
            />
          </div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Team 1 *">
            <select
              name="team_1_id"
              required
              className={inputClass}
              value={team1}
              onChange={(e) => setTeam1(e.target.value)}
            >
              <option value="">Select team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === team2}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Team 2 *">
            <select
              name="team_2_id"
              required
              className={inputClass}
              value={team2}
              onChange={(e) => setTeam2(e.target.value)}
            >
              <option value="">Select team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === team1}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Pick + BO */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="My Pick">
            <select name="predicted_winner_id" className={inputClass}>
              <option value="">No pick yet</option>
              {availableForPick.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Best Of">
            <select name="best_of" className={inputClass} defaultValue="3">
              <option value="1">BO1</option>
              <option value="2">BO2</option>
              <option value="3">BO3</option>
              <option value="5">BO5</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Match Date">
            <input name="match_date" type="date" className={inputClass} />
          </Field>
          <Field label="Display Order">
            <input name="match_order" type="number" className={inputClass} placeholder="1" defaultValue="1" />
          </Field>
        </div>

        <Field label="Twitch VOD / Stream URL">
          <input name="twitch_url" type="url" className={inputClass} placeholder="https://www.twitch.tv/videos/2345678901?t=1h30m0s" />
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
            For VODs: pause at match start → Share → &quot;Copy URL at current time&quot;. For live: paste channel URL.
          </p>
        </Field>

        <Field label="Pre-match Analysis *">
          <textarea
            name="pre_analysis"
            rows={5}
            className={inputClass}
            placeholder="After everything we saw yesterday, it's safe to say that..."
          />
        </Field>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input name="is_published" type="checkbox" defaultChecked className="w-4 h-4" />
          <span>Published</span>
        </label>

        {error && (
          <p className="text-sm" style={{ color: 'var(--wrong)' }}>{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {loading ? 'Saving...' : 'Publish Prediction'}
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
    </div>
  )
}

export default function NewMatchPage() {
  return (
    <Suspense>
      <NewMatchForm />
    </Suspense>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500'
  + ' bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]'
  + ' placeholder:text-[var(--text-muted)]'
